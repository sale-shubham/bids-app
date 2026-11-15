import { PAYOUT_STATUSES, type PayoutAccount, type PayoutStatus } from './payouts.types';

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null ? (v as Obj) : {});
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);

/** `{ data: { account } }` (GET and POST /payouts/account) -> account or null. */
export function parseAccountResponse(body: unknown): PayoutAccount | null {
  const a = obj(obj(obj(body).data).account);
  if (!PAYOUT_STATUSES.includes(a.status as PayoutStatus)) return null;
  return {
    status: a.status as PayoutStatus,
    statusReason: strOrNull(a.statusReason),
    legalName: typeof a.legalName === 'string' ? a.legalName : '',
    businessType: a.businessType === 'individual' || a.businessType === 'proprietorship' ? a.businessType : null,
    bankLast4: strOrNull(a.bankLast4),
    ifsc: strOrNull(a.ifsc),
    beneficiaryName: strOrNull(a.beneficiaryName),
    createdAt: strOrNull(a.createdAt),
    updatedAt: strOrNull(a.updatedAt),
  };
}
