import { z } from '@/lib/zod';

const emailField = z.string().trim().toLowerCase().email('Enter a valid email');

// Mirrors the API rule: 8-72 characters (bytes), at least one letter and one number.
export const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'At most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

const codeField = z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const twoFactorCodeSchema = z.object({ code: codeField });

// Recovery codes are 8-32 chars (the API accepts hyphenated groups); dashes and spaces are tolerated.
export const recoveryCodeSchema = z.object({
  recoveryCode: z
    .string()
    .trim()
    .min(8, 'Enter one of your recovery codes')
    .max(32, 'That recovery code is too long'),
});

// Turning 2FA off needs the password plus a current code (a recovery code works too).
export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  code: z.string().trim().min(6, 'Enter a 6-digit code or a recovery code').max(32, 'That code is too long'),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required').max(200),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    role: z.enum(['BIDDER', 'AUCTIONEER']),
    terms: z.literal(true, { error: 'You must accept the Terms and Conditions to continue' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    code: codeField,
    password: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type DisableTwoFactorFormValues = z.infer<typeof disableTwoFactorSchema>;
