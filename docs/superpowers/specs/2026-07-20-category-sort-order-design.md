# Category sort order — moderator reorder + public honoring

**Date:** 2026-07-20
**Status:** Approved design (Joey, in-session), pending implementation
**Branch:** `category-sort-order` (stacked on `category-overview-landing`)

## Goal

Moderators can reorder categories; the public pill band and overview card
grid honor that order. Frontend-only — the backend `categories.sort_order`
column, the category PUT accepting `sortOrder`, and `pageData` carrying it
per category all exist already.

## Ordering semantics

- `sortOrder <= 0` means **unset** (backend default is 0). Unset sorts
  **after** all explicitly-ordered categories, tiebroken by playtime
  descending (today's behavior). Consequences:
  - Games where no mod ever reordered keep exactly today's playtime order.
  - A category created after a reorder (sortOrder 0) appends at the end
    instead of jumping to the front.
- Explicit order is scoped **within a group section** (ungrouped = its own
  scope): public display slots categories into group sections, so ordering
  only ever matters within a section. Any console move rewrites `sortOrder`
  to `1..N` across the moved row's whole scope, so partial orders can't
  arise within a scope after the first move.
- Public sort within each section: `sortOrder` ascending (0 → Infinity
  sentinel), then playtime descending.

## 1. Data plumbing

- `ResolvedCategory` gains `sortOrder: number` (0 when absent).
  `games-v1.ts`: `PageDataCategoryFlags` gains `sortOrder?: number | null`;
  both flag-map sites store it; category mapping emits it. (`pageData`'s
  `ungroupedCategories[]`/`groups[].categories[]` already serve it —
  `rebuildGamePageData` includes `sortOrder` per category.)
- `UpdateCategoryBody` (`src/lib/category-mgmt.ts`) gains
  `sortOrder?: number` (backend PUT already accepts it).
- `updateVisibilityAction` — not touched; a new
  `reorderCategoriesAction` (manage/game-tab/actions/) takes
  `{ gameSlug, gameId, changes: { categoryId, sortOrder }[] }`, permission
  `edit category-settings`, issues one `updateCategory` per change
  (diffs only — unchanged rows aren't PUT), then
  `revalidateTag('game-cats:{id}', 'minutes')` once. Partial failure:
  report error, caller reverts optimistic state (same contract as
  `reorderGroupsAction`).

## 2. Shared sort helper

New plain module `app/(new-layout)/games-v2/[game]/category-sort.ts`
(+ colocated test):

```typescript
sortCategoriesForDisplay(categories: ResolvedCategory[]): ResolvedCategory[]
```

Sorts by `(sortOrder <= 0 ? Infinity : sortOrder)` asc, then
`totalRunTime` desc. Consumers replace their local playtime sorts:

- `header/category-visibility.ts` (`byPlaytimeDesc` uses the helper for
  both the trivial list and per-section pill ordering).
- `overview/overview-page.tsx` `sectionize` (which currently relies on the
  API's `sort=-total_run_time` order — this makes the ordering explicit,
  fixing a deferred finding from the overview branch's final review).

## 3. Console reorder UI

In `manage/game-tab/categories-table.tsx`, mirror the groups-section
pattern (drag handle `⠿` + up/down arrow buttons, optimistic reorder,
revert-on-error toast):

- Reordering is enabled on **Featured rows only** and moves the row
  **within its Featured group scope** (Featured rows sharing `groupId`,
  or all Featured ungrouped rows). Rationale: the categories table is a
  flat list sorted Featured-first, and public order only exists for
  Featured categories; renumbering only Featured rows keeps the persisted
  order aligned with what's visible, and a later-featured category simply
  appends via the sortOrder-0 sentinel. Non-Featured rows show no reorder
  controls (title: "Feature a category to order it"). Drops/moves across
  groups are ignored — group membership is changed by the existing group
  control, not by drag.
- On any move: recompute the scope's rows in new order, assign `1..N`,
  diff against previous `sortOrder`s, call `reorderCategoriesAction` with
  only the changed rows.
- Rows show their current effective position implicitly by table order;
  the table's default sort switches to the same
  the public ordering (Featured block first, then group rank with
  ungrouped trailing, then `sortOrder` sentinel, then playtime) so the
  console's Featured block reads top-to-bottom like the public page.
  Reorder controls are enabled ONLY when the search query is empty and the
  status filter is not "Archived" — a move over a filtered list would
  silently renumber hidden rows. (Featured rows are all visible under
  "All" and "Current"; archived rows are outside the public scope.) The
  disabled state carries a title explaining why ("Clear the search to
  reorder").

## 4. Non-goals

- No backend changes (bulk category-reorder endpoint stays a wishlist item
  if N-PUT reorders ever feel slow; N is small and only diffs are sent).
- No wizard (`setup/step-categories`) reordering — curation there stays
  playtime-ordered.
- No cross-group drag.

## 5. Testing

- `category-sort.test.ts`: unset-last sentinel, explicit order wins over
  playtime, all-unset preserves playtime order, mixed scopes.
- `category-visibility.test.ts`: section ordering follows sortOrder with
  playtime tiebreak (update existing fixtures/expectations).
- Console: reorder-diff computation extracted as a pure function
  (`computeReorderChanges(scopeRows, fromId, toIndex)` or equivalent) with
  unit tests: assigns 1..N, returns only changed rows.
- Suite green; typecheck at baseline; browser pass for drag feel.
