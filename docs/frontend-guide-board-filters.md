# Frontend guide: board built-in filters

Backend branch: `board-builtin-filters` (unpushed — pushes to main deploy;
coordinate before pushing). Design doc:
`docs/plans/2026-08-17-board-filters-design.md` in therun-fr.

## Purpose

The public leaderboard's Filters popover only ever showed variable filters,
which almost no category defines, plus a lone "Verified" toggle bolted onto
the toolbar. This adds four built-in filters — Video, Date range, Country,
plus the existing Verified — as real query params the backend understands,
and a `/variables` facets block so the popover only offers values that
actually exist on the category.

## Query params

`GET /v1/leaderboards/{game}/{category}` gains/changes:

| Param | Values | Validation | Notes |
|---|---|---|---|
| `verified` | `true` \| anything else | `=== "true"` or `"1"` | unchanged, existing |
| `video` | `required` \| `missing` | exact match; anything else ignored | tri-state, default is "any" (param absent) |
| `from` | `YYYY-MM-DD` | must match `\d{4}-\d{2}-\d{2}` and round-trip through `Date` (rejects `2024-13-40`, `2024-02-30`); invalid → treated as absent | inclusive lower bound, UTC day |
| `to` | `YYYY-MM-DD` | same as `from` | inclusive of the **whole** `to` day — internally becomes an exclusive bound at `to + 1 day` UTC, so `to=2024-06-30` includes runs up to `2024-07-01T00:00:00Z` |
| `country` | 2-letter code, e.g. `NL` | `^[A-Za-z]{2}$`; normalized upper-case | one code only, no multi-select |
| `<nameNormalized>` | existing variable values | unchanged | variable filters, still exist |

`from` and `to` are independent — either alone is valid. All five are
reserved param names (`RESERVED_QUERY_PARAMS` in
`src/common/normalizeVariable.ts`), so no category variable can be named
`video`, `from`, `to`, or `country`. `year` is still reserved (blocks the
name) but is **no longer applied** — `from`/`to` replace it.

Timing (`timing=rt|gt`) is unchanged and is not a filter — it re-ranks the
board rather than narrowing it.

Everything ANDs.

### Example requests

```
GET /v1/leaderboards/super-mario-64/120-star?verified=true&video=required
GET /v1/leaderboards/super-mario-64/120-star?from=2024-01-01&to=2024-06-30
GET /v1/leaderboards/super-mario-64/120-star?country=NL&timing=gt
GET /v1/leaderboards/super-mario-64/120-star?video=missing&from=2024-01-01&<var>=<value>
```

## `/variables` response shape

`GET /v1/leaderboards/{game}/{category}/variables`:

```ts
{
    variables: VariableRow[];
    reservedParams: string[];        // includes verified/country/year/from/to/video/page/pagesize/timing/combined/...
    validCombinations:
        | { mode: "open" }
        | { mode: "managed"; keys: string[] };
    facets: {
        countries: string[];         // sorted, upper-case ISO alpha-2, distinct across eligible runs + manual times
        minDate: string | null;      // ISO date (YYYY-MM-DD) of the earliest eligible run/manual time; null = empty board
    };
}
```

`facets` is computed by `getBoardFacets()` — two aggregate queries, run in
parallel with the existing variable-defs and valid-combinations lookups. It
is **category-wide**, not scoped to the current subcategory/filter slice: a
stale country pick on one subcategory can legitimately yield an empty board
with a visible, removable chip. This response is cached by the frontend for
`hours` already, so facets don't need separate caching consideration.

If facets computation throws, the handler catches it and returns
`{ countries: [], minDate: null }` rather than failing the whole
`/variables` response.

## As-of window semantics

The date range answers *"what did this board look like counting only runs
finished in this window?"* — not "runners whose current PB happens to fall
in the window." `finished_runs` holds every finished attempt, not just each
runner's best (the `is_leaderboard_entry*` flags mark only the best).

- No range: the normal flagged-entry path — unchanged, ZSET-cached.
- Any of `from`/`to` present ("windowed"): the query drops the
  `is_leaderboard_entry*` flag condition and instead selects, per runner,
  the fastest row inside the window (`DISTINCT ON (runner_key) … ORDER BY
  runner_key, <time column> ASC, id ASC`), where `runner_key =
  COALESCE(user_id::text, 'g:' || runner_name)`. This is the mechanism that
  makes windowed boards rank each runner by their fastest **in-window** row,
  not their current flagged PB.
- Time column: `time` for RTA; `game_time` for GT, or
  `COALESCE(game_time, time)` when the category's RTA fallback is on — same
  expression the flagged path uses. Rows with a null time column are
  excluded.
- Verification: rejected runs are always excluded in the window path;
  `verified=true` still restricts to `verification_status = 'verified'`.
  Combining `verified` with a window is fine.
- Manual times: windowed by `COALESCE(run_date, created_at)`; otherwise same
  eligibility as today. Manual times **do** honour `video`/`from`/`to`/
  `country`, but are dropped entirely (`[]`) whenever a variable filter is
  active — manual times carry no variables, so they can never satisfy one.
  This is pre-existing behavior for variable filters, unchanged by this work.
- Cost: a windowed request is an index-range scan
  (`finished_runs_game_category_ended_at_idx`) over every attempt in the
  window plus a per-runner sort — hundreds of ms on the largest categories,
  vs ~10 ms for the cached flag path. It only runs when a user supplies
  `from`/`to`; nothing default-renders it, and it lands in the existing
  cache-bypass branch (`hasFilters`), so the normal ZSET leaderboard cache
  is untouched by its presence.
- Current-state semantics: a run since excluded/deleted/rejected drops out
  of a historical window too — the window reflects the board's current
  state re-sliced by date, not a point-in-time snapshot.

`video` and `country` are plain `WHERE` clauses that also ride the
cache-bypass branch (as `year` did before); they don't change the ZSET key
or invalidate the cache for unfiltered requests.

## Degradation when facets are absent

Callers must not assume `facets` exists in every historical response
(during rollout, or if a proxy/cache serves a stale response shape): treat
`facets` as optional, and when it's missing or empty, hide the Country
control and drop the date-input `min` bound rather than erroring. `video`,
`from`, `to`, `country` query params work regardless of whether `/variables`
has been fetched — facets only gate what the UI *offers*, not what the
backend *accepts*.
