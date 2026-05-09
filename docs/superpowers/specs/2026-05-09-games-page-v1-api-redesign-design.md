# Games Page v1 API Redesign — Design

Full redesign of `/games/[game]` on top of the new backend v1 APIs (`/leaderboards/*`, `/v1/runs*`, `/v1/finished-runs`, `/v1/leaderboards/{game}/{category}/variables`, `/games/activity`). The all-games index (`/games`) and user-on-game (`[username]/[game]`) pages are out of scope here and become follow-up specs.

## Goals

- Replace the old `/games/{game}` + `/games/global/{game}` blob fetches with the new v1 surfaces.
- Make the PB leaderboard the headline of the page.
- Surface subcategory and variable filters, verified-only, and authoritative ranks that the old API didn't expose cleanly.
- Match the existing new-layout design system; no new visual subsystem.
- Build behind a parallel route (`/games-v2/[game]`) and flip the default at cutover.

## Non-goals

- `/games` index redesign.
- `[username]/[game]` user-on-game redesign.
- Inline moderator actions (verify / reject buttons, rejection reason modal, audit trail). Deferred to a separate spec.
- Component extraction to a shared `src/components/game-v2/` library. Components stay page-local until a second consumer exists.
- Secondary leaderboards (Sum-of-Bests, Attempt Count, Consistency Score, Completion %). Dropped from the new page.

## Page shape

Leaderboard-dominant + right sidebar.

```
┌─────────────────────────────────────────────────────────────┐
│  Game header (image, display name, breadcrumb, totals)      │
├──────────────────────────────────────┬──────────────────────┤
│  Category pills                      │  WR card             │
│  Subcategory + variable filter pills │  Live now (compact)  │
│  Verified toggle                     │  Recent PBs (5)      │
│                                      │  Quick stats         │
│  Leaderboard table                   │                      │
│  rt time | gt time | runner | etc.   │                      │
│                                      │                      │
│  Numbered pagination                 │                      │
└──────────────────────────────────────┴──────────────────────┘
```

Compact sidebar panels expose "View all" buttons that open lazy-loaded drawers — full live runs grid, full WR history visualization (visual + table modes).

## Routing and URL contract

Single route: `app/(new-layout)/games-v2/[game]/page.tsx`. All state in query params.

| Param | Default | Role |
|---|---|---|
| `category` | top-ranked from `/v1/runs/categories?game_id=X` (sorted by `-total_run_time`) | which category's board to show |
| `subcategory` | category's `default_subcategory_hash` if set, else empty | which subcategory board (FE-computed hash from variable selections) |
| `var_*` | none | filter-typed variable values; multi-select via comma-separated values |
| `verified` | per-game configurable default, fallback `false` | verified-only board |
| `page` | `1` | page number |
| `pageSize` | `25` | results per page (max 100) |

`timing` is not a URL param. Both rt and gt columns render side-by-side; rows are sorted by the category's `primary_timing`.

Slug-based URLs are preserved (`/games-v2/super-mario-64`). The server resolves slug → `game_id` once per request and caches the mapping at `cacheLife('hours')`.

A filter change drops `page` (resets to page 1). All other unrelated params are preserved on each push.

## Data flow

`page.tsx` is a server component using `'use cache'` + `cacheLife('minutes')`. Filter controls are client components that call `router.push` with new params; Next.js re-renders the server component. No client-side SWR.

```
page.tsx (server)
  ├─ resolveGame(slug)                       /v1/runs/games?game={normalized}
  │      returns identity only: { id, name, display, image, defaultVerified, primaryTiming }
  ├─ resolveCategory(gameId, categorySlug?)  /v1/runs/categories?game_id={X}
  │      pick highest total_run_time if no slug provided
  └─ Promise.all (
        getVariables(game, category)      /v1/leaderboards/{game}/{category}/variables
        getLeaderboard(game, cat, rt, …)  /leaderboards/{game}/{category}?timing=rt&...
        getLeaderboard(game, cat, gt, …)  /leaderboards/{game}/{category}?timing=gt&...
        getQuickStats(gameId)             /v1/runs/games?game_id=X (aggregate row only)
        getRecentPbs(gameId)              /v1/finished-runs?game_id=X&is_pb=true&sort=-ended_at&limit=10
        getLiveRunners(gameDisplay)       existing live data source (filtered to game)
        getUserRankings(session.userId)?  /leaderboards/user/{userId}/rankings (only if logged in)
     )
```

The WR card consumes the first row of the primary-timing leaderboard response — no separate fetch. `getQuickStats` is a separate call from `resolveGame` so each can use its own TTL (identity stable for hours, aggregate stats refresh per minute).

`getSession()` (which uses `cookies()`) runs at the page boundary. `userId` is extracted and passed as a parameter into the cached fetch functions, per the project's auth memory.

## Caching strategy

| Function | `cacheLife` | `cacheTag` |
|---|---|---|
| `resolveGame(slug)` | `hours` | `game-resolve:${slug}` |
| `resolveCategory(gameId, slug?)` | `minutes` | `game-cats:${gameId}` |
| `getVariables(game, category)` | `hours` | `game-vars:${gameId}:${categoryId}` |
| `getLeaderboard(game, cat, timing, page, filters…)` | `minutes` | `lb:${gameId}:${categoryId}:${subcategoryHash}:${timing}:${verified}` |
| `getRecentPbs(gameId)` | `minutes` | `recent-pbs:${gameId}` |
| `getQuickStats(gameId)` | `minutes` | `game-stats:${gameId}` |
| `getLiveRunners(gameDisplay)` | not cached | — |
| `getUserRankings(userId)` | `minutes` | `user-rankings:${userId}` |

`page.tsx` itself is `'use cache'` + `cacheLife('minutes')` — Next.js keys it by params, so each filter combination caches independently. Backend can call `revalidateTag('lb:...', 'minutes')` via webhook if tighter freshness is needed for a specific board; out of scope here.

## Component tree

All components page-local under `app/(new-layout)/games-v2/[game]/`. Existing components from `src/components/` (live runs grid, `WrHistory`, `WrHistoryTableMode`) are reused, not rewritten.

```
app/(new-layout)/games-v2/[game]/
├─ page.tsx                   server; orchestrates the fan-out
├─ data.ts                    server-only fetchers for resolves + composite shaping
├─ game-page.tsx              server; pure layout assembly from resolved data
├─ header/
│  ├─ game-header.tsx         image + display name + breadcrumb + total runners/playtime
│  └─ category-pills.tsx      client; pushes ?category=
├─ filters/
│  ├─ filter-bar.tsx          client; composition of subcategory + variable + verified controls
│  ├─ subcategory-pills.tsx   client; renders only when subcategory variables exist
│  ├─ variable-pill.tsx       client; one per filter-type variable, popover for values
│  └─ verified-toggle.tsx     client
├─ leaderboard/
│  ├─ leaderboard-table.tsx   server; rt + gt columns
│  ├─ leaderboard-row.tsx     server; rank, runner, rt, gt, set-at, vod, verified pill
│  ├─ pagination-bar.tsx      client; pushes ?page=
│  └─ jump-to-rank-button.tsx client; only rendered when user has an entry off current page
├─ sidebar/
│  ├─ sidebar.tsx             server; vertical stack
│  ├─ wr-card.tsx             top runner of the active board (from primary-timing response)
│  ├─ live-panel.tsx          compact, max 5; "View all" → live drawer
│  ├─ recent-pbs-panel.tsx    compact, max 5; no drawer (5 is enough)
│  └─ quick-stats-panel.tsx   aggregate numbers
├─ drawers/
│  ├─ live-drawer.tsx         client; lazy via next/dynamic; reuses existing live grid
│  └─ wr-history-drawer.tsx   client; lazy via next/dynamic; reuses WrHistory + WrHistoryTableMode
└─ types.ts                   shared local types
```

New shared modules outside the page directory (these are genuine reusable infrastructure, not page-local UI):

- `src/lib/games-v1.ts` — `resolveGame`, `resolveCategory`, `getQuickStats`, `getRecentPbs`.
- `src/lib/leaderboards-v1.ts` — `getLeaderboard`, `getVariables`, `getUserRankings`, `getWrHistory`.
- `src/lib/leaderboard-hash.ts` — pure `computeSubcategoryHash(defs, values)`.
- `types/leaderboards.ts` — request/response types for the v1 surfaces.

## Filter behavior

Filter controls are client components using `useRouter`. Click → merged search params → `router.push`. Unrelated params are preserved; `page` is dropped on filter change.

**Subcategory variables**: changing a subcategory variable's value triggers `computeSubcategoryHash(defs, values)` and pushes `?subcategory={hash}`. The hash function mirrors the backend algorithm exactly:

1. Filter variable defs to subcategory-typed only.
2. Sort by name alphabetically.
3. For each, use the user's selected value or fall back to `defaultValue`.
4. If a required variable has no value or default, the FE refuses to push (defensive — the backend would 400).
5. Build `name1=value1|name2=value2|...`, SHA-256, truncate to 16 hex chars.
6. Empty string if no subcategory variables exist or all are unset.

**Filter variables**: change pushes `?var_{name}={value}` (or comma-joined values). The leaderboard endpoint applies these as JSONB filters server-side.

**Verified toggle**: pushes `?verified=true|false`. Default comes from the per-game configurable flag returned by the resolved game record.

## Empty and error states

| Condition | Behavior |
|---|---|
| Game slug doesn't resolve | `notFound()` → standard Next.js 404 |
| Game has no categories | Header + centered "No runs uploaded for this game yet." in the leaderboard area; sidebar still renders (likely sparse) |
| Selected category + filters return no entries | Header + filter bar still visible; leaderboard area shows "No runs match these filters." with a "Clear filters" button (clears `var_*`, `subcategory`, `verified`) |
| Variable defs endpoint fails | Filter bar renders with no filter pills; board still works; failure logged to instrumentation |
| Leaderboard endpoint fails | Error panel in the board area with a retry-by-reload prompt; sidebar still renders |
| One sidebar panel fetch fails | That panel shows an inline "Couldn't load"; other panels unaffected |

## Logged-in user features

- Highlight the user's row when it appears on the current page (CSS class on the row).
- "Jump to my rank" button: only when `session.userId` is set, the user has an entry on the active board, and the entry is not on the current page. Server-side calls `getUserRankings(userId)`, finds the matching `(gameId, categoryId, subcategoryHash, timing)` entry, computes `targetPage = ceil(rank / pageSize)`, navigates on click.

## Migration / cutover

Build behind `app/(new-layout)/games-v2/[game]/`. Old `app/(new-layout)/games/[game]/` stays untouched throughout development. Nothing links to `/games-v2` so production traffic is unaffected.

Cutover (Slice 8 below) replaces `/games/[game]` with a server-side redirect to `/games-v2/...`, preserving the search params. Once the redirect has been live and stable, the old folder and unused API route handlers under `app/api/games/[game]/...` are deleted in a follow-up cleanup. Sitemap entries (`src/lib/sitemap.ts`) are updated to point at the canonical (post-redirect) URLs.

## Implementation slicing

Each slice is a reviewable PR. Order is review order, not duration.

1. **Data layer** — `src/lib/games-v1.ts`, `src/lib/leaderboards-v1.ts`, `src/lib/leaderboard-hash.ts`, `types/leaderboards.ts`. Includes unit tests for `computeSubcategoryHash`. No UI yet.
2. **Route shell + URL state** — `page.tsx`, `game-page.tsx`, `header/game-header.tsx`, `header/category-pills.tsx`, `notFound()` and empty-state for no-categories. Shell renders, category pill row works.
3. **Leaderboard table (rt + gt + pagination + verified)** — `leaderboard/*` and `filters/verified-toggle.tsx`. Both timings fetched in parallel, merged by run id, primary-timing drives row order. If backend dependency #2 (per-game `defaultVerified`) isn't resolved by this slice, the toggle hardcodes `false` as the default and a follow-up reads from the resolved game record once the field is exposed.
4. **Sidebar panels (compact)** — `sidebar/*`. Reads from data already in `page.tsx`.
5. **Filter pills (subcategory + variables)** — `filters/filter-bar.tsx`, `subcategory-pills.tsx`, `variable-pill.tsx`. Gated on backend dependency #1 below.
6. **Drawers** — `drawers/live-drawer.tsx`, `drawers/wr-history-drawer.tsx`. Lazy-loaded; reuse existing components.
7. **Jump-to-my-rank** — server-side rank lookup and target-page computation; highlight CSS; conditional button render.
8. **Cutover** — `/games/[game]` → redirect or rename, sitemap update, old API route handlers cleanup, SEO metadata parity check.

## Backend dependencies

1. **Variables endpoint classification (blocks slice 5)** — `/v1/leaderboards/{game}/{category}/variables` must distinguish subcategory-typed vs filter-typed variables. The data model has both; the example response shows `type: "select"`, which appears to describe input style, not the subcategory/filter split. The FE needs the classification to know which selections feed `subcategoryHash` versus `?var_*`. Until resolved, the filter-pill slice can't ship.
2. **Per-game `defaultVerified` flag (slice 3 has a fallback)** — confirm where this lands in the resolved game record. Slice 3 hardcodes `false` until exposed; flipping the fallback is a one-line follow-up.
3. **Slug resolution path (slice 1 has a fallback)** — `/v1/runs/games?game={slug}` is currently described as ilike-matching. If exact slug resolution isn't supported, the FE falls back to the leaderboard endpoint's path-based alias resolution. Either path satisfies slice 1.

## Testing

- Unit: `computeSubcategoryHash` against known test vectors derived from the backend algorithm description.
- Type checking and lint as standard.
- Manual: each slice gets a smoke pass on a few real games (high-traffic with many subcategories: SM64, Celeste; low-traffic edge cases; games with no entries).
- Per CLAUDE.md, frontend changes need browser verification before claiming complete. Each slice's PR description should call out the manual test steps it covered.
