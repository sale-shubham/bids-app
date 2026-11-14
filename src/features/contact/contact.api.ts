import { api, apiErrorCode, apiErrorMessage } from '@/lib/api-client';
import type { ContactFormValues } from './contact.schema';

export async function sendContact(input: ContactFormValues): Promise<void> {
  await api.post('/contact', input);
}

export function contactErrorMessage(err: unknown): string {
  const code = apiErrorCode(err);
  if (code === 'TOO_MANY_REQUESTS' || code === 'RATE_LIMITED') {
    return 'You have sent several messages recently. Please wait a little while before trying again.';
  }
  return apiErrorMessage(err, 'Could not send your message. Please try again.');
}
