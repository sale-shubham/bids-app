import bcrypt from 'bcryptjs';
import pg from 'pg';
import { DATABASE_URL, IMAGE_URL, PASSWORD } from './env.ts';
import { E2E_EMAIL_DOMAIN, E2E_EMAIL_PREFIX } from './run.ts';

// Direct dev-DB access for what the API cannot do (creating pre-verified members
// with a role, auctions with images that were never uploaded, auctions that end
// in a minute) and for cleanup. Every DELETE is scoped to e2e+...@noblebid.test
// members and the auctions they sell. Table/column names follow bids-api's
// prisma/schema.prisma (camelCase, quoted). @updatedAt columns have no DB
// default, so inserts set updatedAt themselves.

export async function withDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL);
  const db = new pg.Client({
    connectionString: DATABASE_URL.replace(/[?&]sslmode=[^&]*/, ''),
    ssl: local ? false : { rejectUnauthorized: false },
  });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

const cuidLike = (p = 'e2e') => p + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);

export type DbRole = 'BIDDER' | 'AUCTIONEER' | 'SUPER_ADMIN';

export interface NewMember {
  email: string;
  name: string;
  role: DbRole;
  /** Defaults to true. false leaves emailVerifiedAt null (login then demands the OTP step). */
  verified?: boolean;
  isActive?: boolean;
  password?: string;
  phone?: string;
}

const hashes = new Map<string, string>();
async function hashPassword(pw: string) {
  let h = hashes.get(pw);
  if (!h) {
    h = await bcrypt.hash(pw, 12);
    hashes.set(pw, h);
  }
  return h;
}

export async function createMember(m: NewMember): Promise<{ id: string; email: string; name: string }> {
  const hash = await hashPassword(m.password ?? PASSWORD);
  const id = cuidLike();
  const email = m.email.toLowerCase();
  await withDb((db) =>
    db.query(
      `INSERT INTO "Member" (id, email, name, "passwordHash", role, "isActive", "emailVerifiedAt", phone, "updatedAt")
       VALUES ($1, $2, $3, $4, $5::"Role", $6, $7, $8, now())`,
      [id, email, m.name, hash, m.role, m.isActive ?? true, m.verified === false ? null : new Date().toISOString(), m.phone ?? null],
    ),
  );
  return { id, email, name: m.name };
}

export interface NewAuction {
  sellerId: string;
  title?: string;
  /** Seconds from now; <= 0 means already started (status LIVE). */
  startsInSec: number;
  /** Seconds from now. */
  endsInSec: number;
  startingBidPaise?: number;
  minIncrementPaise?: number;
  /** Defaults to one placeholder under the API's media base (see lib/env.ts). */
  images?: string[];
  category?: string;
}

export async function createAuction(a: NewAuction): Promise<{ id: string; title: string }> {
  const id = cuidLike();
  const title = a.title ?? `E2E Auction ${id.slice(3, 9)}`;
  const now = Date.now();
  await withDb((db) =>
    db.query(
      `INSERT INTO "Auction" (id, title, description, category, condition, images, "startingBidPaise", "minIncrementPaise",
                              "startTime", "endTime", status, "sellerId", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USED'::"ItemCondition", $5, $6, $7, $8, $9, $10::"AuctionStatus", $11, now())`,
      [
        id,
        title,
        '<p>Created by the NobleBid e2e suite. Safe to delete.</p>',
        a.category ?? 'Antiques',
        a.images ?? [IMAGE_URL],
        a.startingBidPaise ?? 100000,
        a.minIncrementPaise ?? 10000,
        new Date(now + a.startsInSec * 1000).toISOString(), // ISO: pg would serialise a Date in local time (column is timestamp without tz)
        new Date(now + a.endsInSec * 1000).toISOString(),
        a.startsInSec <= 0 ? 'LIVE' : 'SCHEDULED',
        a.sellerId,
      ],
    ),
  );
  return { id, title };
}

/**
 * Records a bid directly (no anti-sniping extension, unlike POST /auctions/:id/bids), so an
 * auction that ends in about a minute still ends on time with a winner.
 */
export async function seedBid(auctionId: string, bidderId: string, amountPaise: number) {
  await withDb(async (db) => {
    await db.query(`INSERT INTO "Bid" (id, "auctionId", "bidderId", "amountPaise") VALUES ($1, $2, $3, $4)`, [cuidLike(), auctionId, bidderId, amountPaise]);
    await db.query(
      `UPDATE "Auction" SET "currentBidPaise" = $2, "bidCount" = "bidCount" + 1, "highestBidderId" = $3, "updatedAt" = now() WHERE id = $1`,
      [auctionId, amountPaise, bidderId],
    );
  });
}

export async function auctionRow(id: string) {
  return withDb(async (db) => {
    const r = await db.query(`SELECT status, "bidCount", "currentBidPaise", "winnerId" FROM "Auction" WHERE id = $1`, [id]);
    return r.rows[0] as { status: string; bidCount: number; currentBidPaise: number; winnerId: string | null } | undefined;
  });
}

export async function commissionStatus(auctionId: string): Promise<string | undefined> {
  return withDb(async (db) => (await db.query(`SELECT status FROM "Commission" WHERE "auctionId" = $1`, [auctionId])).rows[0]?.status);
}

export async function setMemberActive(id: string, isActive: boolean) {
  await withDb((db) => db.query(`UPDATE "Member" SET "isActive" = $2 WHERE id = $1`, [id, isActive]));
}

export async function memberByEmail(email: string) {
  return withDb(async (db) => (await db.query(`SELECT id, role, "isActive", "emailVerifiedAt" FROM "Member" WHERE email = $1`, [email.toLowerCase()])).rows[0]);
}

export interface SweepScope {
  /** Only this run's members (e2e+<runId>-%). Omit to match every e2e member. */
  runId?: string;
  /** Only members older than this (stale runs that never reached teardown). */
  olderThanMinutes?: number;
}

/** Deletes e2e members and everything hanging off them (and off the auctions they sell). */
export async function sweep(scope: SweepScope): Promise<{ members: number; auctions: number }> {
  const like = scope.runId ? `${E2E_EMAIL_PREFIX}${scope.runId}-%${E2E_EMAIL_DOMAIN}` : `${E2E_EMAIL_PREFIX}%${E2E_EMAIL_DOMAIN}`;
  const params: unknown[] = [like];
  let age = '';
  if (scope.olderThanMinutes) {
    age = `AND "createdAt" < now() - ($2 || ' minutes')::interval`;
    params.push(String(scope.olderThanMinutes));
  }
  return withDb(async (db) => {
    await db.query('BEGIN');
    try {
      const found = (await db.query(`SELECT id, email FROM "Member" WHERE email LIKE $1 ${age}`, params)).rows as { id: string; email: string }[];
      const memberIds = found.map((r) => r.id);
      const emails = found.map((r) => r.email);
      if (!memberIds.length) {
        await db.query('COMMIT');
        return { members: 0, auctions: 0 };
      }
      const auctionIds = (await db.query(`SELECT id FROM "Auction" WHERE "sellerId" = ANY($1)`, [memberIds])).rows.map((r) => r.id as string);
      await db.query(`DELETE FROM "Bid" WHERE "bidderId" = ANY($1) OR "auctionId" = ANY($2)`, [memberIds, auctionIds]);
      await db.query(`DELETE FROM "Commission" WHERE "sellerId" = ANY($1) OR "auctionId" = ANY($2)`, [memberIds, auctionIds]);
      await db.query(`DELETE FROM "Notification" WHERE "memberId" = ANY($1)`, [memberIds]);
      await db.query(`DELETE FROM "Watchlist" WHERE "memberId" = ANY($1) OR "auctionId" = ANY($2)`, [memberIds, auctionIds]);
      await db.query(`UPDATE "Auction" SET "highestBidderId" = NULL, "winnerId" = NULL WHERE "highestBidderId" = ANY($1) OR "winnerId" = ANY($1)`, [memberIds]);
      await db.query(`DELETE FROM "Auction" WHERE id = ANY($1)`, [auctionIds]);
      await db.query(`DELETE FROM "OtpChallenge" WHERE identifier = ANY($1)`, [emails]);
      // Sessions, payment orders, ws rows and push subscriptions cascade with the member.
      await db.query(`DELETE FROM "Member" WHERE id = ANY($1)`, [memberIds]);
      await db.query('COMMIT');
      return { members: memberIds.length, auctions: auctionIds.length };
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }
  });
}
