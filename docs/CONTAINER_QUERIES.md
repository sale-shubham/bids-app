# CONTAINER_QUERIES.md — responsive rules inside a page body

**MANDATORY.** Inside a page body, lay out against the **container**, never the viewport. A
viewport breakpoint answers "how wide is the window?". Page content needs "how wide is the box I
was given?". With a collapsible sidebar those are different numbers, and the gap is the sidebar.

---

## 1. The problem, in this app's numbers

`<main>` is the viewport minus the sidebar minus its own padding. The desktop sidebar is **0px
collapsed or 256px expanded**, on the member's own toggle (`sidebar-collapsed` in `localStorage`),
and `<main>` adds `px-4` on a phone / `px-6` from `sm`. So one window is two very different boxes:

| Window | Sidebar | Content box | `md:` (≥768px) matched? | What a `md:` table/cards switch would give |
|---|---|---|---|---|
| 940px | collapsed (0) | **892px** | yes | the table, with room for it |
| 940px | expanded (256) | **636px** | yes | `/admin/members`' 10-column table squeezed into 636px, scrolling sideways |

The CSS would be identical in both rows because the *window* never changed. That is why the admin
lists switch on the content box instead (§5.5).

A dialog is the same bug in a smaller form. `DialogContent` is `max-w-lg` with `p-6`, so it hands
its children **~464px** no matter how wide the window is, and `sm:`/`md:`/`lg:` all match inside
it on any desktop.

## 2. The rule

Three questions settle almost every case:

1. *Does this decide which chrome to render?* (sidebar vs bottom nav, phone-only parts of the
   topbar) → **viewport**. It is a device question.
2. *Is this an overlay sized against the screen?* (`DialogContent`'s own `sm:w-full`, the install,
   update and push prompts, the offline banner) → **viewport**.
3. *Is this content filling the space it was handed?* → **container**. Everything else lands here.

## 3. The surfaces

Every surface that hands a width to content declares the **same container name**, so a shared
component behaves correctly wherever it is mounted. There are exactly two:

| Surface | File | Declares |
|---|---|---|
| The content area (desktop **and** mobile — one `<main>`, not two branches) | `src/components/layout/dashboard-shell.tsx` | `@container/content` |
| `DialogContent` — a dialog renders in a **portal**, outside `<main>` | `src/components/ui/dialog.tsx` | `@container/content` |

**Why the portal needs its own:** a dialog is not a DOM descendant of `<main>`, so without its own
declaration every `@…/content:` class inside it matches nothing and the dialog renders the base
(narrow) styles forever. This is the most common way this rule breaks something.

**Why one shared name and not a bare `@container`:** an unnamed container is matched by the
*nearest* container ancestor, so the moment some card declares its own, every descendant's variants
silently re-target it. A component that genuinely needs its own sub-container declares one with a
**different** name (e.g. `@container/results`, queried as `@lg/results`). There is none today.

The declaration sits on the element that owns the padding (`<main>`, `DialogContent`), which is what
you want: a query measures the container's **content box**, so the padding is already excluded.

**Outside both surfaces:** only the `(auth)` pages (`/login`, `/signup`, `/forgot-password`,
`/reset-password`) render no `DashboardShell`, so they have no container and keep their viewport
breakpoints. The public pages (`/auctions`, `/auctions/[id]`, `/leaderboard`, `/sellers/[id]`,
`/pages/*`, `/suspended`) render inside `DashboardShell` through `PublicShell` (guest mode when
logged out), so they have the `@container/content` box and use container queries like any other
page body. The marketing pages (`/`, `/about`, `/how-it-works`, `/contact`) are not in this app at
all (`/` is a redirect to `/login`). A shared component also mounted on the auth pages must stay on
viewport breakpoints, or it would render only its base styles there: today that is `OtpInput`.

## 4. The mapping

Tailwind's container scale is **not** the viewport scale (`@md` is 448px, not 768px). Never
translate by name. Two maps are in use, because the two surfaces are nowhere near the same size.

**Page bodies** — what a page body was actually getting behind each viewport rule:

| Viewport | Container | Container width |
|---|---|---|
| `sm:` (640) | `@lg/content:` | 512px |
| `md:` (768) | `@2xl/content:` | 672px |
| `lg:` (1024) | `@3xl/content:` | 768px |
| `xl:` (1280) | `@4xl/content:` | 896px |
| `2xl:` (1536) | `@5xl/content:` | 1024px |

In use: `@lg/content` for page-header and filter rows (`PageHeader`, `/admin/members`,
`/admin/auctions`, `/sell/auctions`, `/sell/auctions/[id]`, `/sell/commissions`' rows,
`UnpaidCommissionBanner`, admin settings, the `/auctions` filters), grids (`AuctionGrid`,
`ProfileIdentityCard`, `MarketplaceSettings`), the auction detail view (`AuctionDetailView`), the
leaderboard view, the seller page (`/sellers/[id]`),
`ListPagination`'s alignment and the Profile tab strip; `@3xl/content` for the table/cards switch
(`ResponsiveList`, `MobileSortControl`).

**Inside a dialog** — a default dialog hands out ~464px, so every step above `@sm` would never
match and the layout would be stuck single-column on a desktop. One step down the scale:

| Viewport | Container | Container width |
|---|---|---|
| `sm:` | `@sm/content:` | 384px |
| `md:` | `@md/content:` | 448px |

In use at: `DialogHeader` / `DialogFooter` (`ui/dialog.tsx`) and `ui/tabs` (`TabsList` can be
mounted in page bodies and dialogs, so it takes the step that clears a dialog too).

Full container scale: `@3xs` 256 · `@2xs` 288 · `@xs` 320 · `@sm` 384 · `@md` 448 · `@lg` 512 ·
`@xl` 576 · `@2xl` 672 · `@3xl` 768 · `@4xl` 896 · `@5xl` 1024 · `@6xl` 1152 · `@7xl` 1280 (px).

Both tables are a **starting point, not an answer**. The real breakpoint is "how much room does this
row need?" — measure the thing. The admin tables need about 768px before they stop scrolling, so
`ResponsiveList` switches at `@3xl/content`.

## 5. Gotchas

### 5.1 `window.resize` stops being enough

Any JS that measures layout must observe the **element**, because collapsing the sidebar changes the
content box with no window resize event. The one such hook today, `useIsNarrowContent()`, uses a
`ResizeObserver` on `<main>`; `PinchZoom` measures `<main>` only during a pinch gesture. A new one
needs a `ResizeObserver` on the element, not a `window` `resize` listener.

### 5.2 A container can't query itself

An element with `container-type: inline-size` cannot style *itself* from its own width — only
descendants can. Declaration on the wrapper, variants on the children.

### 5.3 `container-type: inline-size` establishes containment

The element gets `contain: layout style inline-size`: it becomes a stacking context and a containing
block for positioned descendants, and its inline size no longer depends on its contents. For
`<main>` (width from `flex-1`) and `DialogContent` (width from `w-[80%] max-w-lg`) that is a no-op,
but it would collapse an element sized *by* its contents (a `w-fit` chip). Declare containers on
layout wrappers only.

This is also why every `position: fixed` overlay in this app must stay **outside `<main>`**. Radix
`Dialog`, `Select`, `Popover`, `DropdownMenu` and `Tooltip` all portal to `<body>`, `ImageLightbox`
uses `DialogPrimitive.Portal`, the mobile bottom nav is a sibling of `<main>`, the offline banner
and the install and update prompts are mounted from the root layout, and `PushPermissionPrompt`
from `(member)/layout.tsx`, outside the shell. A fixed panel left inside `<main>` would resolve its
coordinates against `<main>` instead of the viewport and land offset by the sidebar.

### 5.4 Overflow still overflows

Container queries decide *when* a layout changes, not whether content fits. Decide what narrow means
per component — wrap (`TabsList`'s `flex-wrap`), stack (the header and filter rows), or switch
representation (`ResponsiveList`'s cards). Hidden horizontal scroll with no scrollbar reads to users
as "items disappeared", and on `<main>` it hangs a scrollbar on the whole page.

### 5.5 Don't convert the device decision — and keep a CSS switch and its JS twin on one box

Which chrome to render (sidebar vs bottom nav) is about the device and its input model, not the
available width: a 500px content area on a desktop should still render the desktop shell, with a
tighter layout. Converting it produces a phone UI inside a desktop window. That stays `md:`.

**A list's table/cards switch is a container query.** `ResponsiveList` shows the table from
`@3xl/content` (768px of content) and the cards below it; `MobileSortControl` hides at the same
`@3xl/content`. With the sidebar open a window has to reach ~1,072px before the table shows;
closed, ~816px.

The catch is the data. Each list runs one of two queries — offset for the table, infinite for the
cards — and `useAdminList()` (`src/features/admin/use-admin.ts`) picks which with
`useIsNarrowContent()` (`src/hooks/use-is-narrow-content.ts`). That hook measures `<main>`'s
content box (fractional width, minus scrollbar and padding, against 48rem at the root font size)
and re-measures through a `ResizeObserver` on `<main>`, so the sidebar toggle swaps the query as it
swaps the layout. If the hook read the window instead, the cards could show with the sidebar open
while only the table's query ran: an empty list claiming there is nothing there.
**Any CSS switch whose two halves are fed by different queries must be measured by JS on the same
box at the same width.** If you change one, change the other.

What stays viewport, on purpose:

- Chrome: the sidebar (`hidden md:block`), the bottom nav (`md:hidden`), the topbar's `md:` swaps,
  and `MorePage`'s quick-link grid (`md:hidden`, because it stands in for the bottom bar).
- Components also mounted outside the shell (§3): `OtpInput`.
- Touch/device rules: `HoverGallery`'s arrows (`max-md:opacity-100` — there is no hover on a phone).
- `ui/calendar`'s `sm:flex-row` months: it renders inside a portalled `Popover`, outside any
  container — an overlay, sized against the screen.
- Fixed prompts (`PwaInstallPrompt`, `PushPermissionPrompt`: `md:bottom-4 md:right-4`).

### 5.6 Not yet converted

These page-body rules inside `DashboardShell` still use viewport breakpoints and should move to the
maps above when next touched:

- `/admin` dashboard grids (`sm:grid-cols-2 xl:grid-cols-3`, `xl:grid-cols-2`)
- `/my-bids` and `/sell/auctions` rows (`sm:flex-row sm:items-center`, `sm:w-32`)
- `AuctionForm` grids on `/sell/new` and `/sell/auctions/[id]/edit` (`sm:grid-cols-2`, `sm:grid-cols-4`)
- `RepublishDialog`'s date/time grid (`sm:grid-cols-2`; inside a dialog it should be `@sm/content`)
- `ProfileIdentityCard`'s header (`sm:flex-row sm:text-left`) and `SignOutCard`'s buttons (`sm:flex-row`)
- `/notifications`' header is a bare `flex items-center justify-between` (see §7)

## 6. Verification

- **The toggle test.** Fix the window at an awkward width (~940px), then collapse/expand the sidebar
  without touching the window. The layout must re-flow on the toggle alone. `/admin/members` is a
  good page for it: table with the sidebar closed, cards with it open.
- **Both shells.** Check a phone width too — a missing container declaration shows up as "all the
  base styles, none of the variants".
- **Overlays.** Open a dialog. If its footer buttons stay stacked on a desktop, the portal is
  missing its container.
- **Prove the classes compiled.** Do not run `next build` against a running dev server (it shares
  `.next`). Compile the stylesheet on its own instead, to a path outside the repo
  (`@tailwindcss/cli` is not a project dependency, so `npx` fetches it):

```bash
npx @tailwindcss/cli -i src/app/globals.css -o /tmp/cq.css
grep -o "@container content (width >=[^)]*)" /tmp/cq.css | sort -u
# @container content (width >= 24rem)   <- @sm
# @container content (width >= 32rem)   <- @lg
# @container content (width >= 48rem)   <- @3xl
grep -A2 "@container\\\\/content" /tmp/cq.css
# container-type: inline-size; container-name: content;
```

## 7. Checklist for new code

- [ ] Page-body classes use `@…/content:`, never a bare `sm:` / `md:` / `lg:`
- [ ] A row that is also mounted in a default-width dialog uses the dialog map (`@sm/content` /
      `@md/content`)
- [ ] Viewport breakpoints remain only for: chrome/device choice, overlay widths, and components
      also mounted outside `DashboardShell`
- [ ] A new table list goes through `ResponsiveList` and gates its queries on `useIsNarrowContent()`
      (as `useAdminList()` does)
- [ ] A page header with an action (button, search, badge) is the shared row —
      `flex flex-col gap-4 @lg/content:flex-row @lg/content:items-center @lg/content:justify-between`
      (admin pages: the common `PageHeader`) — never a bare
      `flex items-center justify-between`, which has no narrow layout at all and squeezes the title
      once the sidebar is open
- [ ] A sub-container gets its **own** name (`@container/results`), never a bare `@container`
- [ ] Any layout-measuring JS uses a `ResizeObserver` on the element
- [ ] Narrow behaviour is decided per component — wrap, stack, or switch representation
- [ ] A new `position: fixed` panel inside a page body is portalled to `<body>`
- [ ] The toggle test passes at ~940px

## 8. Reference files

- `src/components/layout/dashboard-shell.tsx` — the `<main>` surface
- `src/components/ui/dialog.tsx` — the dialog surface, and the dialog map in use
- `src/components/ui/tabs.tsx` — `TabsList`, on the dialog map because it can be mounted in both
- `src/components/common/responsive-list.tsx` — table/cards at `@3xl/content`
- `src/hooks/use-is-narrow-content.ts` — the same box and width, in JS
- `src/features/admin/use-admin.ts` — `useAdminList()`, which gates the two list queries on it
- `src/components/common/page-header.tsx` — `PageHeader`, the shared header row
- `readme/ui/layout.md`, `readme/ui/components.md` — where this is applied
