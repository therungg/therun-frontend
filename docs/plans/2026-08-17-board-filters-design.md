# Board filters — one Filters control, built-ins included

Date: 2026-08-17
Repos: therun-backend (query + `/variables` facets), therun-frontend (UI)
Status: design approved in chat 2026-08-17; not built.

## Problem

The public board has a `FiltersPopover`, but it renders `null` unless the
category defines `role: 'filter'` variables — which almost none do. So the
visible state is: no "Filters" button, and a lone **Verified runs only** chip
in the toolbar. Verified is a filter; it should live with the others, and the
others should exist. `BUILT_IN_FILTERS` in `src/lib/variables/language.ts`
already promises Country / Year / Verified / Timing to moderators, but the
backend applies only `verified` (and a `year` clause that never sees manual
times, i.e. never sees most submitted runs).

## Filter set

| Filter | Param | Values | Applies to |
|---|---|---|---|
| Verified runs only | `verified=true` | on/off | runs + manual times (exists) |
| Video | `video=required` \| `video=missing` | tri-state, default any | `finished_runs.vod_url`, `manual_times.evidence_url` (non-null and non-empty = has video) |
| Date range | `from=YYYY-MM-DD`, `to=YYYY-MM-DD` (either alone allowed) | inclusive days, UTC | see *As-of window* below |
| Country | `country=NL` | one ISO-3166 alpha-2 code | `users.country` via the existing LEFT JOIN; guests never match |
| Variable filters | `<nameNormalized>=<value>` | existing | `finished_runs.variables` (exists; manual times have no variables and are dropped when one is active — unchanged) |

Everything ANDs. Timing (RTA/LRT/IGT) stays a band control, not a filter: it
re-ranks the board rather than narrowing it. `year` stays in
`RESERVED_QUERY_PARAMS` (so nobody can name a variable `year`) but is no
longer applied — `from`/`to` subsume it. `from`, `to`, `video` join the
reserved set.

Deliberately not built: Platforms (no per-run field — that is what a
mod-defined filter variable is for), obsolete-runs Shown/Exclusive (a
different board shape: many rows per runner; separate project).

## As-of window — the date range's meaning

The question the range answers is *"what did this board look like if you
only count runs from X to Y?"* — not "runners whose current PB happens to
fall in the window". `finished_runs` holds every finished attempt (one row
per sync event); the `is_leaderboard_entry*` flags only mark each runner's
best. So the window path drops the flag condition and takes each runner's
fastest row inside the window:

```sql
SELECT DISTINCT ON (runner_key) …
FROM finished_runs fr
WHERE fr.game_id = $g AND fr.category_id = $c
  [AND fr.subcategory_key = $k]           -- omitted when combined
  AND fr.ended_at >= $from AND fr.ended_at < $to + 1 day
  AND fr.leaderboard_eligible AND NOT fr.excluded
  AND fr.verification_status != 'rejected'
  [AND fr.verification_status = 'verified']
  [AND <video / country / variable conditions>]
ORDER BY runner_key, <time column> ASC, fr.id ASC
```

- `runner_key = COALESCE(fr.user_id::text, 'g:' || fr.runner_name)` —
  same identity the in-memory merge already uses.
- Time column: `time` for RTA; for GT `game_time`, or
  `COALESCE(game_time, time)` when the category's RTA fallback is on — the
  same expression the flag path uses. Rows with a null time column are
  excluded (`WHERE <col> IS NOT NULL`).
- Manual times: `COALESCE(run_date, created_at)` in the window; otherwise
  the same eligibility as today.
- The rest of `queryPostgres` (merge by runner preferring the smaller time,
  redaction, secondary timings, pagination, `findRunner`) is unchanged.
- Cost: an index-range scan on `finished_runs_game_category_ended_at_idx`
  over every attempt in the window plus a per-runner sort — hundreds of ms
  on the largest categories vs ~10 ms for the cached flag path. It only ever
  runs when a user opts into a range; nothing default-renders it. It lands
  in the existing cache-bypass branch (`hasFilters`), so the ZSET is
  untouched.
- Current-state semantics: a run since excluded/deleted/rejected drops out
  of a historical window too. Intended.

Video and Country are plain WHERE clauses that also ride the cache-bypass
branch (like `year` did). Nothing about the ZSET key changes.

## `/variables` facets

So the popover only offers values that exist, the per-category
`GET /v1/leaderboards/{game}/{category}/variables` response gains:

```ts
facets: {
    countries: string[];   // distinct users.country over the category's eligible entries, sorted
    minDate: string | null; // ISO date of the earliest eligible run/manual time; null = empty board
}
```

Facets are category-wide, not board-slice-wide — a stale country pick on
one subcategory yields an empty board with a visible, removable chip, which
is fine. The frontend already caches this response for `hours`.

Two aggregate queries per uncached request:
`SELECT DISTINCT u.country … JOIN users` over flagged entries (cheap, uses
`idx_lb_entry`), and `MIN(ended_at)` / `MIN(COALESCE(run_date, created_at))`
(uses `finished_runs_game_category_ended_at_idx`).

## Frontend

### Contract mirror
- `types/leaderboards.types.ts`: `VariablesResponse.facets` (optional —
  the UI must degrade when the backend predates it: hide Country and the
  date floor, keep everything else).
- `src/lib/leaderboards-v1.ts`: `LeaderboardQuery` gains
  `video?: 'required' | 'missing'`, `from?: string`, `to?: string`,
  `country?: string`; `buildLeaderboardQS` emits them; the exact-slice
  cache tag is unchanged (tags are for invalidation; the cache key is the
  argument set).
- `app/(new-layout)/games-v2/[game]/data.ts`: parse `video`, `from`, `to`,
  `country` from search params (validated: enum / `YYYY-MM-DD` / two
  uppercase letters; junk is ignored, not forwarded) into `activeFilters`
  and `baseQuery`. `filtersActive` covers all of them.

### Filters popover — always rendered
`filters/filters-popover.tsx` no longer returns null on zero variable
filters. Contents, top to bottom:

1. **Verified runs only** — toggle row (moved in from the toolbar;
   `verified-toggle.tsx` deleted).
2. **Video** — segmented Any / Required / Missing.
3. **Date range** — two native `<input type="date">` (from / to), `min` =
   `facets.minDate`, `max` = today; a one-line note *"Board as it stood
   counting only runs finished in this range."*
4. **Country** — native `<select>` of `facets.countries` (flag emoji + name
   via the existing `country-flag-icons` / iso-countries helpers), "Any"
   default. Hidden when facets are absent or empty.
5. Divider, then the existing variable filter pills — only when the category
   has some.

Badge count = number of active filters (verified 1, video 1, range 1 even if
both ends set, country 1, each variable value 1). Every control navigates
through `useBoardNav`/`useFilterNav` immediately (no Apply button — the
board already applies optimistically and the URL is the state); the
existing pending/dim treatment covers it. `page` is dropped on every change.
The popover width grows to fit the two-column shape; keep the existing
`popoverPanel` mechanics (focus trap, outside click, Escape).

### Band chips
`filters/active-filter-chips.tsx` echoes built-ins as removable chips in
front of the variable chips: `Verified`, `Video required` / `No video`,
`2024-01-01 – 2024-06-30` (or `from 2024-01-01` / `until …`), `🇳🇱 Netherlands`.
× removes exactly that filter. `FilterBar` renders whenever any filter is
active, not only for subcategories/variables.

### Everywhere else the filters must ride
- `ClearFiltersButton` clears the new params too.
- CSV export goes through the same query → honours everything for free;
  `ExportButton` receives the same `query`.
- "Find me" note text stays; `findRunner` is unaffected.
- The subcategory value counts (`loadSubcategoryValueCounts`) already probe
  with `baseQuery`, so they narrow with the filters — desired.

## Copy
Popover title: **Filters**. Rows: *Verified runs only*, *Video*, *Date
range*, *Country*. Chip for a range: dates only, no word "range". No
"variable" anywhere on the surface (per the splits-vs-filters vocabulary).

## Testing
Backend (vitest, hermetic): `build-leaderboard-query` reserves the new
keys; unit tests for the condition builders (video/country/date on both
sources); a test asserting the window path selects the per-runner fastest
in-window row rather than the flagged row; facets shape.
Frontend: `filters-popover.test.tsx` (renders with zero variable filters;
badge count; each control navigates with the right param and drops
`page`), `active-filter-chips` built-in chips + removal URLs, `data.ts`
param validation, `leaderboard-pager.test.tsx` mock updates.

## Sequencing
1. Backend on `board-builtin-filters` → push to main (pipeline deploys) →
   15-minute monitor.
2. Frontend on `board-filters` off main; degrades when facets are missing so
   order is not load-bearing.
