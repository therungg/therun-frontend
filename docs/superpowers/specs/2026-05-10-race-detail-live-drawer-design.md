# Race detail page — live drawer + per-split totals

## Overview

Surface live split data and commentary on race detail pages by reusing the
existing `CommentaryDrawer` from the `/live` page. Clicking a participant who
is submitting live data opens the drawer focused on that runner. The Run tab's
per-split section is enhanced to show cumulative split time and segment time
alongside the existing delta bar.

## Goals

- A viewer on a race page can click any participant with live data and see the
  same Split / Run / Predictions / Story / Career analysis available on
  `/live`.
- The per-split rows in the Run tab show three numbers per row: total time,
  segment time, delta vs PB (existing).
- No data preloading for un-clicked participants — the page stays cheap to
  render and only pulls full `LiveRun` data on demand.
- The existing click-to-swap-stream behavior on race detail is preserved.

## Non-goals

- No new drawer tabs.
- No splits-list panel outside the drawer.
- No changes to the `/live` page.
- No stale-detection / auto-swap behavior (that's a `/live` concept; race
  detail is not a "watch one runner" surface).
- No gating: drawer is open to everyone, regardless of patron / admin status.

## Architecture

Two changes:

1. **Race detail wires up the existing `CommentaryDrawer`** via a new host
   component that owns the `LiveDataMap` and a websocket subscription scoped
   to the race's participants.
2. **The Run tab's per-split rows are extended** to include split total time
   and segment time alongside the existing delta bar.

No refactor of the drawer itself, no changes to `/live`.

### Race-side host

`app/(new-layout)/races/[race]/race-commentary-drawer-host.tsx` — new file.

State:

- `liveDataMap: LiveDataMap` — full `LiveRun` objects keyed by username.
  Starts empty; populated lazily.
- `currentlyViewing: string` — the runner the drawer should focus on.
- `manualSelectionTick: number` — bumped each time the user clicks a
  participant. Drives the existing `lastManualTickRef` re-lock logic in
  `CommentaryDrawer`.

Subscribes to `useLiveRunsWebsocket()`. On each message:

- Filter: only act if `lastMessage.user` is one of the race's
  `participants[].user` AND already a key in `liveDataMap`. We don't preload
  runners we haven't focused; ignore others.
- `UPDATE`: replace `liveDataMap[user]`.
- `DELETE`: remove. The drawer's existing "Run ended" empty state handles the
  display.

Exposes a `focusUser(user)` callback. When called:

1. If `liveDataMap[user]` is missing or `isMinified`, fetch via
   `getLiveRunForUser(user)` from `~src/lib/live-runs`. Store in the map.
2. Set `currentlyViewing = user`.
3. Bump `manualSelectionTick`.
4. Open the drawer via the `CommentaryDrawerProvider` context
   (`ctx.setOpen(true)`).

While the fetch is in flight, the drawer renders its own loading state
(`<>Loading live data...</>` — already present).

Renders `<CommentaryDrawer liveDataMap={...} currentlyViewing={...}
manualSelectionTick={...} />`.

### Race detail integration

`app/(new-layout)/races/[race]/race-view.tsx`:

- Wrap the rendered tree in `<CommentaryDrawerProvider>`.
- Mount `<RaceCommentaryDrawerHost race={raceState} />` once, alongside the
  existing `<RaceStream>` etc.
- Hold a callback ref or context to expose `focusUser` to the participant
  detail.

`app/(new-layout)/races/[race]/race-participant-detail.tsx`:

- Replace the inline `setStream` click with a `onParticipantClick(user,
  isStreaming, hasLiveData)` prop.
- Add the same "clickable" visual cue (`participantCardStreaming`) to
  participants with `liveData` even when not streaming, so users understand
  what's clickable.

The page-level click handler (in `RaceDetail`):

```ts
const handleParticipantClick = (user, isStreaming, hasLiveData) => {
  if (isStreaming) setStream(user);
  if (hasLiveData) host.focusUser(user);
};
```

### Click semantics

| Participant state | Click does |
|---|---|
| Streaming + has liveData | swap stream + focus drawer (open if closed) |
| Has liveData, not streaming | focus drawer (open if closed) |
| Streaming, no liveData | swap stream only (existing) |
| Neither | nothing |

## Data flow

**Initial load.** `RaceDetail` server-renders with the existing slim
`RaceLiveData` per participant. Host starts with an empty `LiveDataMap` — no
full-LiveRun fetches at load time.

**On click.** The page handler calls `setStream` (if streaming) and
`host.focusUser` (if has liveData). The host fetches the full `LiveRun` if
needed, updates state, opens the drawer.

**Live updates.** `useLiveRunsWebsocket()` messages are filtered to runners
already in `liveDataMap`, then merged in. The drawer's existing pin / lock /
"new run started" banner / `pendingNewRun` flow handles snapshot freezing as
designed.

**Race finished.** liveData is gone from API. The host's map keeps the last
snapshot per runner. Drawer can still be opened and shows the last-known
state.

## Run tab — per-split row enhancement

`src/components/live/commentary-drawer/tabs/run-tab.tsx`:

The "Per-split (single time vs PB)" section currently renders one `DeltaBar`
per completed split. Change: each row gains two columns — cumulative split
time and single segment time — to the left of the existing bar + delta value.

Row layout (visual mock, monospace):

```
Boss 4              1:42.305   0:18.221   [====▸  ]  -1.4
Boss 5 (active)         —           —     [center ]    —
```

Columns:

1. Name (truncated, `flex: 1`)
2. Cumulative split time (`splitTime`) — `formatTimeMs`
3. Segment time (`splitTime - prev splitTime`, computed as today) —
   `formatTimeMs`
4. Existing delta bar (visual)
5. Existing delta value (signed, gold-aware)

For rows where `splitTime` is null (skipped, or no PB to compare), columns 2/3
render `—`. Active / future split rows likewise show `—` for total/single.

Implementation: extend `DeltaBar` to accept `totalMs` and `segmentMs` props
(both optional), or wrap `DeltaBar` in a row that adds the columns. Either is
fine; pick whichever keeps the file readable. The styling additions live in
`commentary-drawer.module.scss` next to the existing `deltaBar*` classes.

Gold + active styling preserved exactly as today.

## Files touched

| File | Change |
|---|---|
| `app/(new-layout)/races/[race]/race-commentary-drawer-host.tsx` | **New.** Owns `LiveDataMap`, `currentlyViewing`, `manualSelectionTick`; websocket subscription filtered to race participants; exposes `focusUser`; renders `<CommentaryDrawer>`. |
| `app/(new-layout)/races/[race]/race-view.tsx` | Wrap in `<CommentaryDrawerProvider>`; mount the host; pass `focusUser` down to `RaceParticipantDetail`. |
| `app/(new-layout)/races/[race]/race-participant-detail.tsx` | Replace inline `setStream` with `onParticipantClick(user, isStreaming, hasLiveData)`. Extend "clickable" visual cue to participants with `liveData` even when not streaming. |
| `src/components/live/commentary-drawer/tabs/run-tab.tsx` | Add total + segment time columns to per-split rows. |
| `src/components/live/commentary-drawer/commentary-drawer.module.scss` | New row classes for the wider per-split layout. |

## Edge cases

- **Click while drawer open on a different runner.** `currentlyViewing`
  changes and `manualSelectionTick` bumps. Existing `lastManualTickRef` logic
  re-locks to the new runner. Pinned drawer stays on the pinned user — same as
  `/live`.
- **Click a participant with no liveData.** Handler still runs `setStream` if
  streaming; drawer is not opened or focused.
- **First click while no liveData has been fetched yet.** Drawer opens; shows
  `Loading live data...` (existing behavior); resolves into the loaded run.
- **Runner finishes / resets mid-race.** Drawer's existing `pendingNewRun`
  banner + `Run ended` empty state handles it. Race detail does not implement
  the `/live` countdown / auto-swap.
- **Race ends.** liveData disappears from API. Cached host snapshots are kept
  in memory; drawer can still be opened on previously-clicked runners. Refresh
  clears the cache (acceptable).
- **Race with no live participants at page load.** Host starts empty, drawer
  doesn't render any content until a click happens. Participants without
  `liveData` are not clickable for drawer purposes.
