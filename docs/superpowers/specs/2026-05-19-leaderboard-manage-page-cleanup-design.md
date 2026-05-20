# Leaderboard Manage Page Cleanup — Design

**Date:** 2026-05-19
**Branch:** feat/leaderboard-run-management
**Surface:** `/games-v2/[game]/manage`

## Problem

The current `/games-v2/[game]/manage` page mixes game-level settings (identifiers) and category-level settings (visibility, timing, variables, combinations, minimums) into a single scroll, separated only by a row of category-picker buttons. Three issues:

1. No visual signal that everything below the button row changes when you switch category — looks like one form, behaves like five.
2. Category visibility (active / main) is editable in two places: the per-category Visibility section on this page, AND a separate `/manage/categories` sub-page. Two sources of truth.
3. No clear framing of "this is the game" vs "this is one category". Admins have to infer scope from context.

## Goal

Reorganize the page so game-level and category-level management are visually and structurally separate, with a single source of truth for each setting.

## Architecture

One page, two tabs. Tab state syncs to the URL so deep links and back-button work.

```
/games-v2/[game]/manage?tab=game
/games-v2/[game]/manage?tab=category&categoryId=42
```

Default tab: `game`. Default `categoryId` on category tab: first active category (or first category if none active).

Shared header above tabs:
- Game image (3:4, 48×64)
- "Management" eyebrow + game display name
- Right side: "← Back to leaderboards" link

Tab strip directly under header.

## Tab 1: Game

Vertical single-column stack. All settings on this tab apply to the game as a whole — nothing on this tab changes when the admin picks a category.

### Sections (in order)

1. **Identifiers** — existing `IdentifiersSection` (slug, abbreviation). No change.
2. **Game details** *(new)* — edit display name + image. Backend dependency: `PUT /v1/games/:id` must accept `display` and `image` fields. If backend does not yet support, this section is omitted from the first cut and tracked as a follow-up; the rest of the cleanup ships without it.
3. **Cache** — invalidate-cache button, moved here from `header/invalidate-cache-button.tsx` in the game header. Game header keeps the "Manage" link, drops the standalone invalidate button.
4. **Categories overview** — absorbs the entire `/manage/categories` sub-page.
   - Filter chips: All / Active / Archived (existing)
   - Search input (new, client-side filter on display name + group name)
   - Table columns: Category, Group, Main (checkbox), Active (checkbox), Edit
   - "Edit" column: link rendered as `→` that switches to `?tab=category&categoryId={id}`
   - Tip text from current sub-page is retained at bottom of section

The `/games-v2/[game]/manage/categories` route is removed; any inbound link redirects to `/manage?tab=game`. The `categories-page.tsx` and its `page.tsx` are deleted.

## Tab 2: Category

Two-column layout. Left rail picks one category. Right pane shows settings scoped to that one category.

### Left rail (~280px, sticky on desktop, collapses above content on mobile)

- Search input ("Filter categories…") — client-side filter on display + group name
- Vertical scrollable list. Each row:
  - Category display name
  - Group name as small subtitle (or "—" if ungrouped)
  - Right-side badges: "Main" (if `isMain`), "Archived" (if `!active`)
- Selected row highlighted (`btn-primary`-equivalent treatment)
- Client-side pagination, 25 per page, prev/next controls at the bottom of the rail. Only renders when filtered list > 25.

### Right pane

Top of pane — category header strip:
- `<h2>` with category display
- Inline badges: Main / Archived (status, read-only)
- Quick-actions row: **Active** toggle, **Main** toggle (these replace the existing standalone `VisibilitySection` — single source of truth alongside the bulk table on the Game tab)

Sections below, each with a clear subheading and short description:

1. **Timing** — existing `TimingSettingsSection`
2. **Variables** — existing `VariablesSection`
3. **Variable combinations** — existing `CombinationsSection`
4. **Minimum times** — existing `MinimumsSection`

The standalone `VisibilitySection` is removed from this tab; its two controls (active, isMain) move into the quick-actions row in the category header strip.

## Data flow

Server load (`page.tsx`):
- Resolve game (existing)
- Permission check (existing)
- Load all categories via existing `resolveCategory(game.id)` — no server-side pagination; categories all-at-once as today
- Read `?tab` and `?categoryId` from `searchParams`
- Determine initial selected category: `categoryId` if valid, else first active, else first, else null
- Preload identifiers, variables, minimums for the initial category (existing pattern)
- Preload `ManageCategoryRow[]` for the Game tab table (existing `listManageCategoryRows` from `category-mgmt`)

Client (`manage-page.tsx`):
- Tab state and `selectedCategoryId` mirrored to URL via `useRouter().replace(...)` with `scroll: false`
- Switching category in the rail does NOT trigger a server navigation; it triggers the existing per-section refetches (variables/minimums) the same way today's button-row picker does
- Switching tab does not refetch — both tabs are mounted; non-active tab is hidden via CSS to preserve form state. (Trade-off: small initial payload increase, but avoids losing in-progress edits on tab switch.)

## Empty states

- **No categories at all** — Game tab still shows Identifiers, Game details, Cache, and an empty Categories overview with a "No categories yet" message. Category tab shows "No categories to edit yet. Add one from the Game tab." with no rail.
- **Search returns nothing** — left rail (Category tab) and table (Game tab) each show "No matches" with a clear-search button.

## Permissions

No change. Page-level `confirmPermission(user, 'edit', 'category-settings', { game })` already gates the route.

## Files touched

**Modified:**
- `app/(new-layout)/games-v2/[game]/manage/page.tsx` — read `searchParams` for `tab` and `categoryId`; preload `ManageCategoryRow[]` for the Game tab
- `app/(new-layout)/games-v2/[game]/manage/manage-page.tsx` — split into tab shell + two tab panels; URL sync; remove embedded `VisibilitySection` and button-row picker
- `app/(new-layout)/games-v2/[game]/manage/types.ts` — add `initialRows: ManageCategoryRow[]`, `initialTab`, `initialCategoryIdFromUrl`
- `app/(new-layout)/games-v2/[game]/header/game-header.tsx` — drop the invalidate-cache button; keep the Manage link

**New:**
- `app/(new-layout)/games-v2/[game]/manage/game-tab/game-tab.tsx`
- `app/(new-layout)/games-v2/[game]/manage/game-tab/categories-table.tsx` (search + filter + table, replacing the old quick-manage page)
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx`
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-rail.tsx` (search + paginated list)
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-header-strip.tsx` (title + Active/Main quick toggles, absorbs `VisibilitySection`)

**Deleted:**
- `app/(new-layout)/games-v2/[game]/manage/categories/page.tsx`
- `app/(new-layout)/games-v2/[game]/manage/categories/categories-page.tsx`
- `app/(new-layout)/games-v2/[game]/manage/visibility/visibility-section.tsx` (controls move into `category-header-strip`; the underlying `updateVisibilityAction` is kept and reused)

**Moved:**
- `app/(new-layout)/games-v2/[game]/header/invalidate-cache-button.tsx` → `app/(new-layout)/games-v2/[game]/manage/game-tab/invalidate-cache-section.tsx` (or kept in place and imported by the Game tab — pick at implementation time)

## Out of scope

- Server-side pagination for categories (current load-all pattern is preserved; pagination is purely client-side in the rail)
- Group management (creating/renaming/reordering category groups)
- Bulk operations beyond active/main toggles (e.g., bulk archive)
- Sortable rows / drag-to-reorder

## Open questions

- **Game details editability** — does `PUT /v1/games/:id` accept `display` and `image`? If not, section 2 of the Game tab is dropped from this scope and tracked separately. To be verified during implementation, before writing the section.

---

## Implementation status

Implemented 2026-05-19 on branch `feat/leaderboard-run-management`. Game-tab "Game details" section deferred — backend `PUT /v1/games/:id` is only wired in the frontend for `slug`/`abbreviation`; editing `display`/`image` from the manage page is a follow-up.
