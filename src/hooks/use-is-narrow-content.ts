'use client';
import * as React from 'react';

// `@3xl/content` — 48rem of the content box that <main> declares as
// `@container/content`. `ResponsiveList` and `MobileSortControl` switch at this
// width in CSS; this hook switches the data at the same one.
const TABLE_MIN_REM = 48;

// Fallback for a page rendered outside the dashboard shell, where there is no
// <main> to measure: the old viewport rule.
const NO_SHELL_QUERY = '(max-width: 767px)';

function contentIsNarrow(): boolean {
  const main = document.querySelector('main');
  if (!main) return window.matchMedia(NO_SHELL_QUERY).matches;
  const style = getComputedStyle(main);
  // A container query measures the content box: the border box minus the
  // vertical scrollbar minus the padding. Fractional, as the CSS sees it —
  // `clientWidth` rounds, and half a pixel off at the threshold would show the
  // cards while only the table's query runs.
  const scrollbar = main.offsetWidth - main.clientWidth;
  const content =
    main.getBoundingClientRect().width - scrollbar - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return content < TABLE_MIN_REM * rem;
}

/**
 * True when the content area is narrower than a list's table needs (768px of
 * `<main>`'s content box) — a phone, or a desktop whose open sidebar leaves too
 * little room.
 *
 * Layout itself switches via CSS (`hidden @3xl/content:block` /
 * `@3xl/content:hidden` in `ResponsiveList`), so this hook is used ONLY to
 * gate data fetching: wide runs the table's offset `useQuery`, narrow runs the
 * cards' infinite `useInfiniteQuery`, each enabled only on its own side so
 * exactly one fetches. It measures the element, not the window, because
 * collapsing the sidebar changes the content box with no window resize. The
 * value never drives server-rendered markup, so reading the DOM in the
 * initializer causes no hydration mismatch.
 */
export function useIsNarrowContent(): boolean {
  const [isNarrow, setIsNarrow] = React.useState(() => typeof window !== 'undefined' && contentIsNarrow());

  React.useEffect(() => {
    const onChange = () => setIsNarrow(contentIsNarrow());
    onChange(); // sync in case the layout changed between render and effect
    const main = document.querySelector('main');
    const observer = main ? new ResizeObserver(onChange) : null;
    if (main) observer?.observe(main);
    window.addEventListener('resize', onChange);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onChange);
    };
  }, []);

  return isNarrow;
}

export default useIsNarrowContent;
