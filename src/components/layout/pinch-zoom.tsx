'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const distance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/**
 * Pinch-zoom for the page CONTENT only.
 *
 * The browser's own pinch-zoom magnifies the whole page, fixed bottom nav
 * included, and nothing can be exempted from it: counter-scaling the nav from
 * JS always runs a frame behind the compositor, which is the stutter. So native
 * page zoom is switched off (viewport + touch-action + iOS gesture events, see
 * layout.tsx / globals.css / below), and the content zooms itself here. The nav
 * sits outside this component, so there is nothing for it to follow.
 *
 * Two phases, for smoothness:
 *   - DURING the pinch, a `transform: scale()` about the pinch point. That runs
 *     on the compositor with no layout, so the content tracks the fingers.
 *   - ON RELEASE, it commits to CSS `zoom`: the content reflows at the new
 *     size and the scroll container (`<main>`) pans it natively in both axes —
 *     no hand-rolled pan, clamping or momentum. The scroll position is set so
 *     the point under the fingers stays put through the swap.
 *
 * Styles are written straight to the DOM; React state would re-render the
 * page on every frame of the gesture. Zoom resets on navigation.
 */
export function PinchZoom({
  scrollRef,
  children,
}: {
  /** The scrolling ancestor — `<main>` in DashboardShell. */
  scrollRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const zoom = React.useRef(1);
  const pathname = usePathname();

  // A zoom level is about the page you were reading, not the next one.
  React.useEffect(() => {
    zoom.current = 1;
    const el = contentRef.current;
    if (el) {
      el.style.zoom = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
    }
  }, [pathname]);

  React.useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;

    // Gesture state, captured at the moment the second finger lands.
    let startDist = 0;
    let startZoom = 1;
    let pending = 1;
    let anchor = { x: 0, y: 0 }; // pinch point, in the scroller's viewport
    let origin = { x: 0, y: 0 }; // same point, in unzoomed content units
    let frame = 0;
    let active = false;

    const contentOffset = () => {
      // Where the content box starts inside the scroller's scrollable area —
      // the scroller's padding, which is not zoomed.
      const s = scroller.getBoundingClientRect();
      const c = content.getBoundingClientRect();
      return { x: c.left - s.left + scroller.scrollLeft, y: c.top - s.top + scroller.scrollTop };
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      active = true;
      startDist = distance(e.touches[0], e.touches[1]);
      startZoom = zoom.current;
      pending = startZoom;

      const s = scroller.getBoundingClientRect();
      anchor = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - s.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - s.top,
      };
      const o = contentOffset();
      origin = {
        x: (scroller.scrollLeft + anchor.x - o.x) / startZoom,
        y: (scroller.scrollTop + anchor.y - o.y) / startZoom,
      };
      // transform-origin lengths on a zoomed element are themselves zoomed, so
      // unzoomed content units land exactly on the pinch point.
      content.style.transformOrigin = `${origin.x}px ${origin.y}px`;
      content.style.willChange = 'transform';
    };

    const onMove = (e: TouchEvent) => {
      if (!active || e.touches.length !== 2) return;
      // Two fingers are a zoom, never a scroll.
      e.preventDefault();
      pending = clamp(startZoom * (distance(e.touches[0], e.touches[1]) / startDist), MIN_ZOOM, MAX_ZOOM);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        content.style.transform = `scale(${pending / startZoom})`;
      });
    };

    const onEnd = (e: TouchEvent) => {
      if (!active || e.touches.length >= 2) return;
      active = false;
      cancelAnimationFrame(frame);

      const next = pending < 1.02 ? 1 : pending; // snap home rather than park at 1.01
      const o = contentOffset();
      content.style.transform = '';
      content.style.transformOrigin = '';
      content.style.willChange = '';
      content.style.zoom = next === 1 ? '' : String(next);
      zoom.current = next;

      // Keep the point under the fingers where it was through the swap from
      // transform to real zoom.
      scroller.scrollLeft = o.x + origin.x * next - anchor.x;
      scroller.scrollTop = o.y + origin.y * next - anchor.y;
    };

    scroller.addEventListener('touchstart', onStart, { passive: true });
    // Not passive: onMove must be able to preventDefault a two-finger drag.
    scroller.addEventListener('touchmove', onMove, { passive: false });
    scroller.addEventListener('touchend', onEnd, { passive: true });
    scroller.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('touchstart', onStart);
      scroller.removeEventListener('touchmove', onMove);
      scroller.removeEventListener('touchend', onEnd);
      scroller.removeEventListener('touchcancel', onEnd);
    };
  }, [scrollRef]);

  return <div ref={contentRef}>{children}</div>;
}

/**
 * iOS Safari ignores `user-scalable=no` and keeps its own pinch-zoom; its
 * proprietary gesture events are the only reliable way to stop it. Without
 * this, iPhone users would get BOTH zooms at once. No-op elsewhere.
 */
export function BlockNativePinch() {
  React.useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
    };
  }, []);
  return null;
}
