# Category Config Fields — Design Spec

**Date:** 2026-05-20
**Status:** Proposed

## Goal

Surface five category-level config fields that the backend already supports on `PUT /v1/games/:gameId/categories/:catId` but the frontend doesn't edit, and display category rules on the public game-page leaderboard.

Fields: `rules`, `sortAscending`, `showMilliseconds`, `requireVideo`, `requireVideoTopN`.

## Scope

In scope:

- Manage UI to edit all five fields, scoped to the selected category on `/games-v2/[game]/manage` → Category tab.
- Public-page rendering of `rules` as a collapsible Markdown panel above the leaderboard table.
- One server action that PUTs the changed subset to the backend.
- Cache revalidation for the affected game page.

Out of scope:

- Game-level timing flags (`forceRealTime`, game-level `hideRealTime`, `hideGameTime`).
- Audit-log viewing UI.
- User leaderboard rankings on profile.
- Combined-view toggle and per-row variable badges.
- SEO/RSS/Markdown-export surfaces for rules.

## Manage UI

### Layout

Two new sections on the category-tab, inserted between `TimingSettingsSection` and `VariablesSection`:

```
CategoryHeaderStrip          ← existing
TimingSettingsSection        ← existing
RulesSection                 ← NEW
CategorySettingsSection      ← NEW
VariablesSection             ← existing
CombinationsSection          ← existing
MinimumsSection              ← existing
```

### `RulesSection`

A card containing a Markdown editor for the category's `rules` field.

- Tab-style switcher between **Edit** (raw textarea) and **Preview** (rendered Markdown).
- Save and Reset buttons. Same dirty-tracking pattern as `TimingSettingsSection`.
- On save: server action with `{ rules }` only. On success, toast `"Rules saved"`.
- Hydrates from the `category.rules` prop (no separate load action).
- Empty input is allowed (clears rules).

### `CategorySettingsSection`

A single card with the four small fields, plus shared Save and Reset.

| Control | Field(s) | Type | Notes |
|---|---|---|---|
| Ranking direction | `sortAscending` | Radio (2 options) | "Lower time = better (default)" / "Higher value = better". |
| Show milliseconds | `showMilliseconds` | Checkbox | Display precision toggle. |
| Video requirement | `requireVideo` + `requireVideoTopN` | Tristate radio | See below. |

Video requirement maps to backend fields as follows:

| Radio option | `requireVideo` | `requireVideoTopN` |
|---|---|---|
| No video required | `false` | `null` |
| Video required for top **N** runs | `true` | `N` (positive integer ≥ 1) |
| Video required for all runs | `true` | `null` |

The `N` input renders inline beside its radio option. It is disabled unless that radio is selected. Form-level validation blocks save when "top N" is selected but N is missing or `< 1`.

Same dirty-tracking, Save and Reset pattern as `TimingSettingsSection`. The save action sends only the fields that changed.

## Public Rules Panel

A new client component `RulesPanel`, mounted on the game page between the category pills and the leaderboard table.

- Renders only when `selectedCategory.rules` is a non-empty string.
- Collapsed by default. Header row contains the label *"Rules"*, a chevron, and (when collapsed) a one-line plain-text excerpt of the first 80 characters of the rules. Click anywhere on the header toggles open/closed.
- Expanded body renders Markdown via `react-markdown` with `remark-gfm`.
- Local state only — no URL param. State resets to "collapsed" when the selected category changes.
- Mobile: full-width, same component.

### Sanitization

`react-markdown` does not render raw HTML by default. `rehype-raw` is **not** enabled. No XSS risk from rules text.

## Data layer

### Type changes (`types/leaderboards.types.ts`)

Extend `ResolvedCategory`:

```ts
export interface ResolvedCategory {
    // existing fields …
    rules?: string | null;
    sortAscending?: boolean;          // already exists
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
}
```

### Lib mapping (`src/lib/games-v1.ts`)

`CategoriesEndpointRow` already includes `sort_ascending`. Extend the row interface and the `.map(...)` body to also read:

- `rules: string | null`
- `show_milliseconds: boolean`
- `require_video: boolean`
- `require_video_top_n: number | null`

Default fallbacks match backend defaults: `sortAscending = true`, `showMilliseconds = true`, `requireVideo = false`, `requireVideoTopN = null`, `rules = null`.

### Server action

`app/(new-layout)/games-v2/[game]/manage/category-tab/actions/update-category-settings.action.ts`:

```ts
interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    rules?: string | null;
    sortAscending?: boolean;
    showMilliseconds?: boolean;
    requireVideo?: boolean;
    requireVideoTopN?: number | null;
}

type Output = { result: { updated: true } } | { error: string };
```

- Session check + permission check (`edit-category-settings`, mirroring `update-timing-settings.action.ts`).
- Calls `PUT /v1/games/:gameId/categories/:categoryId` via `apiFetch`, sending only the keys the caller passed.
- On success, `revalidateTag('game-cats:' + gameId, 'minutes')` so the next read of `resolveCategory` pulls the updated row (this is the tag used in `src/lib/games-v1.ts`; profile must match its `cacheLife('minutes')`).
- Errors from the API (400/403/404) propagate as `{ error }`.

### Cache notes

- Rules and `showMilliseconds` are display-only. Revalidating the game-page tags is sufficient.
- `sortAscending` affects backend leaderboard ordering. The backend handles its own Redis invalidation on `PUT /categories/:catId`. If staleness is observed, fall back to the existing "Invalidate Cache" button on the game-tab.
- `requireVideo` / `requireVideoTopN` are submit-time policies; no read-path cache to clear.

## Files

### Create

- `app/(new-layout)/games-v2/[game]/manage/category-tab/rules-section.tsx`
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-settings-section.tsx`
- `app/(new-layout)/games-v2/[game]/manage/category-tab/actions/update-category-settings.action.ts`
- `app/(new-layout)/games-v2/[game]/rules/rules-panel.tsx`

### Modify

- `types/leaderboards.types.ts` — extend `ResolvedCategory`.
- `src/lib/games-v1.ts` — map the new API row fields.
- `app/(new-layout)/games-v2/[game]/manage/category-tab/category-tab.tsx` — mount the two new sections.
- `app/(new-layout)/games-v2/[game]/game-page.tsx` — mount `RulesPanel` above the leaderboard table.
- `package.json` — add `react-markdown` and `remark-gfm`.

## Dependencies

New runtime deps:

- `react-markdown`
- `remark-gfm`

No new dev deps.

## Permissions

Same gate as the existing timing settings: `edit-category-settings`. Series-mod, game-mod, category-mod (on this category), game-admin, series-admin, and global-admin all qualify. The action enforces this server-side; the manage page already gates entry on `canManage`, so no separate client-side check is needed for the new sections.

## Verification

Per project convention (no test framework):

- `npm run typecheck`
- `npm run lint`

End-to-end manual checks:

- Save Markdown rules with bold, italics, list, link, code block. Confirm rendered Markdown on the public page.
- Toggle `sortAscending`, `showMilliseconds`. Reload, confirm persistence.
- Cycle through the three video-requirement radios. Confirm the `N` input enables only for "top N" and that save blocks on invalid N.
- Confirm dirty-tracking on both new sections (Save/Reset disabled until a change is made).
- Confirm `RulesPanel` does not render when rules is null or empty.
- Confirm `RulesPanel` collapses by default and resets to collapsed when switching categories.
- Mobile layout sanity check.
- Confirm the existing timing/variables/combinations/minimums sections still load and save.
