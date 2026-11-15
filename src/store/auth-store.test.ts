import { describe, expect, it } from 'vitest';
import { isWhatsappOptedIn } from './auth-store';

describe('isWhatsappOptedIn', () => {
  it('prefers the boolean from GET /members/me', () => {
    expect(isWhatsappOptedIn({ whatsappOptIn: true })).toBe(true);
    expect(isWhatsappOptedIn({ whatsappOptIn: false, whatsappOptInAt: '2026-11-01T00:00:00Z' })).toBe(false);
  });
  it('derives it from whatsappOptInAt when the boolean is absent (login / signup-verify)', () => {
    expect(isWhatsappOptedIn({ whatsappOptInAt: '2026-11-01T00:00:00Z' })).toBe(true);
    expect(isWhatsappOptedIn({ whatsappOptInAt: null })).toBe(false);
    expect(isWhatsappOptedIn({})).toBe(false);
    expect(isWhatsappOptedIn(null)).toBe(false);
  });
});
