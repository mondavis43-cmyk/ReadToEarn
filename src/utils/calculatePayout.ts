// utils/calculatePayout.ts

export type SubscriptionTier = 'free' | 'casual' | 'avid' | 'voracious';

const PLATFORM_RATES: Record<SubscriptionTier, number> = {
  free: 0.50,
  casual: 0.65,
  avid: 0.80,
  voracious: 0.95,
};

const SPONSORED_RATE = 0.0085;
const SPONSORED_MAX = 5.00;

export function calculatePayout(
  bookType: 'platform' | 'sponsored',
  pageCount: number,
  userTier: SubscriptionTier
): number {
  if (bookType === 'platform') {
    return PLATFORM_RATES[userTier];
  }

  // sponsored
  const payout = pageCount * SPONSORED_RATE;
  return Math.min(payout, SPONSORED_MAX);
}
