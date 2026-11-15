/** Whether winners pay through the platform: `off` (arrange it yourselves), `optional` (default) or `required` (sellers need an ACTIVE payout account to list). */
export type CheckoutMode = 'off' | 'optional' | 'required';
export const CHECKOUT_MODES: CheckoutMode[] = ['off', 'optional', 'required'];

export function resolveCheckoutMode(v: unknown): CheckoutMode {
  return CHECKOUT_MODES.includes(v as CheckoutMode) ? (v as CheckoutMode) : 'optional';
}

export interface PublicSettings {
  commissionRateBps: number;
  minIncrementPaise: number;
  antiSnipingMinutes: number;
  categories: string[];
  /** Platform maximum price in paise. Absent on older API versions: use `resolveMaxPricePaise`. */
  maxPricePaise?: number;
  /** Missing on older API versions: treated as `optional`. */
  checkoutMode: CheckoutMode;
}
