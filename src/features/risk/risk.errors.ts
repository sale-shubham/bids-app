import { apiErrorCode, apiErrorMessage } from '@/lib/api-client';

const MESSAGES: Record<string, string> = {
  RISK_SIGNAL_NOT_FOUND: 'This risk flag no longer exists.',
  RISK_ALREADY_REVIEWED: 'This risk flag was already reviewed.',
};

export function riskErrorMessage(err: unknown, fallback = 'Something went wrong') {
  const code = apiErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return apiErrorMessage(err, fallback);
}

/** Codes that mean the queue is stale: refetch it. */
export function isStaleRiskError(err: unknown) {
  const code = apiErrorCode(err);
  return code === 'RISK_SIGNAL_NOT_FOUND' || code === 'RISK_ALREADY_REVIEWED';
}
