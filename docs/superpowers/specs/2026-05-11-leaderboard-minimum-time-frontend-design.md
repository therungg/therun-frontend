# Leaderboard Minimum Time — Frontend Design

**Date:** 2026-05-11
**Status:** Draft — awaiting user review
**Backend reference:** `../../../therun/docs/superpowers/plans/2026-04-22-leaderboard-minimum-time.md` (already implemented server-side)

## Goal

Surface the backend's per-`(gameId, categoryId, subcategoryHash)` minimum-time feature in the frontend so moderators can set, edit, and clear minimums from a dedicated game-management page. Below-minimum runs are flagged ineligible on the backend with retroactive effect; the frontend just needs read/write affordances and result feedback.

## Backend contract (recap)

`/v1/games/:gameId/categories/:categoryId/minimums`

| Method | Body | Returns |
| --- | --- | --- |
| `GET` | — | `{ result: Array<{ subcategoryHash, minTimeMs, minGameTimeMs, setBy, updatedAt }> }` |
| `PUT` | `{ subcategoryHash, minTimeMs, minGameTimeMs }` (at least one of the two must be non-null) | `{ result: { updated: boolean, flagged: number, unflagged: number } }` |
| `DELETE` | `{ subcategoryHash }` | `{ result: { deleted: boolean, unflagged: number } }` |

- Times are in **milliseconds**, both nullable.
- Server permission: `edit-category-settings` on `{ gameId, categoryId }`.
- PUT/DELETE silently re-evaluates `finishedRuns.leaderboardEligible` for affected runs, setting/clearing `ineligibleReason='below_minimum'`. The response counts surface what changed.

## Scope (v1)

In:
- Dedicated `/games-v2/[game]/manage` route, server-gated by the new permission.
- "Minimum Times" section: list / add / edit / delete minimums for the selected category.
- Subcategory hashes decoded into human-readable labels using the category's existing variables (only those with `kind='subcategory'`).
- Toast surfacing `flagged` / `unflagged` counts after writes.
- A "Manage" link in the game header visible only to permitted users.

Out:
- A public-facing chip showing the minimum on the leaderboard view.
- Bulk-apply across multiple subcategories.
- A separate "show ineligible runs" view.
- Future management sections beyond minimum times (the page is structured to allow them, but none are added in this spec).

## Route & data flow

```
/games-v2/[game]/manage
└─ page.tsx                       (server component — auth gate + load)
   └─ manage-page.tsx             (client wrapper, section host)
      └─ minimums-section.tsx     (category picker + table)
         ├─ minimum-row.tsx       (one row, edit/delete buttons)
         └─ minimum-form-modal.tsx (add / edit form)
```

`page.tsx` resolves the game from the slug, calls `confirmPermission(user, 'edit', 'category-settings', { game: game.name })` (throws to 403 page on failure), then loads:

1. The game's categories (already available via `resolveCategory`).
2. The variables for each category (lazy — only the active category's variables are fetched on initial load; switching tabs triggers another fetch).
3. The existing minimum-time rows for the active category.

Switching categories is a client-side action that refetches `(variables, minimums)` for the new category via a server action; the route doesn't need to re-render.

## CASL changes (`src/rbac/ability.ts`)

Use the existing `'edit'` action with a new subject `'category-settings'` (CASL-idiomatic; mirrors how `'edit' + 'leaderboard'` is modeled today). Add to `subjects`:

```ts
'category-settings',
```

Grant in `rolePermissions`:

- `admin` — already gets everything via the `actions × subjects` loop.
- `board-admin`, `board-moderator` — add `can('edit', 'category-settings')` (no game condition; matches their existing leaderboard grant).

Grant in `defaultPermissions` (per-game moderators):

```ts
moderatedGames.forEach((game) => {
    can('edit', 'category-settings', { game });
    // ...existing leaderboard grant
});
```

Page-level check: `confirmPermission(user, 'edit', 'category-settings', { game: game.name })`.

## Lib & types

`types/leaderboard-minimums.types.ts`:

```ts
export interface MinimumTime {
    subcategoryHash: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
    setBy: number | null;
    updatedAt: string;
}

export interface UpsertMinimumTimeResult {
    updated: boolean;
    flagged: number;
    unflagged: number;
}

export interface DeleteMinimumTimeResult {
    deleted: boolean;
    unflagged: number;
}
```

`src/lib/leaderboard-minimums.ts`:

- `listMinimumTimes(sessionId, gameId, categoryId): Promise<MinimumTime[]>`
- `upsertMinimumTime(sessionId, gameId, categoryId, body): Promise<UpsertMinimumTimeResult>`
- `deleteMinimumTime(sessionId, gameId, categoryId, subcategoryHash): Promise<DeleteMinimumTimeResult>`

All three are thin `apiFetch` wrappers. No `'use cache'` — these are mutation-adjacent reads that need to reflect writes immediately.

## Server actions

Two actions, both `'use server'`:

- `upsertMinimumAction({ gameId, categoryId, subcategoryHash, minTimeMs, minGameTimeMs })`
- `deleteMinimumAction({ gameId, categoryId, subcategoryHash })`

Both:
1. Get session.
2. `confirmPermission(user, 'edit', 'category-settings', { game: game.name })` — defense in depth; backend is the source of truth.
3. Call the lib function.
4. Return the backend's `{ flagged, unflagged }` so the client can toast it.
5. `revalidatePath('/games-v2/[game]/manage')` is unnecessary because the client refetches on success; the action returns the updated list inline.

Errors from the backend are propagated as `{ error: string }` shapes following the existing pattern (e.g. `update-tournament.action.ts`).

## UI

### Header
Minimal: game art (48×64, matching the existing `GameHeader`), game display name, "Management" label as a subtitle, and a "← Back to leaderboards" link to `/games-v2/[game]`.

### Minimums section
- **Category picker:** reuse the visual style of `CategoryPills` from the public page but rendered as buttons (no URL nav).
- **Table** columns:
  - **Subcategory** — decoded label from variables with `kind='subcategory'` in the category's variable list. Fallback to `"Default"` when the hash is empty. Fallback to the raw hash if decoding fails (degraded but visible).
  - **Min RT** — render as `<DurationToFormatted duration={minTimeMs / 1000} withMillis />` (helper takes seconds; backend stores ms). Em-dash for null.
  - **Min GT** — same, from `minGameTimeMs`.
  - **Set by** — backend returns `setBy` as a numeric user id only. For v1, render the id as-is with a `title` tooltip explaining "user id"; enrich to username in a follow-up if the backend exposes a join field (`setByUsername`) or we get a batched id→username endpoint. Not a blocker for shipping.
  - **Updated** — relative time.
  - **Actions** — Edit (opens modal) / Delete (confirm dialog).
- **Add button** above the table → opens the form modal with empty values and the subcategory picker enabled.

### Form modal
Fields:
- **Subcategory:** dropdown of `{ hash, label }` derived from the category's subcategory variables, plus a `"Default (empty hash)"` option. Disabled in edit mode (changing the hash would mean delete + insert).
- **Min RT:** text input accepting `[HH:]mm:ss[.SSS]`. Parse via `timeToMillis` from `src/components/util/datetime.tsx` — it already returns milliseconds, which is exactly what the backend wants.
- **Min GT:** same.
- **Validation:** at least one of the two must be filled, both must parse to a non-negative finite number. Reject anything `timeToMillis` returns `NaN` or 0 for an explicitly non-empty input.

Save → server action → on success, toast `"Saved. {flagged} runs newly hidden, {unflagged} restored."` (omit zero counts). On failure, show the backend's `error` message inline.

Delete → confirm dialog → server action → toast `"Removed. {unflagged} runs restored."`.

## Edge cases & notes

- **Subcategory decoding when variables aren't loaded yet** — show the raw hash temporarily; replace once variables resolve. Don't block the table render.
- **Subcategory hash collisions** — backend enforces uniqueness on `(gameId, categoryId, subcategoryHash)`. The modal's submit handler treats a 4xx from the server as "row already exists; switch to edit mode" rather than retry blindly.
- **Long flag-count responses** — the response counts can be large (re-evaluating a category-wide minimum on a popular game). Render counts compactly (`1.2k` etc.) using the existing number formatter.
- **Empty categories** — categories with zero existing minimums still render the table (with the "no minimums yet" empty state) and the Add button.
- **Subcategory variables can change** — if a variable is renamed or deleted after a minimum was set, the saved row's `subcategoryHash` no longer decodes cleanly. Fall back to raw hash and label it `"(unknown subcategory)"` — leaving the row deletable.

## Open questions

None blocking. One nice-to-have: confirm with backend whether they're willing to enrich the GET response with `setByUsername` so we don't have to either show raw ids or add a separate lookup. Not a v1 blocker.

## Follow-ups (explicitly deferred)

1. Public-facing min-time chip on the leaderboard view (`FilterBar` neighbor).
2. Bulk "apply this minimum to all subcategories of this category" action.
3. Ineligible-run inspection view (list runs with `ineligibleReason='below_minimum'`).
4. Additional management sections under `/manage` (run moderation, exclusions, moderator assignment) — the page structure leaves room but they're separate specs.
