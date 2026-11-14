import { z } from '@/lib/zod';

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: z.string().trim().email('Enter a valid email address'),
  subject: z.string().trim().min(3, 'Enter a subject').max(150),
  message: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000, 'Keep it under 2000 characters'),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
