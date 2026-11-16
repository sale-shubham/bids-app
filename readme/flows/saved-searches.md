# Saved searches (alerts)

MEMBERs save the current `/auctions` filters and get a notification (`saved-search-match`) when a new auction matches. Max 10 per member.

## API
- `GET /saved-searches` -> `{ items }`; `POST /saved-searches` `{ name?<=60, q?, category?, condition?, minPricePaise?, maxPricePaise? }` (at least one criterion) -> `{ savedSearch }`; `DELETE /saved-searches/:id`. Error `SAVED_SEARCH_LIMIT` (409).

## Code (`src/features/saved-searches/`)
- `saved-searches.utils.ts`: `hasSearchCriteria` (q / category / condition / min / max; status and sort do not count), `toSavedSearchPayload` (URL rupees -> paise, like `auctionListParams`), `summarizeSavedSearch`, `savedSearchHref` (paise -> rupees, via `filtersToSearchParams`).
- `saved-searches.schema.ts` (name <= 60), `.errors.ts`, `.api.ts`, `use-saved-searches.ts` (key `['saved-searches']`, enabled for MEMBERs only).
- `SaveSearchButton` in `AuctionFilterBar`: shown to MEMBERs once a criterion is set; opens a dialog with an optional name.
- `AlertsCard`: the "Alerts" tab in `ProfilePage` (MEMBERs only; `?tab=alerts` opens it). Each row shows the name, a readable summary, "View results" and Delete behind `<ConfirmDialog>`.
