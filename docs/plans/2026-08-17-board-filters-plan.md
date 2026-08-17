# Board Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One always-present **Filters** control on the public board holding Verified · Video · Date range (as-of window) · Country · variable filters, backed by real backend conditions and a facets block on `/variables`.

**Architecture:** Backend (`../therun`) adds `video`/`from`/`to`/`country` as applied builtins in `get-leaderboard.ts` (cache-bypass path, both sources), a windowed per-runner-fastest query when `from`/`to` are set, and `facets` on the variables endpoint. Frontend (`therun-fr`) parses the params into `activeFilters`, threads them through `LeaderboardQuery`, rebuilds `FiltersPopover` to always render with the built-in rows, and echoes built-ins as band chips.

**Tech Stack:** Drizzle ORM (Postgres), vitest (backend unit + Docker integration; frontend jsdom), Next.js 16 App Router, React 19.

**Spec:** `docs/plans/2026-08-17-board-filters-design.md` (this repo). Read it first.

## Global Constraints

- Backend work happens in `/home/joey/therun/therun` on branch `board-builtin-filters` off `main`; frontend in `/home/joey/therun/therun-fr` on branch `board-filters` (already created off `main`, design doc committed). Never push frontend `main`. Backend push-to-main IS the deploy (CI pipeline) — coordinate with Joey before pushing backend main.
- No CDK / gateway changes: no new route. Facets ride the existing `/variables` route.
- Never say "variable" in user-facing copy; never reference competitor sites in code or copy.
- Frontend formatting: Biome (4-space, single quotes, trailing commas). Unused vars prefixed `_`.
- Frontend `typecheck`/`lint` are not clean on main (~356 pre-existing errors) — gate on "no NEW errors in touched files", not exit 0.
- Params (all lower-case, all optional): `verified=true`, `video=required|missing`, `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `country=XX` (ISO-3166 alpha-2, upper-case).
- Backend commit messages: `feat(leaderboards): …`; no co-author trailer. Frontend: `feat(board): …`.

---

## Part A — Backend (`/home/joey/therun/therun`)

Setup once: `cd /home/joey/therun/therun && git checkout -b board-builtin-filters main`. Unit tests: `npm test`. Integration tests need Docker: `npm run test:integration` (starts Postgres+Redis via `test/helpers/integration-global-setup.ts`; if Docker is unavailable, say so in the task report — do not fake a pass).

### Task A1: Reserve the new query params

**Files:**
- Modify: `src/common/normalizeVariable.ts:8-18`
- Create: `test/unit/leaderboards/build-leaderboard-query-builtins.test.ts`

**Interfaces:**
- Produces: `RESERVED_QUERY_PARAMS` contains `"from"`, `"to"`, `"video"` (plus existing). `buildLeaderboardQueryPlan(params, defs, opts).builtins` carries them verbatim.

- [ ] **Step 1: Write the failing test**

```ts
// test/unit/leaderboards/build-leaderboard-query-builtins.test.ts
import { describe, expect, it } from "vitest";
import { buildLeaderboardQueryPlan } from "../../../src/leaderboards/build-leaderboard-query";
import { RESERVED_QUERY_PARAMS } from "../../../src/common/normalizeVariable";

describe("built-in filter params are reserved", () => {
    it("reserves from/to/video/country/verified", () => {
        for (const k of ["from", "to", "video", "country", "verified"]) {
            expect(RESERVED_QUERY_PARAMS.has(k)).toBe(true);
        }
    });

    it("routes them into plan.builtins untouched, never into filterParts", () => {
        const plan = buildLeaderboardQueryPlan(
            { from: "2024-01-01", to: "2024-06-30", video: "required", country: "NL", verified: "true" },
            [],
            { validCombinations: null },
        );
        expect(plan.builtins).toEqual({
            from: "2024-01-01", to: "2024-06-30", video: "required", country: "NL", verified: "true",
        });
        expect(plan.filterParts).toEqual([]);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project unit test/unit/leaderboards/build-leaderboard-query-builtins.test.ts`
Expected: FAIL — `from`/`to`/`video` not reserved (first test), and if any def matched they'd land elsewhere. If `buildLeaderboardQueryPlan`'s third argument shape differs, open `src/leaderboards/build-leaderboard-query.ts` and match its signature — do not change the function.

- [ ] **Step 3: Add the keys**

In `src/common/normalizeVariable.ts` extend the set:

```ts
export const RESERVED_QUERY_PARAMS: ReadonlySet<string> = new Set([
    "combined",
    "verified",
    "country",
    "year",       // legacy — reserved so no variable can take the name; no longer applied
    "from",
    "to",
    "video",
    "page",
    "pagesize",
    "timing",
    "view",
    "findrunner",
]);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project unit test/unit/leaderboards/build-leaderboard-query-builtins.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/common/normalizeVariable.ts test/unit/leaderboards/build-leaderboard-query-builtins.test.ts
git commit -m "feat(leaderboards): reserve from/to/video as built-in board filter params"
```

### Task A2: Built-in filter parsing + SQL condition builders

**Files:**
- Create: `src/leaderboards/builtin-filters.ts`
- Create: `test/unit/leaderboards/builtin-filters.test.ts`

**Interfaces:**
- Produces:
```ts
export interface BuiltinFilters {
    video: "required" | "missing" | null;
    from: Date | null;        // inclusive, 00:00:00 UTC of that day
    toExclusive: Date | null; // exclusive: 00:00:00 UTC of the day AFTER `to`
    country: string | null;   // upper-case alpha-2
}
export function parseBuiltinFilters(builtins: Record<string, string> | undefined): BuiltinFilters;
export function hasBuiltinFilters(f: BuiltinFilters): boolean;
export function isWindowed(f: BuiltinFilters): boolean; // from or toExclusive set
/** WHERE fragments for finished_runs (aliased via the drizzle table). */
export function runBuiltinConditions(f: BuiltinFilters): SQL[];
/** WHERE fragments for the raw-SQL manual_times query, aliases `mt` and `u`. */
export function manualTimeBuiltinConditions(f: BuiltinFilters): SQL[];
```

- [ ] **Step 1: Write the failing tests**

```ts
// test/unit/leaderboards/builtin-filters.test.ts
import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
    parseBuiltinFilters,
    hasBuiltinFilters,
    isWindowed,
    runBuiltinConditions,
    manualTimeBuiltinConditions,
} from "../../../src/leaderboards/builtin-filters";

const render = (parts: ReturnType<typeof runBuiltinConditions>) =>
    new PgDialect().sqlToQuery(sql.join(parts, sql` AND `));

describe("parseBuiltinFilters", () => {
    it("ignores junk and empty input", () => {
        expect(parseBuiltinFilters(undefined)).toEqual({ video: null, from: null, toExclusive: null, country: null });
        const f = parseBuiltinFilters({ video: "yes", from: "2024-13-40", to: "nope", country: "netherlands" });
        expect(f).toEqual({ video: null, from: null, toExclusive: null, country: null });
        expect(hasBuiltinFilters(f)).toBe(false);
    });

    it("parses valid values; `to` becomes an exclusive next-day bound", () => {
        const f = parseBuiltinFilters({ video: "missing", from: "2024-01-01", to: "2024-06-30", country: "nl" });
        expect(f.video).toBe("missing");
        expect(f.from?.toISOString()).toBe("2024-01-01T00:00:00.000Z");
        expect(f.toExclusive?.toISOString()).toBe("2024-07-01T00:00:00.000Z");
        expect(f.country).toBe("NL");
        expect(hasBuiltinFilters(f)).toBe(true);
        expect(isWindowed(f)).toBe(true);
    });

    it("a lone `to` is windowed too", () => {
        expect(isWindowed(parseBuiltinFilters({ to: "2020-12-31" }))).toBe(true);
        expect(isWindowed(parseBuiltinFilters({ video: "required" }))).toBe(false);
    });
});

describe("condition builders", () => {
    it("emit nothing when no filter is set", () => {
        const f = parseBuiltinFilters({});
        expect(runBuiltinConditions(f)).toEqual([]);
        expect(manualTimeBuiltinConditions(f)).toEqual([]);
    });

    it("video=required / missing on both sources", () => {
        const req = render(runBuiltinConditions(parseBuiltinFilters({ video: "required" }))).sql;
        expect(req).toContain(`"vod_url" is not null`);
        expect(req).toContain(`<> ''`);
        const miss = render(runBuiltinConditions(parseBuiltinFilters({ video: "missing" }))).sql;
        expect(miss).toMatch(/"vod_url" is null or .*= ''/);
        const mtReq = render(manualTimeBuiltinConditions(parseBuiltinFilters({ video: "required" }))).sql;
        expect(mtReq).toContain("mt.evidence_url is not null");
    });

    it("country goes through the users join on both sources", () => {
        const q = render(runBuiltinConditions(parseBuiltinFilters({ country: "NL" })));
        expect(q.sql).toContain(`"country" = `);
        expect(q.params).toEqual(["NL"]);
        const m = render(manualTimeBuiltinConditions(parseBuiltinFilters({ country: "NL" })));
        expect(m.sql).toContain("u.country = ");
        expect(m.params).toEqual(["NL"]);
    });

    it("date window: ended_at on runs, COALESCE(run_date, created_at) on manual times", () => {
        const f = parseBuiltinFilters({ from: "2024-01-01", to: "2024-01-31" });
        const r = render(runBuiltinConditions(f));
        expect(r.sql).toContain(`"ended_at" >= `);
        expect(r.sql).toContain(`"ended_at" < `);
        expect(r.params).toEqual([f.from, f.toExclusive]);
        const m = render(manualTimeBuiltinConditions(f));
        expect(m.sql).toContain("coalesce(mt.run_date, mt.created_at) >= ");
        expect(m.sql).toContain("coalesce(mt.run_date, mt.created_at) < ");
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project unit test/unit/leaderboards/builtin-filters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/leaderboards/builtin-filters.ts
import { sql, type SQL } from "drizzle-orm";
import { finishedRuns, users } from "../db/schema";

// Built-in board filters (verified excluded — it is folded into verifiedOnly
// by the caller and drives the ZSET split). Everything here rides the
// cache-bypass branch of getLeaderboard and applies to BOTH sources: flagged
// finished_runs and manual_times. See docs (frontend repo):
// docs/plans/2026-08-17-board-filters-design.md.

export interface BuiltinFilters {
    video: "required" | "missing" | null;
    /** Inclusive lower bound, 00:00:00Z of the `from` day. */
    from: Date | null;
    /** Exclusive upper bound, 00:00:00Z of the day after `to`. */
    toExclusive: Date | null;
    /** ISO-3166 alpha-2, upper-case. */
    country: string | null;
}

const EMPTY: BuiltinFilters = { video: null, from: null, toExclusive: null, country: null };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTRY_RE = /^[A-Za-z]{2}$/;

const parseDay = (raw: string | undefined): Date | null => {
    if (!raw || !DAY_RE.test(raw)) return null;
    const d = new Date(`${raw}T00:00:00.000Z`);
    // Reject impossible dates ("2024-13-40" parses to Invalid Date; "2024-02-30" rolls over).
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw) return null;
    return d;
};

export const parseBuiltinFilters = (builtins: Record<string, string> | undefined): BuiltinFilters => {
    if (!builtins) return { ...EMPTY };
    const video = builtins.video === "required" || builtins.video === "missing" ? builtins.video : null;
    const from = parseDay(builtins.from);
    const to = parseDay(builtins.to);
    const toExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : null;
    const country = builtins.country && COUNTRY_RE.test(builtins.country)
        ? builtins.country.toUpperCase()
        : null;
    return { video, from, toExclusive, country };
};

export const isWindowed = (f: BuiltinFilters): boolean => f.from !== null || f.toExclusive !== null;

export const hasBuiltinFilters = (f: BuiltinFilters): boolean =>
    f.video !== null || f.country !== null || isWindowed(f);

/** finished_runs conditions; assumes the query LEFT JOINs `users` (it does). */
export const runBuiltinConditions = (f: BuiltinFilters): SQL[] => {
    const conds: SQL[] = [];
    if (f.video === "required") {
        conds.push(sql`(${finishedRuns.vodUrl} IS NOT NULL AND ${finishedRuns.vodUrl} <> '')`);
    } else if (f.video === "missing") {
        conds.push(sql`(${finishedRuns.vodUrl} IS NULL OR ${finishedRuns.vodUrl} = '')`);
    }
    if (f.country) conds.push(sql`${users.country} = ${f.country}`);
    if (f.from) conds.push(sql`${finishedRuns.endedAt} >= ${f.from}`);
    if (f.toExclusive) conds.push(sql`${finishedRuns.endedAt} < ${f.toExclusive}`);
    return conds;
};

/** manual_times conditions for the raw-SQL query, aliases `mt` / `u`. */
export const manualTimeBuiltinConditions = (f: BuiltinFilters): SQL[] => {
    const conds: SQL[] = [];
    if (f.video === "required") {
        conds.push(sql`(mt.evidence_url IS NOT NULL AND mt.evidence_url <> '')`);
    } else if (f.video === "missing") {
        conds.push(sql`(mt.evidence_url IS NULL OR mt.evidence_url = '')`);
    }
    if (f.country) conds.push(sql`u.country = ${f.country}`);
    if (f.from) conds.push(sql`COALESCE(mt.run_date, mt.created_at) >= ${f.from}`);
    if (f.toExclusive) conds.push(sql`COALESCE(mt.run_date, mt.created_at) < ${f.toExclusive}`);
    return conds;
};
```

Drizzle lower-cases nothing in `sqlToQuery` output except what you write; if the assertions on casing fail, adjust the *test* strings to the exact rendered SQL (print `render(...).sql` once) — the intent is the column and operator, not the case.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project unit test/unit/leaderboards/builtin-filters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboards/builtin-filters.ts test/unit/leaderboards/builtin-filters.test.ts
git commit -m "feat(leaderboards): parse + render built-in board filters (video, country, date window)"
```

### Task A3: Apply built-ins in `queryPostgres` (both sources) and the as-of window path

**Files:**
- Modify: `src/leaderboards/get-leaderboard.ts` (`APPLIED_BUILTIN_KEYS`/`hasAppliedBuiltins`/`buildBuiltinConditions` ~lines 189-224, `fetchEligibleManualTimes` ~246-286, `getLeaderboard` ~326-336, `queryPostgres` ~462-660)
- Create: `test/integration/leaderboard-builtin-filters.test.ts`

**Interfaces:**
- Consumes: Task A2 exports.
- Produces: `getLeaderboard(query)` honours `builtins.video/from/to/country` on runs and manual times; when windowed, each runner's fastest in-window row ranks instead of the flagged row.

- [ ] **Step 1: Write the failing integration test**

Model on `test/integration/leaderboard-manual-time-drift.test.ts` (copy its `vi.mock` SSM header verbatim).

```ts
// test/integration/leaderboard-builtin-filters.test.ts
import { describe, expect, it, beforeAll, vi } from "vitest";
vi.mock("../../src/services/get-ssm-parameter", () => ({
    getSsmParameter: vi.fn(async (name: string) => {
        if (name === "database-url") return process.env.DATABASE_URL!;
        if (name === "redis-url") return process.env.REDIS_URL!;
        throw new Error(`Unexpected getSsmParameter("${name}")`);
    }),
}));
import { getDb } from "../../src/db";
import { games, categories, users, finishedRuns, manualTimes } from "../../src/db/schema";
import { convertToSearchable } from "../../src/common/convertToSearchable";
import { getLeaderboard } from "../../src/leaderboards/get-leaderboard";

describe("built-in board filters", () => {
    let gameId: number, categoryId: number, nlUserId: number, deUserId: number;
    const base = () => ({ gameId, categoryId, subcategoryKey: "", timing: "rt" as const, page: 1, pageSize: 25 });
    const names = (r: Awaited<ReturnType<typeof getLeaderboard>>) => r.items.map(i => i.runnerName);

    beforeAll(async () => {
        const db = await getDb();
        const stamp = Date.now();
        const [g] = await db.insert(games).values({ name: convertToSearchable(`builtin filters ${stamp}`), display: "BF" }).returning({ id: games.id });
        gameId = g.id;
        const [c] = await db.insert(categories).values({ gameId, name: "any", display: "Any%" }).returning({ id: categories.id });
        categoryId = c.id;
        const [nl] = await db.insert(users).values({ username: `bf-nl-${stamp}`, country: "NL" }).returning({ id: users.id });
        const [de] = await db.insert(users).values({ username: `bf-de-${stamp}`, country: "DE" }).returning({ id: users.id });
        nlUserId = nl.id; deUserId = de.id;

        // NL runner: PB 100s in 2025 (flagged, has video); older 2023 run 150s (unflagged, no video).
        await db.insert(finishedRuns).values([
            { gameId, categoryId, subcategoryKey: "", userId: nlUserId, runnerName: "nl", username: "nl",
              time: 100_000, endedAt: new Date("2025-03-01T12:00:00Z"), isLeaderboardEntry: true, vodUrl: "https://v/1" },
            { gameId, categoryId, subcategoryKey: "", userId: nlUserId, runnerName: "nl", username: "nl",
              time: 150_000, endedAt: new Date("2023-05-01T12:00:00Z"), isLeaderboardEntry: false },
            // DE runner: PB 120s in 2023 (flagged, no video), later slower 2025 run 130s.
            { gameId, categoryId, subcategoryKey: "", userId: deUserId, runnerName: "de", username: "de",
              time: 120_000, endedAt: new Date("2023-06-01T12:00:00Z"), isLeaderboardEntry: true },
            { gameId, categoryId, subcategoryKey: "", userId: deUserId, runnerName: "de", username: "de",
              time: 130_000, endedAt: new Date("2025-06-01T12:00:00Z"), isLeaderboardEntry: false },
        ]);
        // Guest manual time 110s dated 2023 with evidence.
        await db.insert(manualTimes).values({
            guestName: "guest-mt", gameId, categoryId, subcategoryKey: "", timing: "realtime", timeMs: 110_000,
            evidenceUrl: "https://v/mt", runDate: new Date("2023-07-01T00:00:00Z"), verificationStatus: "verified",
            source: "mod", createdBy: nlUserId, reason: "test",
        });
    });

    it("no filters: flagged rows + manual time, best-first", async () => {
        expect(names(await getLeaderboard(base()))).toEqual(["nl", "guest-mt", "de"]);
    });

    it("video=required keeps rows with a vod/evidence on both sources", async () => {
        expect(names(await getLeaderboard({ ...base(), builtins: { video: "required" } }))).toEqual(["nl", "guest-mt"]);
        expect(names(await getLeaderboard({ ...base(), builtins: { video: "missing" } }))).toEqual(["de"]);
    });

    it("country narrows to that country's users; guests never match", async () => {
        expect(names(await getLeaderboard({ ...base(), builtins: { country: "DE" } }))).toEqual(["de"]);
    });

    it("date window ranks each runner's fastest IN-WINDOW run, not the flagged PB", async () => {
        const r = await getLeaderboard({ ...base(), builtins: { from: "2023-01-01", to: "2023-12-31" } });
        // 2023: guest-mt 110s, de 120s (its 2023 PB), nl 150s (2023 run, not its 2025 PB)
        expect(names(r)).toEqual(["guest-mt", "de", "nl"]);
        expect(r.items.map(i => i.time)).toEqual([110_000, 120_000, 150_000]);
        expect(r.totalItems).toBe(3);
    });

    it("window + video compose", async () => {
        const r = await getLeaderboard({ ...base(), builtins: { from: "2023-01-01", to: "2023-12-31", video: "required" } });
        expect(names(r)).toEqual(["guest-mt"]);
    });

    it("a lone `to` in the past excludes newer runs", async () => {
        const r = await getLeaderboard({ ...base(), builtins: { to: "2024-12-31" } });
        expect(names(r)).toEqual(["guest-mt", "de", "nl"]);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project integration test/integration/leaderboard-builtin-filters.test.ts`
Expected: FAIL on the video/country/window cases (they are ignored today; the window case returns the flagged rows).

- [ ] **Step 3: Rewire `get-leaderboard.ts`**

(a) Replace the `APPLIED_BUILTIN_KEYS` / `hasAppliedBuiltins` / `buildBuiltinConditions` block (~lines 189-224) with:

```ts
import {
    parseBuiltinFilters, hasBuiltinFilters, isWindowed,
    runBuiltinConditions, manualTimeBuiltinConditions, type BuiltinFilters,
} from "./builtin-filters";

const deriveIsCombined = (builtins: Record<string, string> | undefined): boolean => {
    if (!builtins) return false;
    return builtins.combined === "1" || builtins.combined === "true";
};
```

(b) In `getLeaderboard`, compute `const bf = parseBuiltinFilters(builtins);` and change
`const hasFilters = (filterParts && filterParts.length > 0) || hasAppliedBuiltins(builtins);`
to
`const hasFilters = (filterParts && filterParts.length > 0) || hasBuiltinFilters(bf);`

(c) `fetchEligibleManualTimes` gains a trailing `extra: SQL[]` parameter and appends
`${extra.length ? sql`AND ${sql.join(extra, sql` AND `)}` : sql``}` after the verifiedOnly line inside the template. Import `type SQL` from drizzle-orm.

(d) In `queryPostgres`:

```ts
const bf = parseBuiltinFilters(builtins);
const windowed = isWindowed(bf);
const hasVarFilters = !!(filterParts && filterParts.length > 0);
const timeColumn = /* unchanged */;

const conditions: any[] = [
    eq(finishedRuns.gameId, gameId),
    eq(finishedRuns.categoryId, categoryId),
    eq(finishedRuns.leaderboardEligible, true),
    eq(finishedRuns.excluded, false),
];
if (windowed) {
    // As-of window: the flag marks today's PB; inside a window we want the
    // runner's fastest run that finished in the window, so rank raw rows.
    conditions.push(sql`${finishedRuns.verificationStatus} <> 'rejected'`);
    if (verifiedOnly) conditions.push(sql`${finishedRuns.verificationStatus} = 'verified'`);
    conditions.push(sql`${timeColumn} IS NOT NULL`);
} else {
    conditions.push(eq(entryFlag, true));
}
if (!isCombined) conditions.push(eq(finishedRuns.subcategoryKey, subcategoryKey));
conditions.push(...buildFilterPartConditions(filterParts));
conditions.push(...runBuiltinConditions(bf));

const selection = { /* the existing select object, unchanged */ };
const runnerKeySql = sql`COALESCE(${finishedRuns.userId}::text, 'g:' || ${finishedRuns.runnerName})`;
const runRows = windowed
    ? await db.selectDistinctOn([runnerKeySql], selection)
        .from(finishedRuns)
        .leftJoin(users, eq(users.id, finishedRuns.userId))
        .where(and(...conditions))
        .orderBy(runnerKeySql, asc(timeColumn!), asc(finishedRuns.id))
    : await db.select(selection)
        .from(finishedRuns)
        .leftJoin(users, eq(users.id, finishedRuns.userId))
        .where(and(...conditions))
        .orderBy(asc(timeColumn!), asc(finishedRuns.id));

// Manual times: variable filters still drop them (no variables); built-ins apply.
const manualRows = hasVarFilters
    ? []
    : await fetchEligibleManualTimes(
        gameId, categoryId, subcategoryKey, timing, verifiedOnly, isCombined,
        manualTimeBuiltinConditions(bf),
    );
```

Note `verifiedOnly` semantics differ by path: the flag path uses `isVerifiedEntry*` (already computed on the flagged row); the window path filters `verification_status` directly. Both mean "the row itself is verified".

If `selectDistinctOn` rejects a raw `SQL` in its column list (older drizzle typing), fall back to a raw query for the windowed branch: `db.execute(sql\`SELECT DISTINCT ON (${runnerKeySql}) … FROM finished_runs LEFT JOIN users … WHERE ${and(...conditions)} ORDER BY ${runnerKeySql}, ${timeColumn} ASC, ${finishedRuns.id} ASC\`)` mapping columns to the same `runRows` shape. Check `node_modules/drizzle-orm/pg-core/db.d.ts` for the signature first.

(e) Secondary timings: the window path must not borrow the runner's *current* other-clock PB. Where `sec` is computed in the page-item map:

```ts
const sec = item.source === "run" && !windowed
    ? lookupSecondary(secondary, item.userId, item.runnerName)
    : undefined;
```
and skip the fetch when windowed: `windowed ? Promise.resolve({ byUserId: {}, byGuestName: {} }) : fetchSecondaryTimings(...)`. The row's own `realTime`/`gameTime` then stand in.

(f) Update the doc comment on `LeaderboardQuery.builtins` to list `video`, `from`, `to`, `country` and remove `year` from the prose.

- [ ] **Step 4: Run tests**

Run: `npx vitest run --project integration test/integration/leaderboard-builtin-filters.test.ts test/integration/leaderboard-manual-time-drift.test.ts && npm test`
Expected: all PASS (drift test guards the unfiltered path didn't change).

- [ ] **Step 5: Commit**

```bash
git add src/leaderboards/get-leaderboard.ts test/integration/leaderboard-builtin-filters.test.ts
git commit -m "feat(leaderboards): video, country and as-of date-window board filters on both sources"
```

### Task A4: Facets on `/variables`

**Files:**
- Create: `src/leaderboards/board-facets.ts`
- Modify: `src/api/leaderboards/handler.ts:513-522` (the `/variables` branch)
- Modify: `test/integration/leaderboard-builtin-filters.test.ts` (add a facets case)

**Interfaces:**
- Produces: `getBoardFacets(gameId, categoryId): Promise<{ countries: string[]; minDate: string | null }>`; response body gains `facets`.

- [ ] **Step 1: Write the failing test** (append to the integration file's describe)

```ts
import { getBoardFacets } from "../../src/leaderboards/board-facets";
// …
it("facets: distinct countries of board runners + earliest date across both sources", async () => {
    const f = await getBoardFacets(gameId, categoryId);
    expect(f.countries).toEqual(["DE", "NL"]);
    expect(f.minDate).toBe("2023-05-01"); // earliest finished run; manual time is 2023-07-01
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project integration test/integration/leaderboard-builtin-filters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/leaderboards/board-facets.ts
import { sql } from "drizzle-orm";
import { getDb } from "../db";

export interface BoardFacets {
    /** Sorted ISO alpha-2 codes of users with an eligible entry in this category. */
    countries: string[];
    /** ISO date (YYYY-MM-DD) of the earliest eligible run / manual time; null when empty. */
    minDate: string | null;
}

// Category-wide (not per subcategory slice) on purpose: the popover only
// needs "values that exist somewhere on this category" so it never offers a
// country or a year with nothing behind it. Frontend caches /variables for
// hours, so this runs rarely.
export const getBoardFacets = async (gameId: number, categoryId: number): Promise<BoardFacets> => {
    const db = await getDb();
    const [countriesRes, datesRes] = await Promise.all([
        db.execute(sql`
            SELECT DISTINCT u.country AS country
            FROM finished_runs fr
            JOIN users u ON u.id = fr.user_id
            WHERE fr.game_id = ${gameId} AND fr.category_id = ${categoryId}
              AND (fr.is_leaderboard_entry OR fr.is_leaderboard_entry_gt)
              AND fr.leaderboard_eligible AND NOT fr.excluded
              AND u.country IS NOT NULL AND u.country <> ''
            UNION
            SELECT DISTINCT u.country
            FROM manual_times mt
            JOIN users u ON u.id = mt.user_id
            WHERE mt.game_id = ${gameId} AND mt.category_id = ${categoryId}
              AND mt.verification_status <> 'rejected'
              AND u.country IS NOT NULL AND u.country <> ''
            ORDER BY country
        `),
        db.execute(sql`
            SELECT LEAST(
                (SELECT MIN(ended_at) FROM finished_runs
                  WHERE game_id = ${gameId} AND category_id = ${categoryId}
                    AND leaderboard_eligible AND NOT excluded),
                (SELECT MIN(COALESCE(run_date, created_at)) FROM manual_times
                  WHERE game_id = ${gameId} AND category_id = ${categoryId}
                    AND verification_status <> 'rejected')
            ) AS min_date
        `),
    ]);
    const countries = countriesRes.rows.map((r: any) => String(r.country).toUpperCase());
    const raw = (datesRes.rows[0] as any)?.min_date;
    const minDate = raw ? new Date(raw).toISOString().slice(0, 10) : null;
    return { countries, minDate };
};
```

`LEAST` ignores NULLs in Postgres, so a category with only one source still gets a date.

In `handler.ts` `/variables` branch:

```ts
const [variables, validCombinations, facets] = await Promise.all([
    getVariableDefs(game.id, category.id),
    getValidCombinationsSet(game.id, category.id),
    getBoardFacets(game.id, category.id).catch(() => ({ countries: [], minDate: null })),
]);
return ok(JSON.stringify({
    variables,
    reservedParams: Array.from(RESERVED_QUERY_PARAMS),
    validCombinations: /* unchanged */,
    facets,
}));
```
(the `.catch` keeps the board up if the facet query ever fails).

- [ ] **Step 4: Run tests**

Run: `npx vitest run --project integration test/integration/leaderboard-builtin-filters.test.ts && npm test && npx tsc --noEmit -p .`
Expected: PASS; tsc no new errors in touched files.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboards/board-facets.ts src/api/leaderboards/handler.ts test/integration/leaderboard-builtin-filters.test.ts
git commit -m "feat(leaderboards): /variables carries board facets (countries, earliest date)"
```

### Task A5: Handoff doc, push, deploy watch

**Files:**
- Create: `docs/frontend-guide-board-filters.md` (backend repo) — copy of the *Filter set*, *As-of window* and *`/variables` facets* sections of the design doc plus the exact response shape:
```ts
// GET /v1/leaderboards/{game}/{category}/variables
{ variables, reservedParams, validCombinations, facets: { countries: string[], minDate: string | null } }
// GET /v1/leaderboards/{game}/{category}?timing=rt&verified=true&video=required&from=2024-01-01&to=2024-06-30&country=NL&<var>=<value>
```

- [ ] **Step 1: Write and commit the guide**

```bash
git add docs/frontend-guide-board-filters.md && git commit -m "docs(leaderboards): frontend guide for board built-in filters"
```

- [ ] **Step 2: Push the branch and STOP for Joey**

`git push -u origin board-builtin-filters`. Pushing `main` deploys production; only merge/push main when Joey says so. When he does: `git checkout main && git merge --ff-only board-builtin-filters && git push`, then watch `gh run list --limit 1` until success and run `/home/joey/therun/.claude/monitoring/check-health.sh 15` now, +5, +10, +15 min; confirm `curl -s 'https://api.therun.gg/v1/leaderboards/super-mario-64/120-star/variables' | jq .facets` and a `?video=required` board return 200.

---

## Part B — Frontend (`/home/joey/therun/therun-fr`, branch `board-filters`)

Tests: `npx vitest run <file>`. Typecheck: `npm run typecheck 2>&1 | grep '<touched file>'` (baseline is dirty). Formatting: `npx @biomejs/biome check --write <files>`.

### Task B1: Pure built-in filter param helpers

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/filters/builtin-params.ts`
- Create: `app/(new-layout)/games-v2/[game]/filters/builtin-params.test.ts`

**Interfaces:**
- Produces:
```ts
export type VideoFilter = 'required' | 'missing';
export interface BuiltinFilterState {
    verified: boolean;
    video: VideoFilter | null;
    from: string | null;    // 'YYYY-MM-DD'
    to: string | null;
    country: string | null; // 'NL'
}
export const BUILTIN_PARAM_KEYS = ['verified', 'video', 'from', 'to', 'country'] as const;
export function parseBuiltinParams(sp: Record<string, string | undefined>): BuiltinFilterState;
export function countBuiltinFilters(s: BuiltinFilterState): number; // range counts once
export function hasBuiltinFilters(s: BuiltinFilterState): boolean;
export function isValidDay(s: string): boolean;
```

- [ ] **Step 1: Write the failing test**

```ts
// builtin-params.test.ts
import { describe, expect, it } from 'vitest';
import {
    countBuiltinFilters,
    hasBuiltinFilters,
    parseBuiltinParams,
} from './builtin-params';

describe('parseBuiltinParams', () => {
    it('is all-off for empty input', () => {
        const s = parseBuiltinParams({});
        expect(s).toEqual({ verified: false, video: null, from: null, to: null, country: null });
        expect(hasBuiltinFilters(s)).toBe(false);
        expect(countBuiltinFilters(s)).toBe(0);
    });
    it('accepts valid values and upper-cases country', () => {
        const s = parseBuiltinParams({ verified: 'true', video: 'missing', from: '2024-01-01', to: '2024-06-30', country: 'nl' });
        expect(s).toEqual({ verified: true, video: 'missing', from: '2024-01-01', to: '2024-06-30', country: 'NL' });
        expect(countBuiltinFilters(s)).toBe(4); // verified, video, range (once), country
    });
    it('drops junk instead of forwarding it', () => {
        const s = parseBuiltinParams({ verified: 'yes', video: 'maybe', from: '2024-02-30', to: 'x', country: 'NLD' });
        expect(s).toEqual({ verified: false, video: null, from: null, to: null, country: null });
    });
    it('a lone from or to still counts as one range filter', () => {
        expect(countBuiltinFilters(parseBuiltinParams({ from: '2020-01-01' }))).toBe(1);
        expect(countBuiltinFilters(parseBuiltinParams({ to: '2020-01-01' }))).toBe(1);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/filters/builtin-params.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// builtin-params.ts
// URL <-> state for the board's built-in filters. Pure; shared by the server
// loader (data.ts), the popover, the band chips and Clear filters so every
// surface agrees on what "active" means and what a valid value looks like.

export type VideoFilter = 'required' | 'missing';

export interface BuiltinFilterState {
    verified: boolean;
    video: VideoFilter | null;
    /** 'YYYY-MM-DD', inclusive. */
    from: string | null;
    to: string | null;
    /** ISO-3166 alpha-2, upper-case. */
    country: string | null;
}

export const BUILTIN_PARAM_KEYS = ['verified', 'video', 'from', 'to', 'country'] as const;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(s: string): boolean {
    if (!DAY_RE.test(s)) return false;
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function parseBuiltinParams(sp: Record<string, string | undefined>): BuiltinFilterState {
    const video = sp.video === 'required' || sp.video === 'missing' ? sp.video : null;
    const from = sp.from && isValidDay(sp.from) ? sp.from : null;
    const to = sp.to && isValidDay(sp.to) ? sp.to : null;
    const country = sp.country && /^[A-Za-z]{2}$/.test(sp.country) ? sp.country.toUpperCase() : null;
    return { verified: sp.verified === 'true', video, from, to, country };
}

export function countBuiltinFilters(s: BuiltinFilterState): number {
    return (
        (s.verified ? 1 : 0) +
        (s.video ? 1 : 0) +
        (s.from || s.to ? 1 : 0) +
        (s.country ? 1 : 0)
    );
}

export function hasBuiltinFilters(s: BuiltinFilterState): boolean {
    return countBuiltinFilters(s) > 0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/filters/builtin-params.ts" "app/(new-layout)/games-v2/[game]/filters/builtin-params.test.ts"
git commit -m "feat(board): built-in filter param parsing"
```

### Task B2: Contract mirror + query plumbing

**Files:**
- Modify: `types/leaderboards.types.ts:168-172` (`VariablesResponse`)
- Modify: `src/lib/leaderboards-v1.ts:18-36` (`LeaderboardQuery`), `:48-63` (`buildLeaderboardQS`), `:203-222` (`getVariables`)
- Modify: `app/(new-layout)/games-v2/[game]/types.ts:15-24` (`GamePageSearchParams`), `:26-` (`GamePageData.facets`, `activeFilters`)
- Modify: `app/(new-layout)/games-v2/[game]/data.ts:39-49, 140-160, 207-230, ~364`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx:36-56` (query + key), `:148-153` (`filtersActive`)
- Modify: `app/(new-layout)/games-v2/[game]/filters/clear-filters-button.tsx`

**Interfaces:**
- Consumes: B1 `parseBuiltinParams`, `BuiltinFilterState`, `hasBuiltinFilters`, `BUILTIN_PARAM_KEYS`.
- Produces:
  - `VariablesResponse.facets?: BoardFacets` where `export interface BoardFacets { countries: string[]; minDate: string | null }`.
  - `LeaderboardQuery` gains `video?: 'required' | 'missing'; from?: string; to?: string; country?: string;`.
  - `GamePageData.facets: BoardFacets` (defaulted `{ countries: [], minDate: null }` when the backend omits it) and `GamePageData.activeFilters.builtins: BuiltinFilterState` (keep the existing `verified: boolean` too — many call sites read it).

- [ ] **Step 1: Types**

`types/leaderboards.types.ts`:
```ts
export interface BoardFacets {
    /** Sorted alpha-2 codes of runners on this category's boards. */
    countries: string[];
    /** Earliest run/manual-time date, 'YYYY-MM-DD'; null for an empty category. */
    minDate: string | null;
}
export interface VariablesResponse {
    variables: VariableRow[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
    /** Absent on backends that predate board built-in filters. */
    facets?: BoardFacets;
}
```

`src/lib/leaderboards-v1.ts` — extend `LeaderboardQuery`:
```ts
    verified?: boolean;
    /** Built-in narrowing filters; see docs/plans/2026-08-17-board-filters-design.md. */
    video?: 'required' | 'missing';
    /** 'YYYY-MM-DD' inclusive bounds of the as-of window. */
    from?: string;
    to?: string;
    /** ISO alpha-2. */
    country?: string;
```
`buildLeaderboardQS` after the `verified` line:
```ts
    if (q.video) sp.set('video', q.video);
    if (q.from) sp.set('from', q.from);
    if (q.to) sp.set('to', q.to);
    if (q.country) sp.set('country', q.country);
```
`getVariables` return type + body: add `facets: body.facets ?? { countries: [], minDate: null }` (and the type `facets: BoardFacets`).

- [ ] **Step 2: Search-param parsing (`data.ts`)**

- `RESERVED_LOWER` add `'from'`, `'to'`, `'video'` (keep `'year'`).
- Import `parseBuiltinParams` from `./filters/builtin-params`. Replace `const verified = sp.verified === 'true';` with
```ts
    const builtins = parseBuiltinParams(sp);
    const verified = builtins.verified;
```
- `baseQuery` gains:
```ts
        video: builtins.video ?? undefined,
        from: builtins.from ?? undefined,
        to: builtins.to ?? undefined,
        country: builtins.country ?? undefined,
```
- Returned `GamePageData`: add `facets: varsResp.facets` and inside `activeFilters` add `builtins`. The empty-board fallback around line 364 gets `builtins: parseBuiltinParams({})` and `facets: { countries: [], minDate: null }`.
- `types.ts`: `GamePageSearchParams` add `video?: string; from?: string; to?: string; country?: string;`; `GamePageData` add `facets: BoardFacets;` and `activeFilters.builtins: BuiltinFilterState;`.

- [ ] **Step 3: `game-page.tsx`**

In the pager `query={{ … }}` object (≈ line 38) add
```ts
video: data.activeFilters.builtins.video ?? undefined,
from: data.activeFilters.builtins.from ?? undefined,
to: data.activeFilters.builtins.to ?? undefined,
country: data.activeFilters.builtins.country ?? undefined,
```
and in the pager `key` (≈ line 36) append `|${JSON.stringify(data.activeFilters.builtins)}`.
`filtersActive` (≈ line 148): add `|| hasBuiltinFilters(data.activeFilters.builtins)` (import from `./filters/builtin-params`).

- [ ] **Step 4: `clear-filters-button.tsx`**

Replace `sp.delete('verified');` with `for (const k of BUILTIN_PARAM_KEYS) sp.delete(k);` (import `BUILTIN_PARAM_KEYS`).

- [ ] **Step 5: Verify**

Run: `npm run typecheck 2>&1 | grep -E "data.ts|game-page.tsx|leaderboards-v1|clear-filters|types.ts" ; npx vitest run "app/(new-layout)/games-v2/\[game\]"`
Expected: no lines from grep; existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add types/leaderboards.types.ts src/lib/leaderboards-v1.ts "app/(new-layout)/games-v2/[game]/types.ts" "app/(new-layout)/games-v2/[game]/data.ts" "app/(new-layout)/games-v2/[game]/game-page.tsx" "app/(new-layout)/games-v2/[game]/filters/clear-filters-button.tsx"
git commit -m "feat(board): built-in filters ride the board query, facets mirrored"
```

### Task B3: `useBuiltinFilterNav` — one URL mutation path for built-ins

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/filters/use-builtin-filter-nav.ts`

**Interfaces:**
- Consumes: `useBoardNav()` (`navigate(url, key)`, `isPending`, `pendingKey`).
- Produces:
```ts
export function useBuiltinFilterNav(): {
    setBuiltin: (key: 'verified' | 'video' | 'from' | 'to' | 'country', value: string | null) => void; // null deletes
    setRange: (from: string | null, to: string | null) => void; // both at once
    isPending: boolean;
    pendingKey: string | null;
};
```
Pending key format: `builtin:<key>` (`builtin:range` for `setRange`).

- [ ] **Step 1: Implement** (no separate test — exercised by B4/B5 component tests)

```ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useBoardNav } from './use-board-nav';

type BuiltinKey = 'verified' | 'video' | 'from' | 'to' | 'country';

/**
 * Single URL-mutation path for the built-in filters (verified / video / date
 * range / country) — the popover rows and the band's removable chips both go
 * through here so a chip "×" yields exactly the URL the popover would.
 * Delegates the transition to `useBoardNav` for the shared pending/dim state.
 */
export function useBuiltinFilterNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const push = (mutate: (sp: URLSearchParams) => void, key: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        mutate(sp);
        sp.delete('page');
        const qs = sp.toString();
        navigate(qs ? `${pathname}?${qs}` : pathname, key);
    };

    const setBuiltin = (key: BuiltinKey, value: string | null) =>
        push((sp) => {
            if (value === null || value === '') sp.delete(key);
            else sp.set(key, value);
        }, `builtin:${key}`);

    const setRange = (from: string | null, to: string | null) =>
        push((sp) => {
            if (from) sp.set('from', from);
            else sp.delete('from');
            if (to) sp.set('to', to);
            else sp.delete('to');
        }, 'builtin:range');

    return { setBuiltin, setRange, isPending, pendingKey };
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/filters/use-builtin-filter-nav.ts"
git commit -m "feat(board): one nav path for built-in filter params"
```

### Task B4: Filters popover — always rendered, built-in rows

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/filters/filters-popover.tsx` (rewrite)
- Create: `app/(new-layout)/games-v2/[game]/filters/builtin-filter-rows.tsx`
- Create: `app/(new-layout)/games-v2/[game]/filters/filters-popover.module.scss`
- Create: `app/(new-layout)/games-v2/[game]/filters/filters-popover.test.tsx`
- Delete: `app/(new-layout)/games-v2/[game]/filters/verified-toggle.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx:17-18, 580-586` and `leaderboard-pager.test.tsx:44-45`

**Interfaces:**
- Consumes: B1 (`BuiltinFilterState`, `countBuiltinFilters`), B3 (`useBuiltinFilterNav`), `BoardFacets`, `VariablePills`, `usePopoverFocus`, `countries()` from `~src/common/countries`.
- Produces:
```tsx
export function FiltersPopover(props: {
    defs: VariableRow[];
    selectedVarFilters: Record<string, string>;
    builtins: BuiltinFilterState;
    facets: BoardFacets;
}): JSX.Element;   // never null
export function BuiltinFilterRows(props: { builtins: BuiltinFilterState; facets: BoardFacets }): JSX.Element;
```

- [ ] **Step 1: Write the failing test**

```tsx
// filters-popover.test.tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FiltersPopover } from './filters-popover';

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/games-v2/sm64',
    useSearchParams: () => new URLSearchParams('category=120-star&page=3'),
}));
vi.mock('./use-board-nav', () => ({
    useBoardNav: () => ({ navigate: nav.navigate, isPending: false, pendingKey: null }),
}));
vi.mock('./variable-pills', () => ({
    VariablePills: () => <div data-testid="variable-pills" />,
}));

const off = { verified: false, video: null, from: null, to: null, country: null };
const facets = { countries: ['DE', 'NL'], minDate: '2019-04-02' };

const open = () => fireEvent.click(screen.getByRole('button', { name: /filters/i }));

describe('FiltersPopover', () => {
    beforeEach(() => nav.navigate.mockReset());

    it('renders the button with no variable filters and no active count', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{}} builtins={off} facets={facets} />);
        const btn = screen.getByRole('button', { name: /filters/i });
        expect(btn).toBeTruthy();
        expect(btn.textContent).not.toMatch(/\d/);
    });

    it('badge counts built-ins + variable values', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{ route: 'a,b' }}
            builtins={{ ...off, verified: true, from: '2024-01-01' }} facets={facets} />);
        expect(screen.getByRole('button', { name: /filters/i }).textContent).toContain('4');
    });

    it('verified row toggles ?verified=true and drops page', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{}} builtins={off} facets={facets} />);
        open();
        fireEvent.click(screen.getByRole('switch', { name: /verified runs only/i }));
        expect(nav.navigate).toHaveBeenCalledWith('/games-v2/sm64?category=120-star&verified=true', 'builtin:verified');
    });

    it('video segmented control sets and clears ?video', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{}} builtins={{ ...off, video: 'required' }} facets={facets} />);
        open();
        fireEvent.click(screen.getByRole('radio', { name: /^missing$/i }));
        expect(nav.navigate).toHaveBeenLastCalledWith('/games-v2/sm64?category=120-star&video=missing', 'builtin:video');
        fireEvent.click(screen.getByRole('radio', { name: /^any$/i }));
        expect(nav.navigate).toHaveBeenLastCalledWith('/games-v2/sm64?category=120-star', 'builtin:video');
    });

    it('date inputs carry the facet floor and navigate on change', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{}} builtins={off} facets={facets} />);
        open();
        const from = screen.getByLabelText(/^from$/i) as HTMLInputElement;
        expect(from.min).toBe('2019-04-02');
        fireEvent.change(from, { target: { value: '2024-01-01' } });
        expect(nav.navigate).toHaveBeenCalledWith('/games-v2/sm64?category=120-star&from=2024-01-01', 'builtin:range');
    });

    it('country select lists only facet countries and navigates', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{}} builtins={off} facets={facets} />);
        open();
        const sel = screen.getByLabelText(/^country$/i) as HTMLSelectElement;
        expect(Array.from(sel.options).map((o) => o.value)).toEqual(['', 'DE', 'NL']);
        fireEvent.change(sel, { target: { value: 'NL' } });
        expect(nav.navigate).toHaveBeenCalledWith('/games-v2/sm64?category=120-star&country=NL', 'builtin:country');
    });

    it('hides the country row when facets are empty; still shows the rest', () => {
        render(<FiltersPopover defs={[]} selectedVarFilters={{}} builtins={off} facets={{ countries: [], minDate: null }} />);
        open();
        expect(screen.queryByLabelText(/^country$/i)).toBeNull();
        expect(screen.getByRole('switch', { name: /verified runs only/i })).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/filters/filters-popover.test.tsx"`
Expected: FAIL (props unknown; popover returns null with no defs).

- [ ] **Step 3: Implement the rows**

```tsx
// builtin-filter-rows.tsx
'use client';

import type { BoardFacets } from '../../../../../types/leaderboards.types';
import { countries } from '~src/common/countries';
import type { BuiltinFilterState, VideoFilter } from './builtin-params';
import styles from './filters-popover.module.scss';
import { useBuiltinFilterNav } from './use-builtin-filter-nav';

interface Props {
    builtins: BuiltinFilterState;
    facets: BoardFacets;
}

const VIDEO_OPTIONS: Array<{ value: VideoFilter | ''; label: string }> = [
    { value: '', label: 'Any' },
    { value: 'required', label: 'Required' },
    { value: 'missing', label: 'Missing' },
];

/**
 * The built-in rows of the Filters popover: Verified · Video · Date range ·
 * Country. Each control writes the URL immediately through
 * useBuiltinFilterNav — the URL is the state, the board applies optimistically.
 */
export function BuiltinFilterRows({ builtins, facets }: Props) {
    const { setBuiltin, setRange, isPending } = useBuiltinFilterNav();
    const today = new Date().toISOString().slice(0, 10);
    const names = countries() as Record<string, string>;

    return (
        <div className={styles.rows}>
            <div className={styles.row}>
                <span className={styles.rowLabel} id="flt-verified-label">
                    Verified runs only
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={builtins.verified}
                    aria-labelledby="flt-verified-label"
                    disabled={isPending}
                    className={`${styles.switch} ${builtins.verified ? styles.switchOn : ''}`}
                    onClick={() => setBuiltin('verified', builtins.verified ? null : 'true')}
                >
                    <span className={styles.switchKnob} aria-hidden />
                </button>
            </div>

            <div className={styles.row}>
                <span className={styles.rowLabel} id="flt-video-label">
                    Video
                </span>
                <div className={styles.segmented} role="radiogroup" aria-labelledby="flt-video-label">
                    {VIDEO_OPTIONS.map((o) => {
                        const active = (builtins.video ?? '') === o.value;
                        return (
                            <button
                                key={o.value || 'any'}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                disabled={isPending}
                                className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
                                onClick={() => setBuiltin('video', o.value || null)}
                            >
                                {o.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={styles.row}>
                <span className={styles.rowLabel}>Date range</span>
                <div className={styles.dates}>
                    <label className={styles.dateField}>
                        <span>From</span>
                        <input
                            type="date"
                            value={builtins.from ?? ''}
                            min={facets.minDate ?? undefined}
                            max={builtins.to ?? today}
                            disabled={isPending}
                            onChange={(e) => setRange(e.target.value || null, builtins.to)}
                        />
                    </label>
                    <label className={styles.dateField}>
                        <span>To</span>
                        <input
                            type="date"
                            value={builtins.to ?? ''}
                            min={builtins.from ?? facets.minDate ?? undefined}
                            max={today}
                            disabled={isPending}
                            onChange={(e) => setRange(builtins.from, e.target.value || null)}
                        />
                    </label>
                </div>
                <p className={styles.rowHint}>
                    The board as it stood counting only runs finished in this range.
                </p>
            </div>

            {facets.countries.length > 0 && (
                <div className={styles.row}>
                    <label className={styles.rowLabel} htmlFor="flt-country">
                        Country
                    </label>
                    <select
                        id="flt-country"
                        className={styles.select}
                        value={builtins.country ?? ''}
                        disabled={isPending}
                        onChange={(e) => setBuiltin('country', e.target.value || null)}
                    >
                        <option value="">Any</option>
                        {facets.countries.map((c) => (
                            <option key={c} value={c}>
                                {names[c] ?? c}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
```

`filters-popover.tsx` becomes:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Sliders } from 'react-bootstrap-icons';
import type { BoardFacets, VariableRow } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import mastheadStyles from '../header/masthead.module.scss';
import { usePopoverFocus } from '../shared/use-popover-focus';
import { BuiltinFilterRows } from './builtin-filter-rows';
import { type BuiltinFilterState, countBuiltinFilters } from './builtin-params';
import panelStyles from './filters-popover.module.scss';
import { VariablePills } from './variable-pills';

interface Props {
    defs: VariableRow[];
    selectedVarFilters: Record<string, string>;
    builtins: BuiltinFilterState;
    facets: BoardFacets;
}

// Always rendered: the built-in rows (Verified / Video / Date range / Country)
// exist on every board; the per-category filter pills join below when the
// category defines any.
export function FiltersPopover({ defs, selectedVarFilters, builtins, facets }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const filterDefs = defs.filter((d) => d.role === 'filter');
    const varCount = Object.values(selectedVarFilters).reduce(
        (n, v) => n + v.split(',').filter(Boolean).length,
        0,
    );
    const count = countBuiltinFilters(builtins) + varCount;

    const close = () => setOpen(false);
    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={`${mastheadStyles.chip} ${count > 0 ? mastheadStyles.chipActive : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <Sliders size={13} aria-hidden />
                Filters
                {count > 0 && <span className={styles.filterCount}>{count}</span>}
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={`${styles.popoverPanel} ${panelStyles.panel}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filters"
                >
                    <BuiltinFilterRows builtins={builtins} facets={facets} />
                    {filterDefs.length > 0 && (
                        <>
                            <hr className={panelStyles.divider} />
                            <VariablePills defs={filterDefs} selected={selectedVarFilters} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
```

`filters-popover.module.scss` (use the board's tokens; check `_board.scss` mixins used by `game-page.module.scss` for the exact `@use` lines and copy them):

```scss
@use '~src/styles/design-tokens' as dt;   // match game-page.module.scss's actual @use paths
@use '../shared/board' as board;           // ditto

.panel { min-width: 22rem; max-width: min(28rem, calc(100vw - 2rem)); }
.rows { display: flex; flex-direction: column; gap: dt.$spacing-md; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: dt.$spacing-xs dt.$spacing-sm; }
.rowLabel { flex: 0 0 7.5rem; font-size: dt.$font-size-xs; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; opacity: 0.8; }
.rowHint { flex-basis: 100%; margin: 0; font-size: dt.$font-size-2xs; opacity: 0.7; }
.segmented { display: inline-flex; border: 1px solid var(--bs-border-color); border-radius: 999px; overflow: hidden; }
.segment { @include board.control-pill; border: 0; border-radius: 0; }
.segmentActive { background: rgba(var(--bs-primary-rgb), 0.18); }
.switch { width: 2.25rem; height: 1.25rem; border-radius: 999px; border: 1px solid var(--bs-border-color); background: transparent; position: relative; padding: 0; }
.switchOn { background: rgba(var(--bs-primary-rgb), 0.35); border-color: rgba(var(--bs-primary-rgb), 0.6); }
.switchKnob { position: absolute; top: 2px; left: 2px; width: calc(1.25rem - 6px); height: calc(1.25rem - 6px); border-radius: 50%; background: currentColor; transition: transform 120ms; }
.switchOn .switchKnob { transform: translateX(1rem); }
.dates { display: flex; gap: dt.$spacing-sm; }
.dateField { display: flex; flex-direction: column; gap: 2px; font-size: dt.$font-size-2xs; input { font: inherit; padding: 2px dt.$spacing-xs; } }
.select { font: inherit; padding: 2px dt.$spacing-xs; max-width: 14rem; }
.divider { margin: 0; opacity: 0.4; }
```
If `board.control-pill` or a token name does not exist, open `app/(new-layout)/games-v2/[game]/game-page.module.scss` and reuse whatever it uses for `.rulesToggle` — do not invent tokens.

Delete `verified-toggle.tsx`. In `leaderboard-pager.tsx`: remove the `VerifiedToggle` import and the `<VerifiedToggle …/>` line; pass `builtins={query.builtins}`… — no: the pager only has `query: Omit<LeaderboardQuery,'page'>`. Add two props to `LeaderboardPager` (`builtins: BuiltinFilterState; facets: BoardFacets;`), pass them from `game-page.tsx` (`data.activeFilters.builtins`, `data.facets`) and forward to `<FiltersPopover defs={variableDefs} selectedVarFilters={selectedVarFilters} builtins={builtins} facets={facets} />`. In `leaderboard-pager.test.tsx` delete the `verified-toggle` mock line and add `builtins`/`facets` to the pager's rendered props (search the file for where `<LeaderboardPager` is rendered and add `builtins={{ verified: false, video: null, from: null, to: null, country: null }} facets={{ countries: [], minDate: null }}`).

- [ ] **Step 4: Run tests**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/filters/filters-popover.test.tsx" "app/(new-layout)/games-v2/\[game\]/leaderboard/leaderboard-pager.test.tsx"` then `npm run typecheck 2>&1 | grep -E "filters/|leaderboard-pager|game-page.tsx"`
Expected: PASS; no typecheck lines. Then `npx @biomejs/biome check --write "app/(new-layout)/games-v2/[game]/filters"`.

- [ ] **Step 5: Commit**

```bash
git add -A "app/(new-layout)/games-v2/[game]/filters" "app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx" "app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.test.tsx" "app/(new-layout)/games-v2/[game]/game-page.tsx"
git commit -m "feat(board): the Filters popover always renders and holds Verified, Video, Date range, Country"
```

### Task B5: Band chips for built-ins + FilterBar gating

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/filters/active-filter-chips.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/header/board-masthead.tsx:62-64, 164-176`
- Create: `app/(new-layout)/games-v2/[game]/filters/active-filter-chips.test.tsx`

**Interfaces:**
- `ActiveFilterChips` props gain `builtins: BuiltinFilterState`; `FilterBar` props gain `builtins: BuiltinFilterState`.
- Chip labels: `Verified`, `Video required`, `No video`, `2024-01-01 – 2024-06-30` / `from 2024-01-01` / `until 2024-06-30`, `<CountryFlag/> Netherlands`.

- [ ] **Step 1: Write the failing test**

```tsx
// active-filter-chips.test.tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActiveFilterChips } from './active-filter-chips';

const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('next/navigation', () => ({
    usePathname: () => '/games-v2/sm64',
    useSearchParams: () => new URLSearchParams('verified=true&video=missing&from=2024-01-01&to=2024-06-30&country=NL&page=2'),
}));
vi.mock('./use-board-nav', () => ({
    useBoardNav: () => ({ navigate: nav.navigate, isPending: false, pendingKey: null }),
}));
vi.mock('../leaderboard/country-flag', () => ({ CountryFlag: () => <span data-testid="flag" /> }));

const builtins = { verified: true, video: 'missing' as const, from: '2024-01-01', to: '2024-06-30', country: 'NL' };

describe('ActiveFilterChips built-ins', () => {
    it('renders one chip per built-in with plain labels', () => {
        render(<ActiveFilterChips defs={[]} selected={{}} builtins={builtins} />);
        for (const label of ['Verified', 'No video', '2024-01-01 – 2024-06-30', 'Netherlands']) {
            expect(screen.getByRole('button', { name: new RegExp(`remove .*${label}`, 'i') })).toBeTruthy();
        }
    });
    it('× on the range chip clears both bounds and page', () => {
        render(<ActiveFilterChips defs={[]} selected={{}} builtins={builtins} />);
        fireEvent.click(screen.getByRole('button', { name: /remove .*2024-01-01 – 2024-06-30/i }));
        expect(nav.navigate).toHaveBeenLastCalledWith(
            '/games-v2/sm64?verified=true&video=missing&country=NL', 'builtin:range');
    });
    it('renders nothing with no filters at all', () => {
        const { container } = render(<ActiveFilterChips defs={[]} selected={{}}
            builtins={{ verified: false, video: null, from: null, to: null, country: null }} />);
        expect(container.firstChild).toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]/filters/active-filter-chips.test.tsx"`
Expected: FAIL — `builtins` prop unknown / no chips.

- [ ] **Step 3: Implement**

`active-filter-chips.tsx`: add `builtins: BuiltinFilterState` to props; import `useBuiltinFilterNav`, `CountryFlag` (`../leaderboard/country-flag`), `countries` (`~src/common/countries`). Build a `builtinChips` array before the variable chips:

```tsx
const { setBuiltin, setRange } = useBuiltinFilterNav();
const names = countries() as Record<string, string>;
const rangeLabel =
    builtins.from && builtins.to ? `${builtins.from} – ${builtins.to}`
    : builtins.from ? `from ${builtins.from}`
    : builtins.to ? `until ${builtins.to}` : null;

const builtinChips: Array<{ key: string; label: React.ReactNode; text: string; onRemove: () => void }> = [];
if (builtins.verified) builtinChips.push({ key: 'verified', label: 'Verified', text: 'Verified', onRemove: () => setBuiltin('verified', null) });
if (builtins.video) {
    const text = builtins.video === 'required' ? 'Video required' : 'No video';
    builtinChips.push({ key: 'video', label: text, text, onRemove: () => setBuiltin('video', null) });
}
if (rangeLabel) builtinChips.push({ key: 'range', label: rangeLabel, text: rangeLabel, onRemove: () => setRange(null, null) });
if (builtins.country) {
    const name = names[builtins.country] ?? builtins.country;
    builtinChips.push({
        key: 'country', text: name,
        label: (<><CountryFlag country={builtins.country} /> {name}</>),
        onRemove: () => setBuiltin('country', null),
    });
}
```
Render them first inside the same `role="group"` with `className={styles.activeChip}` and `aria-label={`Remove ${text} filter`}` (no `activeChipKey` prefix — the label already says what it is). The early return becomes `if (builtinChips.length === 0 && chips.length === 0) return null;`.

`filter-bar.tsx`: add `builtins` prop, pass to `ActiveFilterChips`, and change the guard to `if (!hasSubcategories && !hasVarFilters && !hasBuiltinFilters(builtins)) return null;`.

`board-masthead.tsx`: `showFilterTier` adds `|| hasBuiltinFilters(data.activeFilters.builtins)`; `<FilterBar … builtins={data.activeFilters.builtins} />`.

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run "app/(new-layout)/games-v2/\[game\]"` and `npm run typecheck 2>&1 | grep -E "filters/|board-masthead"`
Expected: PASS; no lines.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/filters" "app/(new-layout)/games-v2/[game]/header/board-masthead.tsx"
git commit -m "feat(board): built-in filters echo as removable band chips"
```

### Task B6: Verification pass, docs, push

- [ ] **Step 1: Full frontend checks**

Run: `npx vitest run` (all green), `npm run lint 2>&1 | grep -E "games-v2/\[game\]/(filters|leaderboard|header|data|game-page)"` (no new lines), `npm run typecheck 2>&1 | grep -E "games-v2/\[game\]/(filters|leaderboard|header|data|game-page)|leaderboards-v1|leaderboards.types"` (none).

- [ ] **Step 2: Browser pass** (needs `npm run dev`; kill it afterwards — check `ps -eo pid,args | grep "next dev" | grep -v grep` first)

On `/games-v2/super-mario-64?category=120-star` (or any board): Filters button visible with no variable filters; open → Verified switch, Video segmented, From/To dates with a floor, Country select (only if the deployed backend has facets — otherwise absent, that's expected); flip each → URL updates, board narrows, badge count, band chip appears, × removes it, Clear filters resets everything; CSV export of a filtered board honours the filter. Screenshot the open popover for the report.

- [ ] **Step 3: Docs + push**

Mark the design doc `Status: built (frontend `board-filters`, backend `board-builtin-filters`); browser pass <done|pending>` and commit `docs(board): filters design marked built`. Then `git push -u origin board-filters`. Do NOT open a PR (Joey opens PRs). Update the memory file `project-board-filters.md` per the memory conventions.

---

## Self-review notes

- Spec coverage: filter set (A2/A3/B1-B5), as-of window (A3), facets (A4/B2/B4), popover always rendered + rows + badge (B4), band chips + FilterBar gating (B5), Clear filters (B2), export rides the query (buildLeaderboardQS in B2 — `ExportButton` receives `query`), find-me untouched, copy rules (B4/B5 labels), degradation without facets (B2 default + B4 hidden country), sequencing (A5/B6).
- Names consistent across tasks: `parseBuiltinParams`/`BuiltinFilterState`/`countBuiltinFilters`/`hasBuiltinFilters`/`BUILTIN_PARAM_KEYS` (B1) used in B2/B4/B5; `useBuiltinFilterNav().setBuiltin/setRange` (B3) used in B4/B5 with pending keys `builtin:<key>` / `builtin:range`; backend `parseBuiltinFilters`/`runBuiltinConditions`/`manualTimeBuiltinConditions`/`isWindowed`/`hasBuiltinFilters` (A2) used in A3; `getBoardFacets` (A4).
