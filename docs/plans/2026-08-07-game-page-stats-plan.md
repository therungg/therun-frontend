# Game page stats & UI upgrade — implementation plan

**Date:** 2026-08-07
**Scope:** games-v2 public game page (overview, new Stats tab, new Races tab, sidebar).
**Status gate:** games-v2 remains admin-gated throughout — this work does NOT open the page to the public.

## Decisions (settled with Joey)

- **No WR/record history anywhere.** No per-card WR sparklines, no WR progression
  timelines, no records-set sections. The existing WR-history drawer on the board view
  (`drawers/wr-history-drawer.tsx` + its History button in the sticky bar) is **removed**.
- **Skipped entirely:** community segments / gold splits (revisit later), follow
  button + follower count (backend infra, floats), tournaments-for-game panel,
  IGDB screenshots/videos/websites media panels.
- Category cards stay as they are — no decoration for its own sake.
- `BoardStatsPanel` stays board-only: the new hero stat band supersedes it on the
  overview, so wiring it there would duplicate.

## Backend handoffs — SHIPPED 2026-08-07 (therun commit 0a0efad)

Joey granted backend access for this task; both built and deployed. Both ride
existing routes (no new API Gateway resources — the `api` stack is at 499/500):

1. **Date-bucketed game activity.** `GET /games/activity` needs a variant that returns
   per-day (or per-week) buckets for one game: e.g. `type=games&game_id=N&group_by=date`
   → `[{ date, playtime, attempts, finishedAttempts, pbCount }]`. Source table
   `activity_daily` already has exactly this grain. Needed by: Phase 1 hero sparkline
   (degrades gracefully without it) and Phase 2 activity chart (hard requirement).
2. **Series siblings.** No endpoint lists other games in a series. Cheapest: include
   `seriesGames: [{ slug, display, coverUrl, sortOrderInSeries }]` in `pageData`
   (rebuilt by `rebuildGamePageData()`), so `/v1/games/{id}` carries it with zero new
   routes. Needed by: Phase 1 series panel (panel simply doesn't render until then).

Everything else in all three phases uses endpoints that already exist.

---

## Phase 1 — Overview upgrade — BUILT 2026-08-07 (branch game-page-stats-phase1)

### 1.1 Hero stat band
Replace the tertiary facts line's stats portion in `GameHero` (full variant,
`header/game-hero.tsx`) with a stat band: large `mono-time`-style numerals,
`board-eyebrow` labels, hairline separators. Cells: Runners, Attempts, Time played,
PBs set, + Activity sparkline cell (only once handoff #1 lands; band ships without it).

- Add `totalPbs` to `getQuickStats` (`src/lib/games-v1.ts:96`) and the `QuickStats`
  type — the endpoint already returns it, the mapper drops it.
- Keep release year / platforms / genres as the small facts line under the title;
  only the numbers get promoted.
- Condensed hero variant (board view) unchanged.

### 1.2 Live Now upgrade (`sidebar/live-panel.tsx` + `drawers/live-drawer.tsx`)
Each row becomes: runner + category (as now), plus a thin progress bar from
`runPercentage`, current split name, and live delta (`delta`, colored with the
existing pace convention: `--bs-link-color` ahead / `--bs-red` behind). Fields are
already in the `/api/live` payload. Same treatment in the drawer rows.

### 1.3 Sidebar gap fix
Pass `moderators` from `page.tsx` (already fetched unconditionally) through
`overview/overview-page.tsx` to `Sidebar` so `ModeratorsPanel` renders on the
overview, matching the board view.

### 1.4 About demotion + Series panel
- Move `AboutPanel` to the bottom of the rail (below Moderators).
- New `SeriesPanel` ("More in {series}"): cover thumb (3:4) + name per sibling game,
  linking to their game pages. Renders only when `seriesGames` exists in metadata
  (handoff #2); wire the type + mapper in `game-mgmt.ts` now so it lights up on deploy.

### 1.5 Top runners section (overview main column, below the card grid)
"Top runners" section using `board-section-head`, with a period toggle
(All time · 90d · 30d) as `control-pill`s:
- All time: `GET /v1/runs?game_id=N&aggregate=sum&group_by=username&aggregate_column=…`
  (playtime; secondary columns attempts + PB count via the same aggregate mode).
- 90d/30d: `GET /games/activity?type=players&gameId=N&from=&to=` — returns
  `{username, totalPlaytime, totalAttempts, totalFinishedAttempts, totalPbs}` per
  runner; currently has no frontend caller.
- New fetcher(s) in `src/lib/` with `'use cache'` + `cacheLife('hours')` + `cacheTag`.
- Render: top 3 as a small podium row, then a compact table to ~10, times via
  `mono-time`. Empty/low-data state uses `board-empty`.

### 1.6 WR-history removal
Delete `drawers/wr-history-drawer.tsx`, `wr-history-model.ts`, the History action in
`header/sticky-board-bar.tsx`, and the `getWrHistory` fetcher
(`src/lib/leaderboards-v1.ts:174`) if nothing else imports it. Leave the backend
endpoint alone.

---

## Phase 2 — Stats tab — BUILT 2026-08-07 (branch game-page-stats-phase2, stacked on phase1)

Deviations from the spec below: no per-category filter on the activity chart
yet (the endpoint supports `categoryId`; UI deferred); platform/emulator
aggregates over featured boards' exports capped at 12 boards; countries come
from the standings payload; Stats follows the same 2+-featured-categories
redirect rule as Standings (the tab band only exists on the multi-category
game root — single-category games' root is their board). The 90-day playtime
sparkline cell also landed in the hero band (overview/standings/stats).

New route `app/(new-layout)/games-v2/[game]/stats/page.tsx`, mirroring the standings
route pattern (own `loading.tsx`, hero condensed, no sidebar rail, admin gate).
`ViewTabs` becomes `Categories | Standings | Stats` (Races added in Phase 3).
Tab visibility follows the existing ≥2-featured-categories rule for Standings;
Stats shows whenever the game has any finished runs.

Sections (all filterable by category where the source allows):

1. **Activity over time** — chart of playtime / attempts / PBs per day-or-week
   (backend handoff #1). Category filter via `type=categories&gameId=` variant.
   Follow the dataviz skill when building this chart.
2. **Top runners, full table** — same sources as 1.5 but paginated/expanded, with
   metric switch (playtime · attempts · PBs) and period filter.
3. **Platform & emulator distribution** — aggregate client-side from
   `getLeaderboardExport()` (`/mod/v1/leaderboards/{game}/{category}/export`,
   public-safe fields `platform`, `emulator`) per featured category; horizontal
   bar breakdown.
4. **Runner countries** — aggregate client-side from the standings payload
   (`StandingsRunner.country`, one call covers all featured boards); flag list with
   counts, no map.
5. **Site context footnote** — one line: share of site-wide playtime/attempts via
   `getGlobalStats()` (`src/lib/highlights.ts:95`).

Respect `anonymized` entries everywhere a runner name renders.

---

## Phase 3 — Races tab + sidebar panel

All read-only reuse of `src/lib/races.ts` (separate races API; no backend work).

1. New route `app/(new-layout)/games-v2/[game]/races/page.tsx`; `ViewTabs` gains
   `Races`. Tab renders only when `getRaceGameStatsByGame(game)` reports
   `totalRaces > 0`.
2. Sections: game race stats header strip (total races, finish %, total race time,
   avg race time — same stat-band language as the hero); per-category race stats;
   race time leaderboard + MMR leaderboard (`getTimeLeaderboards` /
   `getMmrLeaderboards`, category picker); recent finished races
   (`getPaginatedFinishedRacesByGame`, paginated) linking to race detail pages.
3. **Active races sidebar panel** — new `sidebar/active-races-panel.tsx` rendered
   directly under Live Now on overview + board views, only when
   `getAllActiveRacesByGame(game)` is non-empty: race name/category, participant
   count, state, link to the race page.

Note: the races API identifies games by display name (`?game=X`), not slug/id —
verify the mapping for games whose display differs from the games-v2 slug before
wiring links.

---

## Sequencing / verification

- One branch per phase off `main`; each phase is independently shippable.
- Phase order 1 → 2 → 3; the two backend handoffs can land any time (1.1 sparkline
  cell and 1.4 series panel are dormant until they do; 2.1 blocks on handoff #1).
- Per phase: typecheck + lint against baseline diff, browser pass on SM64 (big
  data), a mid-size game, and a near-empty autoCreated game (empty states).
- Styling stays inside the `_board.scss` contract — new stat band / bars / panels
  compose existing mixins (`board-surface`, `board-eyebrow`, `mono-time`,
  `board-section-head`, `control-pill`); no new raw colors.
