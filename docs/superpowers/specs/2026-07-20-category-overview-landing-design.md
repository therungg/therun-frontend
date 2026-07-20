# Category-overview landing + main-only visibility policy

**Date:** 2026-07-20
**Status:** Approved design (Joey, in-session), pending implementation
**Branch:** `category-overview-landing` (stacked on `leaderboard-header-redesign`)

## Goal

1. The root game URL (`/games-v2/[game]`, no `?category`) becomes a
   **category overview**: one card per Featured category showing its WR
   (time, holder, flag, date) and stats; clicking a card opens the existing
   board page (`?category=slug`).
2. A site-wide **visibility policy** for games-v2 public views: only
   Featured (`isMain`) categories are publicly listed or viewable.
   Archived categories are invisible everywhere (unchanged). Joey's ruling:
   "anything not main is not shown, period; leaderboards only show main."
3. The `active` flag is renamed to `archived` end-to-end (backend handoff;
   frontend ships a normalization shim so deploy order doesn't matter).

## Non-goals

- No path-segment URL migration (`/[game]/[category]` stays a future idea;
  `?category=` remains the board URL).
- No backend batch-WR endpoint (N parallel cached fetches suffice;
  endpoint noted as a wishlist item if latency ever shows).
- No changes to the board page itself beyond the pill-band policy change.
- No manage-console behavior changes (console continues to see all
  categories); copy audit only.

## 1. Visibility policy

Public games-v2 surfaces list **Featured categories only**:

- **Overview cards**: Featured only.
- **Board-page pill band**: Featured only. In
  `header/category-visibility.ts` the top-5-playtime fallback (for games
  with zero Featured) and the "More…" overflow of non-Featured categories
  are **removed**. `overflow` always returns `[]` (keep the field so the
  pills component API is stable, or remove it and its consumer rendering —
  implementer's choice, but no non-Featured category may be reachable from
  the band). The selected-category append stays but is effectively inert
  (non-Featured can't be selected anymore).
- **Deep links**: `?category=` naming a category that is missing,
  non-Featured, or archived → **redirect to the game root** (overview) via
  `redirect()` in `page.tsx`. Shared links degrade gracefully; no 404.
- **Submit form** (`submit/page.tsx`): category picker offers Featured
  categories only (currently filters `active !== false`; now also
  `isMain`). Games whose submit context (`?category=` prefill) names a
  non-Featured category fall back to no preselection. Mods can still
  attach runs to any category through the console.
- **Run/manual detail pages, profiles**: unchanged — existing runs in
  non-Featured categories stay visible on those surfaces; only board
  listing/viewing is restricted.

## 2. `active` → `archived` rename

**Backend (Joey's lane — handoff, not this branch):** migration renaming
`categories.active` (default true) to `archived` (default false, inverted
value); API responses serve `archived`. During transition the API serves
**both** fields.

**Frontend (this branch):** normalize once at the fetch edge in
`src/lib/games-v1.ts` where `CategoriesEndpointRow` is mapped:

```
archived = row.archived ?? !(row.active ?? true)
```

`ResolvedCategory` gains `archived: boolean` and drops `active` (all
frontend consumers switch to `archived`; grep-verified sweep). The shim
makes the frontend correct before and after the backend deploy.

**Console copy audit:** manage/setup UI says "Featured" and "Archived"
consistently (per the existing convention memory); any surviving "active"
copy in games-v2 UI text is updated. API field names in request bodies
stay as-is until the backend renames them.

## 3. Routing & render decision

No new route. `page.tsx` at `/games-v2/[game]` decides:

1. Resolve game + categories (existing loaders). Let `featured` = resolved
   categories where `!archived && isMain`.
2. `?category` present:
   - resolves to a Featured category → board page (exactly today's flow).
   - anything else → `redirect(`/games-v2/${slug}`)`.
3. No `?category`:
   - `featured.length === 1` → render that category's board directly
     (an overview of one card is noise).
   - `featured.length === 0` → overview shell with empty state: "No
     leaderboards configured yet" + the existing `ClaimCta` /
     manage-or-setup CTA. This deliberately pushes unclaimed/unconfigured
     games toward moderation setup.
   - otherwise → overview.

## 4. Overview page

Same `GameHero` header and sidebar rail as the board page; the main column
swaps the pills/filters/table for a card grid.

- **Grid**: Featured categories in group order (`ResolvedGroup.sortOrder`,
  grouped cards under a small group label) then ungrouped; within a
  section, category `sortOrder`-equivalent = playtime-desc (matches the
  pill band's ordering convention).
- **Card contents**:
  - Category display name.
  - WR of the category's **default board** — the exact board clicking the
    card lands on: `getLeaderboard({ gameSlug, categorySlug, subcategoryValues: {},
    combined: false, verified: false, page: 1, pageSize: 1, timing: primaryTiming })`,
    fetched for all cards in parallel inside the overview loader (each call
    is `'use cache'`d, shared with the board page's own page-1 cache
    entries only when page sizes match — they won't, so these are separate
    small cache entries; acceptable).
  - WR line: time (`DurationToFormatted`, `withMillis` per category
    `showMilliseconds`), holder `UserLink`, `CountryFlag`, relative date.
  - Honesty rule: a rank-1 whose `verificationStatus === 'pending'` shows
    the time labeled "fastest time" styling-wise without any WR/record
    claim (mirror of the table chip rule).
  - Stats line from `ResolvedCategory` (no new fetches): runners,
    attempts.
  - Empty board: "No runs yet — set the first record" linking to the
    submit form with that category preselected.
- **Card click**: whole card links to `buildBoardHref(gameSlug, { categorySlug })`.
  WR holder / submit links inside the card sit above the stretched link
  (same pattern as `leaderboard-row.tsx`).
- **Loader**: new `loadGameOverviewData(slug)` in `data.ts` (or sibling
  file) reusing `resolveGame`, `resolveCategory`, `getQuickStats`,
  `getGameMetadata`, `getRecentPbs`, rankings — everything the sidebar and
  hero need — plus the N parallel WR fetches (`.catch(() => null)` per
  card; a failed WR fetch renders the card without a WR line, never sinks
  the page).
- **Styling**: flat cards consistent with the new header vocabulary —
  hairline borders, tokens/mixins only, no glass/blur/gradients.

## 5. Testing

- Unit tests (Vitest, colocated):
  - `archived` normalization shim (both-fields, old-only, new-only rows).
  - Featured filter + render decision (overview vs single-board vs empty
    vs redirect) as a pure function `decideGameRootView(categories, categoryParam)`.
  - `computeCategoryVisibility` updated tests: fallback/overflow removal.
- `npm run typecheck` (no new errors vs baseline), `npm run lint`,
  `npm run test` green.
- Browser pass (Joey): card grid at mobile widths, WR-pending card
  presentation, redirect behavior from an old non-Featured link, sidebar
  coherence on overview.

## Backend handoffs (Joey)

1. `categories.active` → `archived` migration + API field (serve both
   during transition), then drop `active`.
2. Wishlist: batch endpoint returning rank-1 entry per category for a game
   (replaces N page-1 fetches if overview latency shows).
3. Reminder from previous branch: IGDB backfill + `rebuildGamePageData`
   still pending — overview cards inherit the same header-data reality.
