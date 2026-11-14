// Next's route-segment fallback, shown instantly while a page's own chunk or
// data is still loading (a dynamic route not yet compiled in dev, a slow
// cold-started API call). Without this, that window rendered nothing at all —
// this is what actually painted as a white screen, not the app itself.
export default function AuctioneerLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="app-loader" />
    </div>
  );
}
