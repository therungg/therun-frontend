# Live Commentary Drawer

## Overview

Add an openable, closable side drawer to the live page that gives a commentator (or any viewer playing commentator) a dense, stat-sheet-style view of the currently-active run. The drawer surfaces live analytics, historical context, generated story elements, and per-split data, all navigable through every split of the run (past, current, or upcoming).

The drawer is mounted alongside the existing hero (`RecommendedStream`) on `app/(new-layout)/live/[username]/page.tsx`. It does not replace any existing UI; the live page remains fully functional with the drawer closed.

## Goals

- Give commentators things they can say out loud — analytics, history, stories — at a glance, without leaving the live page.
- Let them scrub through every split of the run and see the stats relevant to that split.
- Keep the drawer flexible: open it for any run, follow the auto-swapped active run by default, pin to the current run when desired.

## Non-goals

- No new backend endpoints. All data comes from existing `LiveRun` fields, the existing `useStory` hook, `getAdvancedUserStats`, and `getRun`.
- No commentator-specific RBAC. Anyone visiting the page can open the drawer.
- No race / tournament context (originally option E in brainstorming) in v1.
- The existing `RunStoryView` "concept" component is left in place; this work introduces a separate, polished story tab inside the drawer.

## UX

### Trigger and shell

- A "Commentary" button is added to the runner identity bar inside `RecommendedStream` (next to the Supporter chip).
- Clicking the button opens a right-side overlay drawer, ~440px wide on `lg+`, full-width below `lg`. Slides in from the right; backdrop is non-blocking — the page underneath stays interactive.
- Closes via the × button, the `Esc` key, or clicking the trigger again.
- Open/closed state persists in `localStorage` under `commentary-drawer:open`. Default is closed.

### Header

- Avatar (small) · runner name · game · category.
- **Pin toggle.** When unpinned (default), the drawer follows the page's `currentlyViewing` user — if the live page auto-swaps to a new active run, the drawer follows. When pinned, the drawer keeps showing the run it was opened on regardless of swaps.
- Close (×) button.

### Split selector

Sits between the header and the snapshot strip.

- `‹  Split N — "name"  ›` scrubber with arrow buttons.
- Keyboard: `←` / `→` while the drawer has focus (or the page does and the drawer is open).
- Range: `0` (start) through `splits.length` (run finished). Includes upcoming splits.
- A `●` "live" pip + "Jump to live" link appears when the selected split is not `currentSplitIndex`.
- "Follow live" is the default — selected split tracks `currentSplitIndex` until the user navigates manually. Once the user navigates, it stays put until they hit "Jump to live."

### Snapshot strip

Always visible, below the selector. Five dense, monospaced stat tiles:

| Tile | Past split | Live split | Upcoming split |
| --- | --- | --- | --- |
| `SPLIT` | name + index/total | name + index/total | name + index/total |
| `TIME` | `splitTime` (cumulative) | live ticking `currentTime` | `predictedTotalTime` |
| `Δ PB` | actual delta to `pbSplitTime` | live delta | projected delta |
| `p50` | whole-run Monte Carlo median (does **not** refocus) | same | same |
| `RESET %` | reset rate **at** the selected split (`1 - attemptsFinished / attemptsStarted`) | same | same |

### Tabs

Four tabs, in this order. Last-selected tab persists in localStorage. Default on first open: `Split`.

- **`Split`** — refocuses on the selected split.
  - Single-time vs cumulative time.
  - Average and best ever for this split.
  - Consistency.
  - Time-save potential (PB single time − best segment for this split).
  - Recent N completions (a small inline sparkline / list).
  - Attempts started / finished + reset rate.
  - For upcoming splits: same fields, framed as "what to watch for."
  - For the run-finished case (selected = `splits.length`): "Run finished — no upcoming split."
- **`Run`** — whole-run focused; does not refocus on selected split.
  - Monte Carlo percentiles (p10 / p25 / p50 / p75 / p90), best estimate, confidence interval (from `LiveRun.monteCarloPrediction`).
  - Projected finish vs PB.
  - Per-split saved/lost breakdown for completed splits, with the selected split highlighted.
- **`Story`** — wraps the existing `useStory(user)` hook.
  - Auto-scrolls to the `SplitStory` for the selected split index.
  - Stories before/after remain visible by scrolling.
  - Each story renders text + rarity badge + a "sent to Twitch" indicator when `wasSentToTwitch`.
  - Empty state reuses existing copy: "No story currently available. Stories only get generated when you have finished at least 3 runs, and started at least 20."
- **`Career`** — runner-level history; does not refocus on selected split.
  - Profile data: pronouns, country, total runs of this game/category, first run date, total playtime, PB date.
  - Recent session stats (runs today, resets today) where available.
  - Sourced from `getAdvancedUserStats(user, tz)` and `getRun(user, game, category)`.

### Reset behavior on user swap

When the parent's `currentlyViewing` changes (auto-swap due to stale, or manual click on a different live card):

- `selectedSplitIndex` resets to the new run's `currentSplitIndex`.
- "Follow live" flag resets to true.
- Tab selection and pin state are **preserved**.
- If pinned, none of the above happens — the drawer continues showing the original run.

## Architecture

### New files

- `src/components/live/commentary-drawer/commentary-drawer.tsx` — drawer shell. Receives `liveDataMap` + `currentlyViewing`, resolves the displayed run via the pin logic above. Owns mount/unmount, escape-key handler; click-outside is **not** used (non-blocking backdrop). Renders header, split selector, snapshot strip, tab bar, and the active tab's content. Portal-ed to `document.body` via `react-dom`'s `createPortal` so fixed positioning is unambiguous.
- `src/components/live/commentary-drawer/commentary-drawer-context.tsx` — small React context exposing `{ open, setOpen, toggle }` so `RecommendedStream` (or any descendant) can trigger the drawer without prop-drilling.
- `src/components/live/commentary-drawer/use-commentary-drawer-state.ts` — hook owning open state, pinned state, selected tab, selected split index, follow-live flag. Persists open / pinned / selected tab to localStorage. Selected split + follow flag are session-only.
- `src/components/live/commentary-drawer/split-selector.tsx` — scrubber component. Receives `liveRun`, `selectedIndex`, `onChange`, `onJumpToLive`, `currentSplitIndex`. Owns keyboard handlers.
- `src/components/live/commentary-drawer/snapshot-strip.tsx` — five-tile row. Pure presentational; receives derived stats.
- `src/components/live/commentary-drawer/derive-snapshot.ts` — pure function that takes `(liveRun, selectedIndex)` and returns the five tile values. Unit-tested.
- `src/components/live/commentary-drawer/tabs/split-tab.tsx`
- `src/components/live/commentary-drawer/tabs/run-tab.tsx`
- `src/components/live/commentary-drawer/tabs/story-tab.tsx` — wraps existing `useStory(user)`; auto-scroll-to-selected-split logic lives here.
- `src/components/live/commentary-drawer/tabs/career-tab.tsx` — consumes `useCommentatorData`.
- `src/components/live/commentary-drawer/use-commentator-data.ts` — single hook that fans out to `getAdvancedUserStats(user, tz)` and `getRun(user, game, category)`, caches in-memory by `(user, game, category)`, returns `{ data, isLoading, error }`. Refetches when any key changes.
- `src/components/live/commentary-drawer/commentary-drawer.module.scss` — drawer chrome and stat-sheet styling: monospaced numerics, `font-variant-numeric: tabular-nums`, hairline dividers, tight type scale, no card chrome inside tabs.

### Wiring

- `live.tsx`:
  - Mount `<CommentaryDrawer liveDataMap={updatedLiveDataMap} currentlyViewing={currentlyViewing} />` once at the top level. The drawer needs access to the full data map so a pinned drawer can keep resolving its pinned user even after the page swaps `currentlyViewing`.
  - Pass an `onOpenCommentary` callback to `RecommendedStream` so the trigger button can call into the drawer's open state. Implemented via a small zustand-free context (`CommentaryDrawerContext`) provided around the page tree, or via lifting the `useCommentaryDrawerState` hook into `live.tsx` and passing handlers down.
- `recommended-stream.tsx`:
  - Add "Commentary" button into the existing `heroIdentityBar` row (next to the Supporter chip). Clicking it calls the open handler from context.
  - The drawer is **not** mounted from here.

### Resolving the displayed run

The drawer keeps two pieces of state: `pinnedUser: string | null` and `pinned: boolean`.

- Open with `pinned = false`: drawer reads `liveDataMap[currentlyViewing]` on each render. Auto-follows swaps.
- User toggles pin on: capture `pinnedUser = currentlyViewing` (or whichever user is being shown when pinned). Drawer now reads `liveDataMap[pinnedUser]`.
- If the pinned user disappears from the map (their run goes offline), the drawer shows a "Run ended" state with an "Unpin" button; it does **not** auto-unpin.

### State sources

- **Live data:** `activeLiveRun` from `RecommendedStream` props. Already kept fresh by the parent page's websocket subscription.
- **Story data:** existing `useStory(liveRun.user)` — already websocket-aware. Reused as-is.
- **Historical data:** `useCommentatorData(user, game, category)`. The underlying lib calls (`getAdvancedUserStats`, `getRun`) are already cached server-side via `'use cache'`; the hook only adds a tiny in-memory dedupe per `(user, game, category)` so a tab switch doesn't refetch.

## Error & empty handling

- No story → existing copy in the Story tab.
- Advanced stats / run fetch fails → Career tab shows "Career data unavailable." Other tabs are unaffected.
- Selected split = `splits.length` (run finished) → Split tab shows "Run finished — no upcoming split."
- Run is minified or loading → drawer header and close still work; tab content shows a skeleton.
- Selected split out of range after a websocket update that shrinks `splits` (rare, e.g. metadata correction) → clamp to `Math.min(selected, splits.length)`.

## Testing

- Unit tests for `use-commentary-drawer-state` (open/close, pin, navigation, localStorage roundtrip).
- Unit tests for `derive-snapshot` covering past / live / upcoming / finished cases.
- Manual visual smoke:
  - Open drawer, navigate splits with `←` / `→`, verify snapshot tiles update.
  - Verify Story tab auto-scrolls to selected split.
  - Verify Career tab doesn't refocus.
  - Verify pin: open drawer, pin, force a stale-swap on the live page, drawer stays on original runner.
  - Verify localStorage: reload page, drawer state and last-tab restore (selected split does not).
- No e2e harness is added; project doesn't currently have one.

## Data references

| Datum | Source |
| --- | --- |
| Current/selected split fields (single, total, comparisons, attempts, average, consistency, recentCompletions, predictedSingleTime, predictedTotalTime) | `LiveRun.splits[i]` |
| Live timer | `LiveRun.currentTime` (existing `LiveSplitTimerComponent`) |
| Δ PB live | `LiveRun.delta`, `splits[i].pbSplitTime` |
| Monte Carlo percentiles + estimate + CI | `LiveRun.monteCarloPrediction` |
| Stories | existing `useStory(user)` hook |
| Career profile, total playtime, runs/resets today, first run date | `getAdvancedUserStats(user, tz)` |
| Game/category-specific PB date, best splits, averages | `getRun(user, game, category)` |

## Out of scope (future)

- Race / tournament context tab (option E from brainstorming).
- Drag-to-reorder tabs.
- Shareable deep link to a specific split (`?commentary=1&split=N`).
- Commentator role-gated features (e.g. private notes).
