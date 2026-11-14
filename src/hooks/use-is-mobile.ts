'use client';
import * as React from 'react';

// < md (768px). Matches Tailwind's `md` breakpoint and pwa-template-app's
// useMediaQuery (`mobile: (max-width: 767px)`), so the JS switch lines up
// exactly with /search's CSS `hidden md:block` / `md:hidden` switch.
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/**
 * True when the viewport is below the `md` breakpoint (768px).
 *
 * Since 2026-10-28 this is used ONLY by /search, to choose numbered vs
 * infinite paging (its card grid is the same on both sides, so only the
 * paging differs). Table lists switch on the content box and gate their
 * queries with `useIsNarrowContent()` (`@/hooks/use-is-narrow-content`).
 * Because the value never drives server-rendered markup, there is no hydration
 * mismatch even though it reads `window` in the initializer.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange(); // sync in case the viewport changed between render and effect
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;
