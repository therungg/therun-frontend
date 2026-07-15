# Category Config Live Leaderboard Preview — Design

**Date:** 2026-07-15
**Status:** Approved (Joey: "show the leaderboard for a category while editing it with real time changes. Maybe only like the top 20"), not yet implemented
**Branch:** `tier1-console-completion` (direct, continues the live-feedback session)

## Decisions (Joey)

- Sticky side panel on the per-category config screen: config sections left, live top-20 preview right; stacks below on narrow screens.
- Entries mirror the public board exactly (same `getLeaderboard` defaults the game page uses — verified+pending as rendered publicly), top 20.

## Behavior

The preview reflects the mod's **unsaved drafts** live:
- **Primary timing** (RTA↔IGT): re-fetch with the draft timing (backend ordering is authoritative; responses are server-cached, and a small client cache per timing avoids refetch thrash).
- **Show RT / Show IGT**: time columns appear/disappear (at least one always shown — the section guard already prevents both-hidden).
- **Milliseconds**: formatting toggles live.
- **Min time draft** (RT and/or IGT): entries at/below the draft minimum grey out with a "would be held" badge.
- **Require video draft**: entries without a VOD get a "no video" marker.
- Rules/variables sections don't affect the preview (no board effect / out of scope).
- Loading/empty/error states: skeleton rows while fetching; "No runs on this board yet" for empty; quiet inline error + retry on failure.
- Header: "Live preview — top 20 · reflects your unsaved edits".

## Architecture

1. **`loadLeaderboardPreviewAction(input: { gameSlug: string; categorySlug: string; timing: 'rt' | 'gt' })`** (new read action under `setup/actions/`): wraps `getLeaderboard({ gameSlug, categorySlug, timing, pageSize: 20 })` — all other query fields omitted so server defaults match the public board (subcategory defaults, no var filters, same verified default). Returns `{ entries } | { error }` with entries trimmed to `{ rank, runnerName, time, realTime, gameTime, vodUrl, verificationStatus }`. Public data — session gate not required; keep the house try/catch error shape.
2. **Draft plumbing:** `CategoryConfigBody` owns a `previewDraft` state `{ primaryTiming, hideRealTime, hideGameTime, showMilliseconds, minTimeMs: number | null, minGameTimeMs: number | null, requireVideo: boolean }`, initialized from the current category; Timing and Standards sections receive an `onDraftChange(partial)` callback and publish on every input change (they keep their own local state; this is an additional broadcast, not a lift-and-invert).
3. **`CategoryLeaderboardPreview`** (client component, same file or sibling): fetches on mount and on draft-timing change (per-timing memo cache in a ref so RTA↔IGT flips don't refetch), renders the compact table with the draft-derived decorations. Sticky (`position: sticky; top`) within a two-column grid added to `CategoryConfigBody`'s layout; single column below ~992px.
4. Preview state resets naturally per category via the existing `key={current.id}` remount.

## Out of scope

- Live preview on the defaults (bulk) step and picker step.
- Subcategory/variable-aware preview slices.
- Websocket live updates — "real time" here means reflecting local edits, not other users' runs.
