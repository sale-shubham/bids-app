'use client';
import * as React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import * as api from './analytics.api';
import type { AnalyticsDays } from './analytics.api';

export const sellerAnalyticsKey = (days: AnalyticsDays) => ['analytics', 'seller', days] as const;
export const auctionAnalyticsKey = (id: string, days: AnalyticsDays) => ['analytics', 'auction', id, days] as const;

export function useSellerAnalytics(days: AnalyticsDays) {
  return useQuery({ queryKey: sellerAnalyticsKey(days), queryFn: () => api.fetchSellerAnalytics(days), placeholderData: keepPreviousData });
}

export function useAuctionAnalytics(id: string, days: AnalyticsDays) {
  return useQuery({ queryKey: auctionAnalyticsKey(id, days), queryFn: () => api.fetchAuctionAnalytics(id, days), placeholderData: keepPreviousData });
}

// Auction ids already counted in this page load (module scope: survives remounts, resets on reload).
const counted = new Set<string>();

/**
 * Counts one view per auction per page load. Waits for the session to settle so
 * the seller's own visits can be skipped; failures are ignored, rendering is never blocked.
 */
export function useTrackAuctionView(auctionId: string, sellerId: string) {
  const initialized = useAuthStore((s) => s.initialized);
  const memberId = useAuthStore((s) => s.member?.id);
  React.useEffect(() => {
    if (!initialized || memberId === sellerId || counted.has(auctionId)) return;
    counted.add(auctionId);
    api.recordAuctionView(auctionId).catch(() => {});
  }, [initialized, memberId, auctionId, sellerId]);
}

/** Test hook: forget which auctions were counted. */
export function resetTrackedViews() {
  counted.clear();
}
