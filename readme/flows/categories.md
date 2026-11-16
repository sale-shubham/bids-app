# Categories and listing attributes

Phase F. Categories are a tree (`parentId`) with a per-category attribute schema. Code: `src/features/categories/`.

## Data
- `GET /categories` -> `{ items: CategoryNode[] }` tree: `{ id, slug, name, description, parentId, sortOrder, attributeSchema, liveCount, children }`. Hook `useCategoryTree()` (key `['categories','tree']`, 5 min stale). The old `GET /auctions/categories` (name + count) still exists; the app no longer uses it.
- `AttributeDef`: `{ key, label, type: 'text'|'number'|'select', options?, required?, unit? }`.
- Admin (SUPER_ADMIN): `GET /admin/categories` (flat, inactive included, `auctionCount`), `POST`, `PATCH /:id`, `DELETE /:id`. Hooks `useAdminCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` (all invalidate `['categories']`). Errors `CATEGORY_CYCLE`, `CATEGORY_SLUG_TAKEN`, `CATEGORY_IN_USE` (`categories.errors.ts`).

## Helpers (`categories.utils.ts`)
`flattenTree` (depth-first with depth), `findById`, `findBySlug`, `pathTo`, `pickerLevels` (cascading picker model), `attributeSchemaFor`, `adminTreeRows` (flat to ordered tree), `selfAndDescendantIds` (parent select exclusion), `slugify`.

## Sell form
- `CategoryPicker`: root select, then one select per level that has children; value is a category id (any level). Choosing a category keeps only attribute values whose keys the new schema defines.
- `AttributeFields` renders the chosen category's `attributeSchema` (text / number / select, required star, unit suffix) into `attributes: Record<string,string>`.
- Validation (`categories.schema.ts`): `buildAttributesSchema(defs)`, `attributeErrors(defs, values)`; wired into `makeAuctionFormSchema(originalStart, maxPrice, attributeDefs)` as issues on `attributes.<key>`. The resolver is rebuilt when the category tree changes. `attributesToPayload` sends numbers as numbers and drops empty values.
- `INVALID_ATTRIBUTES` `details.fields` (map or `[{key,message}]`) is mapped back onto the fields by `attributeFieldErrors` (`auctions.errors.ts`).

## Browse
Category filter is a tree-aware select by slug (children indented, includes subcategories server side). When the chosen category has `select` attributes, up to 3 appear as extra selects stored as `attr.<key>=value` in the URL and the API params (max 5 accepted, invalid keys dropped, defaults omitted). Changing or clearing the category clears the attr filters. Saved searches keep storing the category slug (attr filters are not saved).

## Detail
Breadcrumb from `categoryPath` (links `/auctions?category=<slug>`), "Specifications" table from `specs`.

## Admin `/admin/categories` (`admin-categories.tsx`, `category-dialog.tsx`, `attribute-schema-editor.tsx`)
Indented tree list with inline active switch (no confirm, reversible), auction counts and a row ⋯ menu (add subcategory / edit / delete). Delete uses `<ConfirmDialog>` and is disabled while the category has auctions or subcategories. The dialog edits name, slug, parent (excludes self and descendants), sort order, active, description and an attribute schema (rows: key, label, type, options as a comma list for select, required, unit; add / remove / reorder) validated by `categoryFormSchema` (key `^[a-z][a-z0-9_]*$`, unique keys, select needs 2+ unique options, max 20 rows). Settings > Marketplace no longer edits categories; it links here (`categories` in admin settings is read-only, the API ignores it on PUT).

## Contract assumptions (not confirmed against bids-api, which had no categories module when written)
Envelope `{ success, data: { items } }` (parser also accepts a bare array); `attributeSchema` limits mirror the form rules above; `details.fields` shape of `INVALID_ATTRIBUTES`; admin PATCH accepts `parentId: null`, `description: null`.
