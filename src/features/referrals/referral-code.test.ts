import { beforeEach, describe, expect, it } from 'vitest';
import { captureReferralCode, clearReferralCode, readReferralCode, REFERRAL_TTL_MS } from './referral-code';

beforeEach(() => localStorage.clear());

describe('referral code storage', () => {
  it('remembers a valid code and reads it back', () => {
    expect(captureReferralCode(' ABC123 ')).toBe('ABC123');
    expect(readReferralCode()).toBe('ABC123');
  });
  it('ignores empty or malformed codes', () => {
    expect(captureReferralCode(null)).toBeNull();
    expect(captureReferralCode('a b')).toBeNull();
    expect(readReferralCode()).toBeNull();
  });
  it('expires after 30 days', () => {
    const now = Date.now();
    captureReferralCode('ABC123', now);
    expect(readReferralCode(now + REFERRAL_TTL_MS - 1000)).toBe('ABC123');
    expect(readReferralCode(now + REFERRAL_TTL_MS + 1000)).toBeNull();
  });
  it('clear removes it', () => {
    captureReferralCode('ABC123');
    clearReferralCode();
    expect(readReferralCode()).toBeNull();
  });
});
