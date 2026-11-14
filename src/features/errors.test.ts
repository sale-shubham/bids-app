import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import { authErrorMessage } from './auth/auth.errors';
import { auctionErrorMessage } from './auctions/auctions.errors';
import { bidErrorMessage, minBidFromError } from './bids/bids.errors';
import { commissionErrorMessage } from './commissions/commissions.errors';

function apiError(code?: string, message = 'Server says no', details?: unknown, status = 400) {
  const err = new AxiosError('Request failed');
  err.response = { status, data: { success: false, error: { code, message, details } } } as AxiosResponse;
  return err;
}

describe('apiErrorCode / apiErrorDetails / apiErrorMessage', () => {
  it('reads code and details from the error envelope', () => {
    const e = apiError('BID_TOO_LOW', 'x', { minBidPaise: 5 });
    expect(apiErrorCode(e)).toBe('BID_TOO_LOW');
    expect(apiErrorDetails(e)).toEqual({ minBidPaise: 5 });
  });
  it('non-axios errors have no code/details', () => {
    expect(apiErrorCode(new Error('x'))).toBeUndefined();
    expect(apiErrorDetails('boom')).toBeUndefined();
  });
  it('details must be an object', () => {
    expect(apiErrorDetails(apiError('X', 'm', 'str'))).toBeUndefined();
    expect(apiErrorDetails(apiError('X', 'm', undefined))).toBeUndefined();
  });
  it('apiErrorMessage: server message, network error, plain Error, fallback', () => {
    expect(apiErrorMessage(apiError('X', 'Nope'))).toBe('Nope');
    expect(apiErrorMessage(new AxiosError('Network Error'))).toMatch(/Can't reach the server/);
    expect(apiErrorMessage(new Error('plain'))).toBe('plain');
    expect(apiErrorMessage(42)).toBe('Something went wrong');
    expect(apiErrorMessage(42, 'custom')).toBe('custom');
  });
});

describe('formatINR', () => {
  it('formats whole rupees without decimals, Indian grouping', () => {
    expect(formatINR(0)).toBe('₹0');
    expect(formatINR(100)).toBe('₹1');
    expect(formatINR(12345600)).toBe('₹1,23,456');
  });
  it('shows two decimals when there are paise', () => {
    expect(formatINR(125050)).toBe('₹1,250.50');
    expect(formatINR(5)).toBe('₹0.05');
  });
});

describe('error-code message maps', () => {
  it('auth', () => {
    expect(authErrorMessage(apiError('INVALID_CREDENTIALS'))).toBe('Incorrect email or password.');
    expect(authErrorMessage(apiError('EMAIL_NOT_VERIFIED'))).toBe('Please verify your email to continue.');
    expect(authErrorMessage(apiError('TOO_MANY_REQUESTS'))).toBe('Too many attempts. Please wait a moment and try again.');
    expect(authErrorMessage(apiError('SOMETHING_NEW', 'Server text'))).toBe('Server text');
    expect(authErrorMessage(new Error('x'), 'fb')).toBe('x');
  });
  it('auctions', () => {
    expect(auctionErrorMessage(apiError('AUCTION_HAS_BIDS'))).toMatch(/already has bids/);
    expect(auctionErrorMessage(apiError('COMMISSION_UNPAID'))).toMatch(/Pay your outstanding commission/);
    expect(auctionErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
  });
  it('commissions', () => {
    expect(commissionErrorMessage(apiError('COMMISSION_NOT_DUE'))).toBe('This commission has already been settled.');
    expect(commissionErrorMessage(apiError('INVALID_SIGNATURE'))).toMatch(/could not verify the payment/);
    expect(commissionErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
    expect(commissionErrorMessage(42)).toBe('Could not process the payment');
  });
  it('bids: mapped codes', () => {
    expect(bidErrorMessage(apiError('OWN_AUCTION'))).toBe('You cannot bid on your own auction.');
    expect(bidErrorMessage(apiError('ALREADY_HIGHEST'))).toBe('You are already the highest bidder.');
    expect(bidErrorMessage(apiError('AUCTION_ENDED'))).toMatch(/bids are closed/);
    expect(bidErrorMessage(apiError('RATE_LIMITED'))).toMatch(/too fast/);
  });
  it('bids: BID_TOO_LOW with and without the minimum', () => {
    const withMin = apiError('BID_TOO_LOW', 'x', { minBidPaise: 125000 });
    expect(minBidFromError(withMin)).toBe(125000);
    expect(bidErrorMessage(withMin)).toBe(`Someone bid before you. The minimum bid is now ${formatINR(125000)}.`);
    const noMin = apiError('BID_TOO_LOW', 'x', { minBidPaise: 'abc' });
    expect(minBidFromError(noMin)).toBeUndefined();
    expect(bidErrorMessage(noMin)).toBe('Your bid is too low. Check the minimum bid and try again.');
  });
  it('bids: unknown -> server message, network -> friendly', () => {
    expect(bidErrorMessage(apiError('WEIRD', 'Server text'))).toBe('Server text');
    expect(bidErrorMessage(new AxiosError('Network Error'))).toMatch(/Can't reach the server/);
    expect(bidErrorMessage(null)).toBe('Could not place your bid');
  });
});
