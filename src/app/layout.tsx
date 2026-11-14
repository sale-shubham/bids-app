import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';
import { ServiceWorkerRegister } from '@/components/common/sw-register';
import { PwaInstallPrompt } from '@/components/common/pwa-install-prompt';
import { PwaUpdatePrompt } from '@/components/common/pwa-update-prompt';
import { OfflineBanner } from '@/components/common/offline-banner';
import { SITE_URL } from '@/lib/site';
import appleSplashDevices from '@/constants/apple-splash-devices.json';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

// iOS launch screens. Unlike Android, iOS never builds one from the manifest's
// icons + background_color: it shows a startup image only when a link's media
// query matches the device's exact screen size and orientation, and a blank
// screen otherwise. Images come from scripts/generate-apple-splash.mjs, which
// reads the same device list. device-width/height are the portrait values in
// both orientations on iOS, so only the orientation feature changes.
const appleStartupImages = appleSplashDevices.flatMap(({ width, height, ratio, landscape }) => {
  const media = (orientation: 'portrait' | 'landscape') =>
    `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`;
  const w = width * ratio;
  const h = height * ratio;
  const images = [{ url: `/splash/apple-splash-${w}x${h}.png`, media: media('portrait') }];
  if (landscape) images.push({ url: `/splash/apple-splash-${h}x${w}.png`, media: media('landscape') });
  return images;
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'NobleBid — Online Auctions',
  description: 'NobleBid is an online auction platform: browse live auctions, place bids and sell your items.',
  applicationName: 'NobleBid',
  openGraph: {
    type: 'website',
    siteName: 'NobleBid',
    title: 'NobleBid — Online Auctions',
    description: 'Bid on live auctions, find ending-soon deals and sell your own items on NobleBid.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'NobleBid' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-image.png'] },
  manifest: '/manifest.webmanifest',
  // 'default', not 'black-translucent': translucent draws the installed app
  // under the iOS status bar, and iOS then lays its frosted top-edge blur over
  // the page, leaving the topbar visibly soft. Only the home-screen app reads
  // this; a Safari tab and Chrome's PWA never did, which is why only it blurred.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NobleBid',
    startupImage: appleStartupImages,
  },
  // Generated from the logo by scripts/generate-icons.cjs.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152' },
      { url: '/icons/apple-touch-icon-167x167.png', sizes: '167x167' },
    ],
  },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  // Native page pinch-zoom is off: it magnifies the fixed bottom nav along with the page, and nothing can be exempted from it. Content zoom
  // is provided instead by <PinchZoom> inside <main> — see pinch-zoom.tsx. Zoom
  // is therefore NOT removed for the reader, only moved to where it belongs.
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#7C3AED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className={`${inter.variable} overflow-x-hidden font-sans`}>
        <Providers>{children}</Providers>
        <OfflineBanner />
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <PwaUpdatePrompt />
      </body>
    </html>
  );
}
