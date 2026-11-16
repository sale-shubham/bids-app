import { describe, expect, it } from 'vitest';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, passwordField, resetPasswordSchema, signupSchema } from './auth.schema';

const msgs = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => i.message));

describe('passwordField', () => {
  it('accepts a valid password', () => {
    expect(passwordField.safeParse('abcdefg1').success).toBe(true);
  });
  it.each([
    ['short1a', 'At least 8 characters'],
    ['12345678', 'Include at least one letter'],
    ['abcdefgh', 'Include at least one number'],
  ])('rejects %s', (pw, message) => {
    expect(msgs(passwordField.safeParse(pw))).toContain(message);
  });
  it('limits to 72 bytes (multi-byte counts)', () => {
    expect(passwordField.safeParse('a1' + 'x'.repeat(70)).success).toBe(true);
    expect(msgs(passwordField.safeParse('a1' + 'x'.repeat(71)))).toContain('At most 72 characters');
    // 40 two-byte chars = 80 bytes but only 40 chars
    expect(msgs(passwordField.safeParse('a1' + 'é'.repeat(40)))).toContain('At most 72 characters');
  });
});

describe('signupSchema', () => {
  const ok = { name: 'Asha', email: ' Asha@Example.COM ', password: 'abcdefg1', confirmPassword: 'abcdefg1', terms: true };
  it('normalises the email and passes', () => {
    const r = signupSchema.safeParse(ok);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe('asha@example.com');
  });
  it('requires matching passwords', () => {
    const r = signupSchema.safeParse({ ...ok, confirmPassword: 'different1' });
    expect(r.error?.issues.find((i) => i.path[0] === 'confirmPassword')?.message).toBe('Passwords do not match');
  });
  it('has no role field: a role sent by an old client is stripped', () => {
    const r = signupSchema.safeParse({ ...ok, role: 'SUPER_ADMIN' });
    expect(r.success).toBe(true);
    expect(r.data).not.toHaveProperty('role');
  });
  it('requires terms', () => {
    expect(msgs(signupSchema.safeParse({ ...ok, terms: false }))).toContain('You must accept the Terms and Conditions to continue');
  });
});

describe('other auth schemas', () => {
  it('login needs email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(msgs(loginSchema.safeParse({ email: 'nope', password: '' }))).toEqual(expect.arrayContaining(['Enter a valid email', 'Password is required']));
  });
  it('forgot password validates email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false);
  });
  it('reset password needs a 6-digit code', () => {
    const base = { password: 'abcdefg1', confirmPassword: 'abcdefg1' };
    expect(resetPasswordSchema.safeParse({ ...base, code: ' 123456 ' }).success).toBe(true);
    expect(msgs(resetPasswordSchema.safeParse({ ...base, code: '12345' }))).toContain('Enter the 6-digit code');
  });
  it('change password mismatch', () => {
    const r = changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: 'abcdefg1', confirmPassword: 'abcdefg2' });
    expect(msgs(r)).toContain('Passwords do not match');
  });
  it('empty fields use the "Required" copy from lib/zod', () => {
    const r = loginSchema.safeParse({});
    expect(msgs(r)).toContain('Required');
  });
});
