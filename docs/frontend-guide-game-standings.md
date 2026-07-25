# Frontend guide — cross-category game standings

Authoritative copy. A duplicate lives at `therun-fr/docs/`; when they
disagree, this one is right.

## Endpoint

```
GET https://api.therun.gg/mod/v1/games/{gameId}/standings
```

Public — no `Authorization` header, no `x-api-key`. Rides the `/mod` base
path, which is a `proxy: true` RestApi, so it needed no API Gateway resource
(the main gateway is at its 500-resource cap).

Enveloped like every other backend response: `{ "result": ... }`.
`apiFetch` / `v1Fetch` unwrap `.result` already.

**404** `{ "error": "Game not found" }` when `gameId` doesn't exist.
**400** when `gameId` isn't numeric.

Server-cached in Redis for 5 minutes under `standings:{gameId}`, and dropped
whenever `invalidateGameLeaderboards(gameId)` runs, since standings are
derived from those boards.

## Response

```typescript
interface GameStandings {
    categories: StandingsCategory[];
    runners: StandingsRunner[];
    /** [categoryIndex, runnerIndex, rank, timeMs] */
    cells: [number, number, number, number][];
    /** True only if the 5000-runner guard fired. No game triggers it today. */
    truncated: boolean;
}

interface StandingsCategory {
    id: number;
    name: string;          // url slug, e.g. "16star"
    display: string;       // e.g. "16 Star"
    timing: "rt" | "gt";   // which clock this board is ranked by
    wrTimeMs: number;      // fastest time; the denominator for this column
    entryCount: number;
}

interface StandingsRunner {
    name: string;
    userId: number | null; // null for guests
    isGuest: boolean;
    picture: string | null;
    country: string | null;
}
```

It is **columnar on purpose**. `cells` indexes into `categories` and
`runners` rather than repeating runner identity per row; shaped as
`LeaderboardEntry[]` the same data costs roughly 4× the bytes. Measured on
Super Mario 64 — the platform's largest game, 7 boards, 2,675 entries, 1,198
distinct runners — the payload is 198 KB raw / **57 KB gzipped**.

## What the client must compute

The server deliberately returns **no score**. Scoring depends on which
categories the viewer has toggled on, so a server-computed score would be
stale the instant a toggle flips.

```
pct(runner, category) = category.wrTimeMs / cell.timeMs      // 1.0 for the WR holder
score(runner)         = mean over ALL selected categories, absent = 0
```

Absent-counts-as-zero is the whole point of the toggles: they change the
question being asked, not merely which rows are visible.

Tie-break: more categories covered → higher single best `pct` → name
ascending.

Benchmarked at SM64 scale (`Float64Array` column per category, full sort,
take top 20): **0.194 ms** per recompute with all 7 categories selected. Do
this synchronously on toggle; it is far inside a frame.

## Things that will bite you

**Categories can be missing from the response.** Only *featured* categories
(`isMain && active`) are included, and a category whose default board is
empty is dropped entirely rather than shipped as a toggle that can only
lower scores. So `categories` is not the same list as the overview's cards,
and you must key toggles off this array — never off a separately fetched
category list.

**`cells` is sparse.** A runner has a cell only for categories they've run.
There is no zero-filled cell; absence *is* the zero.

**Percentages need no timing normalisation.** `pct` is a ratio, so an `rt`
category and a `gt` category are directly comparable. Show `timing` in the
column header so the number is attributable, but do not convert anything.

**Guests are real rows.** `isGuest: true` runners hold genuine board
entries and can rank. They have no profile, so render the name as plain
text rather than a `UserLink`. Guests are keyed by lowercased name, so two
guests sharing a name across boards collapse into one runner — the same
assumption the leaderboards themselves make.

**Each category contributes its default board** — no subcategory values,
not combined, unverified included, at the category's resolved timing. That
is exactly the board a category card on the overview links to, so a
standings number always matches the board behind it.
