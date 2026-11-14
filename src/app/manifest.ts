import type { MetadataRoute } from 'next';

// Web App Manifest - Next serves this at /manifest.webmanifest and auto-links it
// from <head>. Icons are generated from the NobleBid logo by scripts/generate-icons.cjs
// (white tile for "any", logo inside the safe zone for "maskable"); see readme/flows/pwa.md.
// theme_color is the brand purple token (--primary #7C3AED); background_color is
// the white of the launch splash (scripts/generate-apple-splash.mjs).
export default function manifest(): MetadataRoute.Manifest {
  const icon = (size: number, purpose: 'any' | 'maskable' = 'any') => ({
    src: purpose === 'maskable' ? `/icons/icon-${size}x${size}-maskable.png` : `/icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose,
  });

  return {
    name: 'NobleBid — Online Auctions',
    short_name: 'NobleBid',
    description: 'NobleBid is an online auction platform: browse live auctions, place bids and sell your items.',
    // Stable identity for the installed app, independent of start_url. Without
    // it the browser derives the id from start_url, so changing start_url later
    // would register a SECOND installed app instead of updating this one.
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#7C3AED',
    lang: 'en',
    dir: 'ltr',
    categories: ['shopping'],
    prefer_related_applications: false,
    launch_handler: { client_mode: 'navigate-existing' },
    icons: [
      icon(72), icon(96), icon(128), icon(144), icon(152), icon(192), icon(384), icon(512),
      icon(192, 'maskable'), icon(512, 'maskable'),
    ],
    shortcuts: [
      { name: 'Auctions', short_name: 'Auctions', url: '/auctions', icons: [icon(96)] },
      { name: 'Watchlist', short_name: 'Watchlist', url: '/watchlist', icons: [icon(96)] },
      { name: 'My bids', short_name: 'My bids', url: '/my-bids', icons: [icon(96)] },
      { name: 'Sell', short_name: 'Sell', url: '/sell/auctions', icons: [icon(96)] },
    ],
  };
}
