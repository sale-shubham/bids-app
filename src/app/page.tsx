import { redirect } from 'next/navigation';

// The marketing site lives in the separate bids-website repo (noblebids.shubsale.in).
// This app is mounted on its own host (bidsapp.shubsale.in), so "/" is only a
// direct-hit fallback: the edge gate (src/proxy.ts, "/" is a guest-only route) already
// sends a signed-in user to their role's home before this renders.
export default function RootPage() {
  redirect('/login');
}
