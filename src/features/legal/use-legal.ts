'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchLegalPage, fetchLegalPages } from './legal.api';

// Legal copy changes maybe twice a year — keep it cached for the session.
const STALE_TIME = 5 * 60_000;

export function useLegalPage(slug: string) {
  return useQuery({
    queryKey: ['legal-page', slug],
    queryFn: () => fetchLegalPage(slug),
    staleTime: STALE_TIME,
  });
}

export function useLegalPages() {
  return useQuery({ queryKey: ['legal-pages'], queryFn: fetchLegalPages, staleTime: STALE_TIME });
}
