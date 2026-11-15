export interface PublicSettings {
  commissionRateBps: number;
  minIncrementPaise: number;
  antiSnipingMinutes: number;
  categories: string[];
  /** Platform maximum price in paise. Absent on older API versions: use `resolveMaxPricePaise`. */
  maxPricePaise?: number;
}
