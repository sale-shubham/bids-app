import { z } from '@/lib/zod';

const emailField = z.string().trim().toLowerCase().email('Enter a valid email');

// Login = email + password. Email OTP is used only for signup verification and
// forgot-password.
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const otpCodeSchema = z.object({
  code: z.string().trim().min(4, 'Enter the code').max(8),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
  email: emailField,
  password: z.string().min(8, 'At least 8 characters').max(128),
  role: z.enum(['BIDDER', 'AUCTIONEER']),
  consent: z.literal(true, {
    error: 'You must accept the Privacy Policy and Terms to create an account',
  }),
});

export const forgotPasswordSchema = z.object({ email: emailField });

export const profileNameSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type OtpCodeFormValues = z.infer<typeof otpCodeSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ProfileNameValues = z.infer<typeof profileNameSchema>;
