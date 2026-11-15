import { api } from '@/lib/api-client';
import { parseAccountResponse } from './payouts.parse';
import type { PayoutAccountInput } from './payouts.types';

export async function fetchPayoutAccount() {
  const res = await api.get('/payouts/account');
  return parseAccountResponse(res.data);
}

export async function createPayoutAccount(body: PayoutAccountInput) {
  const res = await api.post('/payouts/account', body);
  return parseAccountResponse(res.data);
}
