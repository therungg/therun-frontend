# Public board mod parity — design

**Date:** 2026-07-31
**Status:** Implemented 2026-07-31 (approach A picked by Joey: extend the existing kebab, reuse console dialogs)

## Goal

A mod/admin can do everything to a board row from the *public* leaderboard
(`games-v2/[game]`) that they can do from the console's BoardCuration view —
without leaving the board they're looking at.

## Current state

The public row kebab (`leaderboard/row-actions-menu.tsx`) already has a
Moderator section gated on `canManage`: **Approve / Remove… / Restore** via
`RunActionDialog` (Remove already collects a categorized reason + notify
mechanism — richer than the console popover; it stays as-is). The console row
cluster additionally has: **Move…**, **Adjust… / Set time…**, **Runner…**
(scoped exclusion: this board / whole game / entire site with treatment
radio, site scope admin-only), and **Mark for later**. Bulk select and
add-runner remain console-only (out of scope, per Joey).

## Design

### Surface

Extend the existing Moderator section of `RowActionsMenu` with four items:

- **Move…** — reuses the console's move flow (`moveRunAction` + category/band
  picker) — same behavior as `row-actions.tsx`'s Move dialog.
- **Adjust time…** (registered users) / **Set time…** (guests) — reuses
  `AdjustDialog` (`manage/boards/adjust-dialog.tsx`) unchanged.
- **Runner…** (only when `entry.userId != null`) — reuses `RunnerDialog`
  (`manage/boards/runner-dialog.tsx`) unchanged, `canSiteBan` gating the
  Entire-site scope.
- **Mark for later** — `markRunsAction(gameSlug, [runId], true)` + success
  toast. The public payload doesn't carry `markedForLater`, so this is a
  one-way "send to the console's marked pile"; no unmark toggle here.

Manual-time entries (`runId == null`) keep the existing behavior: no menu.

### Data flow

Public rows are `LeaderboardEntry`; the console dialogs take
`LeaderboardRosterRow` + board context. Two pieces close the gap:

1. **Row adapter** (pure function, unit-tested): `LeaderboardEntry` →
   `LeaderboardRosterRow` — runId, userId, runnerName, time/gameTime,
   verificationStatus, vodUrl, `endedAt` from `runDate`, `subcategoryKey`
   built from `entry.variables` + `subcategoryDefKeys` (the menu already
   computes this for the claim link), entry flags set true.
2. **Lazy mod board context.** The dialogs need `ResolvedCategory` (id,
   primaryTiming, sortAscending), the featured category list (Move targets),
   and subcategory `VariableRow[]`. Don't fatten the public payload for
   every visitor: a mod-gated server action
   (`loadModBoardContextAction(gameSlug)`) returns
   `{ categories: ResolvedCategory[]; variables: VariableRow[] }`, fetched
   once per page on first open of Move/Adjust/Runner and cached in state.
   The row's own category resolves by matching `categorySlug`; a row's
   subcategory key comes from the adapter.

`canSiteBan` = `ability.can('moderate', 'admins')`, computed where the page
already computes `canManage`/`canManageRuns`, threaded
game-page → `LeaderboardPager` → `LeaderboardRow` → `RowActionsMenu`
(optional prop, default false).

`onMutated` = `router.refresh()` — same convention as the existing Approve/
Remove items. The server actions already revalidate what they revalidate;
the public board reflects the change on refresh.

### Component reshaping

`AdjustDialog` and `RunnerDialog` are imported as-is from `manage/boards/`.
The console's Move dialog currently lives *inside* `row-actions.tsx`
(state + JSX inline). Extract it to `manage/boards/move-dialog.tsx` with the
same props shape as its siblings (`row`, `category`, `categories`,
`variables`, `gameSlug`, `subcategoryKey`, `onMutated`), and have the console
`RowActions` consume the extraction — one Move implementation, two mounts.

### Error handling

Same conventions as the surrounding code: server-action `{ error }` results
→ `toast.error`; dialogs stay open on failure; context-load failure surfaces
a toast and the menu item stays usable (retry on next open).

### Testing

- Adapter unit tests (guest, variables → subcategoryKey, manual-time null).
- `RowActionsMenu` component tests: mod items render only with `canManage`;
  Runner… hidden for guests; Entire-site scope appears only with
  `canSiteBan`; Mark for later fires `markRunsAction` and toasts; Move/
  Adjust/Runner open with context loaded via the mocked action.
- Console `row-actions` suite keeps passing after the Move extraction.

## Out of scope

Bulk select / selection bar on the public board; add-runner row; the
console's pinned next-run-slip remove flow (public Remove keeps its existing
dialog); unmark-from-public; showing marked/moved badges on public rows
(payload unchanged).
