# Cross-category standings — design

Date: 2026-07-25
Repos: `therun-frontend` (feature), `therun-backend` (one new endpoint)
Status: designed, approved

## What this is

A per-game hall of fame ranking runners by how well they perform **across
categories** rather than on any single board. Lives on its own route,
`/games-v2/{game}/standings`, reachable from a tab band under the game hero.

The defining interaction: every featured category is a toggle. Turning a
category off recomputes every score and reorders the table instantly. The
table shows only the **top 20** — being on it should feel like an
achievement, not a directory listing.

## Scoring

```
pct(runner, category) = wrTimeMs / runnerTimeMs          // 1.0 for the WR holder
score(runner)         = mean over ALL selected categories, absent = 0
```

Two properties follow, and both are deliberate:

**Missing counts as zero.** A runner who hasn't run a selected category
scores 0 for it. This is what makes toggling meaningful — the toggle isn't
a row filter, it's the question being asked. Select everything and you're
asking "who has conquered this game"; narrow to three categories and
you're asking "who is best across these three".

**Coverage beats peak.** Under a mean-with-zeros, a runner sitting 60th on
two boards (`(0.85 + 0.85) / 2 = 0.85`) outranks the WR holder of one who
never ran the other (`(1.0 + 0) / 2 = 0.50`). This is the intended
behaviour for a cross-category ranking, and it has a sharp consequence for
implementation — see "Why there is no pool cut".

Percentages display ×100 with one decimal. `pct` is dimensionless, so a
realtime category and a gametime category compare cleanly without
normalisation.

**Tie-break order:** more categories covered → higher single best `pct` →
runner name ascending. Deterministic, so the table never reshuffles between
renders.

### Which board each category contributes

Each category contributes its **default board** — no subcategory values, not
combined, unverified included — at the category's resolved timing. This is
the same board a category card links to on the overview, so a number in the
standings always matches the board you land on. Timing resolution reuses the
existing precedence (`forceRealTime` → effective hide flags →
`primaryTiming` → `rt`), extracted to a shared module rather than
duplicated.

## Why there is no pool cut

The first draft of this design had the endpoint return only a candidate
pool — the union of each board's top 50 — to bound the payload. **That is
wrong**, and the reason is the coverage property above: a runner outside
every board's top 50 can still beat everyone in the pool by being present
in more of the selection. Any cut along a *rank* axis discards exactly the
runners the scoring rewards.

Measured instead. Super Mario 64 (`gameId 1`), the largest game on the
platform, via the production API:

| Board | Entries |
|---|---|
| 16 Star | 813 |
| 70 Star | 768 |
| 120 Star | 542 |
| 1 Star | 298 |
| 16 Star No LBLJ | 120 |
| 0 Star | 92 |
| 16 Star LBLJ | 42 |

7 boards, 2,675 entries, **1,198 distinct runners**. Serialised as a
columnar payload:

```
full matrix        198.4 KB raw    57.0 KB gzipped
without pictures    71.5 KB raw    30.9 KB gzipped
```

Recompute benchmarked at that scale (1,198 runners × 7 categories,
`Float64Array` per category, full sort, take 20):

```
1 category  selected → 0.144 ms
3 categories selected → 0.184 ms
7 categories selected → 0.194 ms
```

Roughly 1/80th of a frame. So the whole matrix ships, uncut, and toggling
stays instant. The worst case on the platform costs 57 KB gzipped on a
route users opt into.

**The one guard.** If a game ever exceeds 5,000 distinct runners the
endpoint truncates by *coverage, then mean pct* — the axis that correlates
with the score, which is precisely why rank was the wrong axis — and sets
`truncated: true` so the table can say so. No game today comes close.

## Backend

### `GET /mod/v1/games/{gameId}/standings`

Public, no auth. Rides the `/mod` base path, which is `proxy: true`
(`aws/lib/moderation-stack.ts`), so **no CDK change is required** — the main
API Gateway's 500-resource cap is not touched. `/v1/games` already
dispatches to `handleGameMgmt`, so this is one new branch in
`src/api/game-mgmt/handler.ts` plus a repository module.

Response (columnar — an interned name table plus parallel arrays, not
`LeaderboardEntry[]`, which would cost ~4× the bytes for the same
information):

```jsonc
{
  "categories": [
    { "id": 12, "name": "16star", "display": "16 Star",
      "timing": "rt", "wrTimeMs": 5025670, "entryCount": 813 }
  ],
  "runners": [
    { "name": "Kirbymastah", "picture": "https://...", "country": "us",
      "userId": 4821, "isGuest": false }
  ],
  // [categoryIndex, runnerIndex, rank, timeMs]
  "cells": [[0, 0, 1, 5025670], [0, 1, 2, 5031120]],
  "truncated": false
}
```

Categories are the game's **featured** set (`isMain && active`), in the
same sort order the overview uses. A category with an empty board is
omitted entirely — it can contribute nothing but zeros, and offering a
toggle that only ever lowers everyone's score is a trap.

Implementation reuses `getLeaderboardFromParams` once per category with a
large `pageSize` rather than hand-rolling SQL. The `pageSize` cap of 100
lives in the leaderboards *API* handler, not the core, so the core accepts
a full-board read. Reusing the existing path is what guarantees the design
promise that standings numbers match the board behind them; a bespoke query
would be free to drift.

Cached in Redis under `standings:{gameId}` with a short TTL, invalidated
alongside the game's leaderboards.

### Shared timing resolution

`resolveHiddenTimings` / `resolveTiming` are currently module-private in
`src/api/leaderboards/handler.ts` and already informally duplicated
(`src/query/query-runs.ts:646` carries a "mirrors resolveHiddenTimings"
comment). Extract to `src/leaderboards/resolve-timing.ts` and import from
both, so standings cannot drift from the boards it reports on.

## Frontend

### Routing and navigation

New route `app/(new-layout)/games-v2/[game]/standings/` with its own
`page.tsx`, `loading.tsx` skeleton, and metadata (`{Game} — Standings`,
shareable).

`header/view-tabs.tsx` renders a tab band under `GameHero` on both the game
root and standings. It appears **only when the game has 2+ featured
categories** — the same threshold `decideGameRootView` already applies to
the overview, since standings across a single category is just that board.
Guarded on the standings route too: a direct hit on a single-category game
redirects to the game root rather than rendering a degenerate table.

### Modules

| File | Responsibility |
|---|---|
| `standings/data.ts` | `loadStandings(gameId)` — `'use cache'`, `cacheLife('minutes')`, `cacheTag('standings:{gameId}')` |
| `standings/matrix.ts` | Decode the columnar payload into `Float64Array` percentage columns once |
| `standings/scoring.ts` | Pure `computeStandings(matrix, selectedIds) → ScoredRunner[]`. No React. Unit-tested. |
| `standings/standings-view.tsx` | Client component; owns selection, renders toggles + table |
| `standings/category-toggles.tsx` | Pill band on the existing `control-pill` vocabulary |
| `standings/standings-table.tsx` | The top-20 matrix table |

`scoring.ts` is deliberately free of React and of the payload's wire
format — it takes decoded columns and a selection, and returns ranked rows.
That boundary is what makes the scoring rules testable without mounting
anything, and it matches the co-located `*.test.ts` convention already used
throughout this directory (`card-entries.test.ts`, `board-range.test.ts`,
`display-rank.test.ts`).

### Selection state

Lives in the URL as `?categories=16star,70star` (omitted = all selected), so
a filtered standings is shareable and back-button correct — the same
approach as `filters/use-filter-nav.ts`. Selection changes replace rather
than push, so toggling doesn't bury the back button.

### Table

Board design vocabulary throughout: `board-table`, `mono-time` tabular
numerals for every time and percentage, `board-eyebrow` column labels.

- Standings positions 1/2/3 take the gold/silver/bronze rank accents
- Score column: the number plus a quiet proportional bar
- One column per selected category; cell shows percentage over rank
- Past ~6 categories the matrix scrolls horizontally inside its own
  container — the page body never scrolls sideways
- Deselecting everything shows a prompt, not an empty table
- Runners link to their profile; guests render as plain text

## Testing

`scoring.test.ts` covers: WR holder scores exactly 100.0; a missing
category contributes 0 rather than being skipped; single-category
selection reduces to that board's order; empty selection returns empty;
each tie-break tier in turn; and the coverage-beats-peak property
(60th-on-two beats WR-on-one), since that is the rule most likely to be
"fixed" into a bug later.

`matrix.ts` decode is covered for the empty-board and absent-cell cases.

Per repo convention, tests are written but run by Joey, not by the agent.

## Risks and follow-ups

- **Deploy required.** The frontend cannot render standings until the
  backend endpoint is live; there is no local backend.
- Guests appear in standings (they hold real board entries) but have no
  profile to link to.
- The `truncated` flag has no production trigger today, so its UI path
  will ship unexercised.
