import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from '@/lib/api-client';
import { formatINR } from '@/lib/utils';
import { authErrorMessage } from './auth/auth.errors';
import { auctionErrorMessage } from './auctions/auctions.errors';
import { bidErrorMessage, buyNowErrorMessage, minBidFromError } from './bids/bids.errors';
import { commissionErrorMessage } from './commissions/commissions.errors';
import { payoutErrorMessage } from './payouts/payouts.errors';
import { isStaleSaleError, saleErrorMessage, salePaymentErrorMessage } from './sales/sales.errors';
import { questionErrorMessage } from './questions/questions.errors';
import { reviewErrorMessage } from './reviews/reviews.errors';
import { reportErrorMessage } from './reports/reports.errors';
import { depositErrorMessage, depositRequiredMessage, isStaleDepositError } from './deposits/deposits.errors';
import { isStaleOfferError, offerErrorMessage } from './second-chance/second-chance.errors';
import { strikeErrorMessage } from './strikes/strikes.errors';
import { isStaleRiskError, riskErrorMessage } from './risk/risk.errors';
import { savedSearchErrorMessage } from './saved-searches/saved-searches.errors';

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

describe('Phase B error maps', () => {
  it('reviews', () => {
    expect(reviewErrorMessage(apiError('REVIEW_NOT_ALLOWED'))).toMatch(/winner/);
    expect(reviewErrorMessage(apiError('ALREADY_REVIEWED'))).toMatch(/already rated/);
    expect(reviewErrorMessage(apiError('ALREADY_REPLIED'))).toMatch(/already replied/);
    expect(reviewErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
    expect(reviewErrorMessage(42)).toBe('Something went wrong');
  });
  it('questions', () => {
    expect(questionErrorMessage(apiError('QUESTION_NOT_ALLOWED'))).toMatch(/cannot ask/);
    expect(questionErrorMessage(apiError('ALREADY_ANSWERED'))).toMatch(/already been answered/);
    expect(questionErrorMessage(apiError('RATE_LIMITED'))).toMatch(/too many questions/);
    expect(questionErrorMessage(apiError(undefined, 'Slow down', undefined, 429))).toBe('Slow down');
  });
  it('saved searches', () => {
    expect(savedSearchErrorMessage(apiError('SAVED_SEARCH_LIMIT'))).toMatch(/at most 10/);
    expect(savedSearchErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
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
  it('PRICE_TOO_HIGH names the platform maximum (auctions and bids)', () => {
    const e = apiError('PRICE_TOO_HIGH', 'x', { maxPaise: 10_000_000_000 });
    expect(auctionErrorMessage(e)).toBe(`The price can be at most ${formatINR(10_000_000_000)}.`);
    expect(bidErrorMessage(e)).toBe(`The price can be at most ${formatINR(10_000_000_000)}.`);
    expect(bidErrorMessage(apiError('PRICE_TOO_HIGH'))).toMatch(/platform maximum/);
  });
  it('bids: BID_TOO_LOW with and without the minimum', () => {
    const withMin = apiError('BID_TOO_LOW', 'x', { minBidPaise: 125000 });
    expect(minBidFromError(withMin)).toBe(125000);
    expect(bidErrorMessage(withMin)).toBe(`Someone bid before you. The minimum bid is now ${formatINR(125000)}.`);
    const noMin = apiError('BID_TOO_LOW', 'x', { minBidPaise: 'abc' });
    expect(minBidFromError(noMin)).toBeUndefined();
    expect(bidErrorMessage(noMin)).toBe('Your bid is too low. Check the minimum bid and try again.');
  });
  it('bids: MAX_TOO_LOW with and without the current max', () => {
    expect(bidErrorMessage(apiError('MAX_TOO_LOW', 'x', { currentMaxPaise: 150000 }))).toBe(`Your new maximum must be higher than your current ${formatINR(150000)}.`);
    expect(bidErrorMessage(apiError('MAX_TOO_LOW'))).toBe('Your new maximum must be higher than your current maximum.');
  });
  it('buy now: BUY_NOW_UNAVAILABLE and fallbacks', () => {
    expect(buyNowErrorMessage(apiError('BUY_NOW_UNAVAILABLE'))).toBe('Buy It Now is no longer available for this auction.');
    expect(bidErrorMessage(apiError('BUY_NOW_UNAVAILABLE'))).toMatch(/no longer available/);
    expect(buyNowErrorMessage(apiError('WEIRD', 'Server text'))).toBe('Server text');
    expect(buyNowErrorMessage(null)).toBe('Could not complete the purchase');
  });
  it('auctions: INVALID_RESERVE / INVALID_BUY_NOW', () => {
    expect(auctionErrorMessage(apiError('INVALID_RESERVE'))).toMatch(/reserve price/i);
    expect(auctionErrorMessage(apiError('INVALID_BUY_NOW'))).toMatch(/Buy It Now price/);
  });
  it('bids: unknown -> server message, network -> friendly', () => {
    expect(bidErrorMessage(apiError('WEIRD', 'Server text'))).toBe('Server text');
    expect(bidErrorMessage(new AxiosError('Network Error'))).toMatch(/Can't reach the server/);
    expect(bidErrorMessage(null)).toBe('Could not place your bid');
  });
});

describe('Phase C error maps', () => {
  it('sales: every new code has friendly copy, unknown falls back to the server message', () => {
    expect(saleErrorMessage(apiError('SALE_NOT_FOUND'))).toMatch(/no longer exists/);
    expect(saleErrorMessage(apiError('SALE_NOT_PAYABLE'))).toMatch(/can no longer be paid/);
    expect(saleErrorMessage(apiError('PAYOUT_ACCOUNT_INACTIVE'))).toMatch(/cannot receive payments/);
    expect(saleErrorMessage(apiError('SALE_INVALID_STATE'))).toMatch(/has changed/);
    expect(saleErrorMessage(apiError('WEIRD', 'Server text'))).toBe('Server text');
    expect(saleErrorMessage(null, 'custom')).toBe('custom');
  });
  it('sale payment errors fall through to the shared payment codes', () => {
    expect(salePaymentErrorMessage(apiError('SALE_NOT_PAYABLE'))).toMatch(/can no longer be paid/);
    expect(salePaymentErrorMessage(apiError('INVALID_SIGNATURE'))).toMatch(/could not verify the payment/);
  });
  it('stale-sale codes trigger a refetch', () => {
    expect(isStaleSaleError(apiError('SALE_INVALID_STATE'))).toBe(true);
    expect(isStaleSaleError(apiError('SALE_NOT_PAYABLE'))).toBe(true);
    expect(isStaleSaleError(apiError('WEIRD'))).toBe(false);
  });
  it('payouts: PAYOUT_ACCOUNT_EXISTS / REQUIRED / INACTIVE', () => {
    expect(payoutErrorMessage(apiError('PAYOUT_ACCOUNT_EXISTS'))).toMatch(/already have a payout account/);
    expect(payoutErrorMessage(apiError('PAYOUT_ACCOUNT_REQUIRED'))).toMatch(/Set up your payout account/);
    expect(payoutErrorMessage(apiError('PAYOUT_ACCOUNT_INACTIVE'))).toMatch(/not active/);
    expect(payoutErrorMessage(null)).toBe('Could not save your payout details');
  });
  it('auctions: PAYOUT_ACCOUNT_REQUIRED', () => {
    expect(auctionErrorMessage(apiError('PAYOUT_ACCOUNT_REQUIRED'))).toMatch(/payout account/);
  });
});

describe('Phase D error maps', () => {
  it('auth: two-factor codes', () => {
    expect(authErrorMessage(apiError('TWO_FACTOR_INVALID_CODE'))).toMatch(/not valid/);
    expect(authErrorMessage(apiError('TWO_FACTOR_CHALLENGE_INVALID'))).toMatch(/enter your password again/);
    expect(authErrorMessage(apiError('TWO_FACTOR_ALREADY_ENABLED'))).toMatch(/already turned on/);
    expect(authErrorMessage(apiError('TWO_FACTOR_NOT_ENABLED'))).toMatch(/not turned on/);
    expect(authErrorMessage(apiError('TWO_FACTOR_UNAVAILABLE'))).toMatch(/not available/);
    expect(authErrorMessage(apiError('TWO_FACTOR_SETUP_REQUIRED'))).toMatch(/Set up two-factor/);
  });
  it('apiErrorMessage: TWO_FACTOR_SETUP_REQUIRED is mapped for admin pages', () => {
    expect(apiErrorMessage(apiError('TWO_FACTOR_SETUP_REQUIRED', 'Server text', undefined, 403))).toMatch(/Set up two-factor/);
  });
  it('reports', () => {
    expect(reportErrorMessage(apiError('REPORT_TARGET_NOT_FOUND'))).toMatch(/no longer available/);
    expect(reportErrorMessage(apiError('INVALID_REPORT'))).toMatch(/cannot report/);
    expect(reportErrorMessage(apiError('ALREADY_REPORTED'))).toMatch(/already reported/);
    expect(reportErrorMessage(apiError('REPORT_ALREADY_RESOLVED'))).toMatch(/already resolved/);
    expect(reportErrorMessage(apiError('TOO_MANY_REQUESTS'))).toMatch(/too many reports/);
    expect(reportErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
  });
});

describe('Phase E error maps', () => {
  it('deposits: DEPOSIT_REQUIRED names the amount; held / not-required are mapped', () => {
    const e = apiError('DEPOSIT_REQUIRED', 'x', { depositPaise: 1_000_000 }, 403);
    expect(depositRequiredMessage(e)).toBe(`Pay the ${formatINR(1_000_000)} refundable deposit to bid on this auction.`);
    expect(bidErrorMessage(e)).toBe(depositRequiredMessage(e));
    expect(buyNowErrorMessage(e)).toBe(depositRequiredMessage(e));
    expect(depositRequiredMessage(apiError('DEPOSIT_REQUIRED'))).toMatch(/refundable deposit/);
    for (const fn of [bidErrorMessage, buyNowErrorMessage, depositErrorMessage]) {
      expect(fn(apiError('DEPOSIT_ALREADY_HELD'))).toMatch(/already paid/);
      expect(fn(apiError('DEPOSIT_NOT_REQUIRED'))).toMatch(/No deposit is required/);
    }
  });
  it('deposit payment errors fall through to the shared payment codes', () => {
    expect(depositErrorMessage(apiError('INVALID_SIGNATURE'))).toMatch(/could not verify the payment/);
    expect(depositErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
  });
  it('stale deposit codes trigger a refetch', () => {
    for (const c of ['DEPOSIT_REQUIRED', 'DEPOSIT_ALREADY_HELD', 'DEPOSIT_NOT_REQUIRED']) expect(isStaleDepositError(apiError(c))).toBe(true);
    expect(isStaleDepositError(apiError('WEIRD'))).toBe(false);
  });
  it('second chance: every code has friendly copy', () => {
    expect(offerErrorMessage(apiError('OFFER_EXISTS'))).toMatch(/already made/);
    expect(offerErrorMessage(apiError('NO_RUNNER_UP'))).toMatch(/no other bidder/);
    expect(offerErrorMessage(apiError('OFFER_NOT_FOUND'))).toMatch(/no longer exists/);
    expect(offerErrorMessage(apiError('OFFER_NOT_PENDING'))).toMatch(/already answered/);
    expect(offerErrorMessage(apiError('OFFER_EXPIRED'))).toMatch(/expired/);
    expect(offerErrorMessage(apiError('PAYOUT_ACCOUNT_INACTIVE'))).toMatch(/cannot receive payments/);
    expect(offerErrorMessage(apiError('OTHER', 'Server text'))).toBe('Server text');
    expect(isStaleOfferError(apiError('OFFER_EXPIRED'))).toBe(true);
    expect(isStaleOfferError(apiError('NO_RUNNER_UP'))).toBe(false);
  });
  it('strikes and risk', () => {
    expect(strikeErrorMessage(apiError('STRIKE_NOT_FOUND'))).toMatch(/no longer exists/);
    expect(strikeErrorMessage(apiError('STRIKE_ALREADY_REMOVED'))).toMatch(/already removed/);
    expect(riskErrorMessage(apiError('RISK_SIGNAL_NOT_FOUND'))).toMatch(/no longer exists/);
    expect(riskErrorMessage(apiError('RISK_ALREADY_REVIEWED'))).toMatch(/already reviewed/);
    expect(isStaleRiskError(apiError('RISK_ALREADY_REVIEWED'))).toBe(true);
    expect(isStaleRiskError(apiError('WEIRD'))).toBe(false);
  });
});
