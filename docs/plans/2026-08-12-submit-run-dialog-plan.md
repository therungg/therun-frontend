# Submit a run dialog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/games-v2/[game]/submit` page with a three-step dialog on the game page, where every submission — self or mod-attributed — lands as a manual time.

**Architecture:** One `SubmitRunDialog` client component mounted in `GamePage`, opened by `?submit=1`. Step 1 picks the board, step 2 (moderators only) picks the runner, step 3 takes time/date/VOD. Self-submissions post to `/v1/me/manual-times`; mod submissions post to `/v1/leaderboards/games/{gameId}/manual-times`. One new public backend endpoint answers "what does this runner already have on this game", unioning `finished_runs` and `manual_times`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, SCSS modules (frontend); AWS Lambda + Drizzle/Postgres + Redis (backend).

**Design doc:** `docs/plans/2026-08-12-submit-run-dialog-design.md`

## Global Constraints

- Two repos. Backend tasks (1–2) are in `/home/joey/therun/therun`; frontend tasks (3–8) are in `/home/joey/therun/therun-fr`. Commit in the repo you are working in.
- **Never push to `main` in `therun-fr`.** Work on branch `submit-run-dialog`. Backend may push to main (that deploys).
- The `api` CFN stack is at 499/500 resources. **Do not register any new API Gateway route.** The new endpoint rides the `/mod` base path, which is `proxy: true` and strips the prefix.
- Frontend indent is 4 spaces, single quotes, trailing commas, semicolons (Biome). Backend is 4 spaces, double quotes.
- Frontend `'use cache'` functions must use `cacheLife()` and `cacheTag()` from `next/cache`. Never `{ next: { revalidate: N } }`.
- `revalidateTag(tag, profile)` takes two arguments. For read-your-writes use `updateTag(tag)`.
- `typecheck` and `lint` are not clean on `main` (~356 pre-existing errors). Gate on a diff against the baseline, not exit 0.
- Copy rule: never reference speedrun.com or SRC.
- Copy rule: the guest branch is described as "added under this name", **never** as "anonymous".

---

## File Structure

**Backend (`therun/`)**

| File | Responsibility |
|---|---|
| Create `src/leaderboards/runner-entries.ts` | Pure merge/dedup of run + manual rows into `RunnerGameEntry[]`, plus the DB + Redis query that produces them |
| Create `src/api/leaderboards/runner-entries-handler.ts` | Path match, query-string parse, username resolution, anonymize guard, response |
| Modify `src/api/leaderboards/handler.ts` | Dispatch to the new handler |
| Create `test/unit/leaderboards/runner-entries.test.ts` | Unit tests for the pure merge |

**Frontend (`therun-fr/`)**

| File | Responsibility |
|---|---|
| Modify `types/leaderboards.types.ts` | `RunnerGameEntry`, `RunnerEntriesResult` mirrors |
| Modify `src/lib/leaderboards-v1.ts` | `getRunnerGameEntries` fetcher |
| Create `src/actions/runner-entries.action.ts` | Client-callable wrapper |
| Modify `src/lib/board-url.ts` | `buildSubmitHref` → board href + `?submit=1` |
| Modify `app/(new-layout)/games-v2/[game]/submit/page.tsx` | Becomes a redirect |
| Create `app/(new-layout)/games-v2/[game]/submit-dialog/submit-run-dialog.tsx` | Dialog shell, step orchestration, submit |
| Create `.../submit-dialog/step-board.tsx` | Step 1 |
| Create `.../submit-dialog/step-runner.tsx` | Step 2 (mods only) |
| Create `.../submit-dialog/step-time.tsx` | Step 3 |
| Create `.../submit-dialog/runner-state.ts` | Pure runner-resolution state machine |
| Create `.../submit-dialog/submit-run-dialog.module.scss` | Styling |
| Modify `app/(new-layout)/games-v2/[game]/game-page.tsx` | Mount the dialog, read `?submit=1` |
| Delete `.../submit/submit-form.tsx`, `run-fields.tsx`, `claim-fields.tsx`, `src/actions/submit-run.action.ts` | Old two-mode page |

`subcategory-key.ts`, `time-input.ts`, and `rules-panel.tsx` in the submit folder stay — they have consumers outside it (`run-inspector.tsx` imports `buildSubcategoryKey`).

---

### Task 1: Backend — runner-entries query

**Files:**
- Create: `therun/src/leaderboards/runner-entries.ts`
- Test: `therun/test/unit/leaderboards/runner-entries.test.ts`

**Interfaces:**
- Consumes: `getDb`, `finishedRuns`/`manualTimes`/`categories` from `../db/schema`, `buildLeaderboardKey`/`buildMemberKey`/`getLeaderboardRank`/`getLeaderboardCount` from `./redis/leaderboard-cache`.
- Produces: `RunnerGameEntry`, `RunnerRow`, `ManualRow`, `mergeRunnerEntries(runs, manuals)`, `getRunnerGameEntries(gameId, ref)`.

- [ ] **Step 1: Write the failing test**

Create `therun/test/unit/leaderboards/runner-entries.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { mergeRunnerEntries, type ManualRow, type RunnerRow } from "../../../src/leaderboards/runner-entries";

const run = (over: Partial<RunnerRow> = {}): RunnerRow => ({
    runId: 1,
    categoryId: 10,
    category: "Any%",
    categorySlug: "any",
    subcategoryKey: "",
    primaryTiming: "realtime",
    time: 120000,
    gameTime: null,
    ...over,
});

const manual = (over: Partial<ManualRow> = {}): ManualRow => ({
    manualTimeId: 100,
    categoryId: 10,
    category: "Any%",
    categorySlug: "any",
    subcategoryKey: "",
    primaryTiming: "realtime",
    timing: "realtime",
    timeMs: 110000,
    ...over,
});

describe("mergeRunnerEntries", () => {
    it("returns one entry per category + subcategory", () => {
        const out = mergeRunnerEntries(
            [run(), run({ runId: 2, categoryId: 11, category: "100%", categorySlug: "100" })],
            [],
        );
        expect(out).toHaveLength(2);
        expect(out.map((e) => e.categorySlug).sort()).toEqual(["100", "any"]);
    });

    it("keeps the faster of a run and a manual time on the same slice", () => {
        const out = mergeRunnerEntries([run()], [manual()]);
        expect(out).toHaveLength(1);
        expect(out[0].source).toBe("manual");
        expect(out[0].timeMs).toBe(110000);
        expect(out[0].manualTimeId).toBe(100);
        expect(out[0].runId).toBeUndefined();
    });

    it("keeps the run when the run is faster", () => {
        const out = mergeRunnerEntries([run({ time: 90000 })], [manual()]);
        expect(out[0].source).toBe("run");
        expect(out[0].runId).toBe(1);
        expect(out[0].timeMs).toBe(90000);
    });

    it("reads a gametime-primary run off gameTime, not time", () => {
        const out = mergeRunnerEntries(
            [run({ primaryTiming: "gametime", time: 120000, gameTime: 95000 })],
            [],
        );
        expect(out[0].timing).toBe("gametime");
        expect(out[0].timeMs).toBe(95000);
    });

    it("drops a gametime-primary run with no gameTime", () => {
        const out = mergeRunnerEntries(
            [run({ primaryTiming: "gametime", gameTime: null })],
            [],
        );
        expect(out).toEqual([]);
    });

    it("ignores a manual time whose timing is not the category's primary", () => {
        const out = mergeRunnerEntries([], [manual({ timing: "gametime" })]);
        expect(out).toEqual([]);
    });

    it("separates different subcategory keys in the same category", () => {
        const out = mergeRunnerEntries(
            [run(), run({ runId: 2, subcategoryKey: "glitchless" })],
            [],
        );
        expect(out).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/joey/therun/therun && npx vitest run --project unit test/unit/leaderboards/runner-entries.test.ts`
Expected: FAIL — cannot resolve `../../../src/leaderboards/runner-entries`.

- [ ] **Step 3: Write the module**

Create `therun/src/leaderboards/runner-entries.ts`:

```typescript
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "../db";
import { categories, finishedRuns, manualTimes } from "../db/schema";
import {
    buildLeaderboardKey,
    buildMemberKey,
    getLeaderboardCount,
    getLeaderboardRank,
} from "./redis/leaderboard-cache";

export type Timing = "realtime" | "gametime";

export interface RunnerRow {
    runId: number;
    categoryId: number;
    category: string;
    categorySlug: string;
    subcategoryKey: string;
    primaryTiming: string;
    time: number | null;
    gameTime: number | null;
}

export interface ManualRow {
    manualTimeId: number;
    categoryId: number;
    category: string;
    categorySlug: string;
    subcategoryKey: string;
    primaryTiming: string;
    timing: string;
    timeMs: number;
}

export interface RunnerGameEntry {
    categoryId: number;
    category: string;
    categorySlug: string;
    subcategoryKey: string;
    timeMs: number;
    timing: Timing;
    rank: number | null;
    totalRunners: number;
    source: "run" | "manual";
    runId?: number;
    manualTimeId?: number;
}

const primaryOf = (raw: string): Timing =>
    raw === "gametime" ? "gametime" : "realtime";

const sliceKey = (categoryId: number, subcategoryKey: string): string =>
    `${categoryId}#${subcategoryKey}`;

/**
 * Collapses a runner's finished runs and manual times for one game into one
 * entry per (category, subcategoryKey) slice.
 *
 * Only the category's primary timing counts: a board ranks on one clock, so
 * a run with no time on that clock, or a manual time asserted against the
 * other one, is not an entry on that board and must not be reported as one.
 * Where both a run and a manual time survive on the same slice, the faster
 * wins — that is the entry the board shows.
 *
 * Ranks are not filled here; `getRunnerGameEntries` adds them from Redis.
 * Keeping this half pure is what makes the collapse testable without a
 * database or a cache.
 */
export function mergeRunnerEntries(
    runs: RunnerRow[],
    manuals: ManualRow[],
): RunnerGameEntry[] {
    const best = new Map<string, RunnerGameEntry>();

    const offer = (entry: RunnerGameEntry) => {
        const key = sliceKey(entry.categoryId, entry.subcategoryKey);
        const existing = best.get(key);
        if (!existing || entry.timeMs < existing.timeMs) best.set(key, entry);
    };

    for (const r of runs) {
        const timing = primaryOf(r.primaryTiming);
        const timeMs = timing === "gametime" ? r.gameTime : r.time;
        if (timeMs == null) continue;
        offer({
            categoryId: r.categoryId,
            category: r.category,
            categorySlug: r.categorySlug,
            subcategoryKey: r.subcategoryKey,
            timeMs,
            timing,
            rank: null,
            totalRunners: 0,
            source: "run",
            runId: r.runId,
        });
    }

    for (const m of manuals) {
        const timing = primaryOf(m.primaryTiming);
        if (primaryOf(m.timing) !== timing) continue;
        offer({
            categoryId: m.categoryId,
            category: m.category,
            categorySlug: m.categorySlug,
            subcategoryKey: m.subcategoryKey,
            timeMs: m.timeMs,
            timing,
            rank: null,
            totalRunners: 0,
            source: "manual",
            manualTimeId: m.manualTimeId,
        });
    }

    return Array.from(best.values()).sort((a, b) =>
        a.category === b.category
            ? a.subcategoryKey.localeCompare(b.subcategoryKey)
            : a.category.localeCompare(b.category),
    );
}

export type RunnerEntriesRef = { userId: number } | { guestName: string };

/**
 * Every board entry a runner holds in one game, for both a registered
 * account and a bare name.
 *
 * `getUserRankings` cannot answer this: it reads `finished_runs` only, and
 * `manual_times` — where every dialog-submitted time lands — is a separate
 * table merged into boards at read time. A guest name has no user row at
 * all, so it has no rankings by construction.
 */
export async function getRunnerGameEntries(
    gameId: number,
    ref: RunnerEntriesRef,
): Promise<RunnerGameEntry[]> {
    const db = await getDb();

    const runWhere =
        "userId" in ref
            ? eq(finishedRuns.userId, ref.userId)
            : and(
                  isNull(finishedRuns.userId),
                  sql`lower(${finishedRuns.runnerName}) = lower(${ref.guestName})`,
              );

    const runs = await db
        .select({
            runId: finishedRuns.id,
            categoryId: finishedRuns.categoryId,
            category: categories.display,
            categorySlug: categories.name,
            subcategoryKey: finishedRuns.subcategoryKey,
            primaryTiming: categories.primaryTiming,
            time: finishedRuns.time,
            gameTime: finishedRuns.gameTime,
        })
        .from(finishedRuns)
        .innerJoin(categories, eq(categories.id, finishedRuns.categoryId))
        .where(
            and(
                eq(finishedRuns.gameId, gameId),
                runWhere,
                or(
                    eq(finishedRuns.isLeaderboardEntry, true),
                    eq(finishedRuns.isLeaderboardEntryGt, true),
                ),
                eq(finishedRuns.leaderboardEligible, true),
                eq(finishedRuns.excluded, false),
            ),
        );

    const manualWhere =
        "userId" in ref
            ? eq(manualTimes.userId, ref.userId)
            : sql`lower(${manualTimes.guestName}) = lower(${ref.guestName})`;

    const manuals = await db
        .select({
            manualTimeId: manualTimes.id,
            categoryId: manualTimes.categoryId,
            category: categories.display,
            categorySlug: categories.name,
            subcategoryKey: manualTimes.subcategoryKey,
            primaryTiming: categories.primaryTiming,
            timing: manualTimes.timing,
            timeMs: manualTimes.timeMs,
        })
        .from(manualTimes)
        .innerJoin(categories, eq(categories.id, manualTimes.categoryId))
        .where(
            and(
                eq(manualTimes.gameId, gameId),
                manualWhere,
                sql`${manualTimes.verificationStatus} <> 'rejected'`,
            ),
        );

    const merged = mergeRunnerEntries(runs, manuals);

    const member =
        "userId" in ref
            ? buildMemberKey(ref.userId, "")
            : buildMemberKey(null, ref.guestName);

    return Promise.all(
        merged.map(async (entry) => {
            const key = buildLeaderboardKey(
                gameId,
                entry.categoryId,
                entry.subcategoryKey ?? "",
                entry.timing === "gametime" ? "gt" : "rt",
            );
            const rank = await getLeaderboardRank(key, member);
            const totalRunners = await getLeaderboardCount(key);
            return {
                ...entry,
                rank: rank !== null ? rank + 1 : null,
                totalRunners,
            };
        }),
    );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/joey/therun/therun && npx vitest run --project unit test/unit/leaderboards/runner-entries.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/joey/therun/therun
git add src/leaderboards/runner-entries.ts test/unit/leaderboards/runner-entries.test.ts
git commit -m "feat(leaderboards): a runner's entries across one game

Unions finished_runs and manual_times per (category, subcategory), keeping
the faster on the category's primary clock. getUserRankings sees only
finished_runs, so it cannot answer this for a manual time or a guest name."
```

---

### Task 2: Backend — runner-entries endpoint

**Files:**
- Create: `therun/src/api/leaderboards/runner-entries-handler.ts`
- Modify: `therun/src/api/leaderboards/handler.ts` (add import + dispatch near the other `is*Path` checks)

**Interfaces:**
- Consumes: `getRunnerGameEntries` from Task 1; `ok`/`yourFault`/`notFound`/`methodNotAllowed` from `../responses`; `getUserAnonymizeScopes` from `../../services/anonymize-service`.
- Produces: `isRunnerEntriesPath(path)`, `handleRunnerEntries(event)`. Response body: `{ result: { userId: number | null, entries: RunnerGameEntry[] } }`.

- [ ] **Step 1: Write the handler**

Create `therun/src/api/leaderboards/runner-entries-handler.ts`:

```typescript
import { APIGatewayProxyEvent } from "aws-lambda";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { getRunnerGameEntries } from "../../leaderboards/runner-entries";
import { getUserAnonymizeScopes } from "../../services/anonymize-service";
import { methodNotAllowed, notFound, ok, yourFault } from "../responses";

// GET /v1/leaderboards/games/{gameId}/runner-entries?username=… | ?guestName=…
//
// Served via the `/mod` base-path mapping (proxy API): the main gateway is at
// its 500-resource cap, so this path is never registered there and gameId
// comes from the raw path, not event.pathParameters.
//
// Public, no session. Every field it emits is already public via the board.
const RUNNER_ENTRIES_RE = /\/v1\/leaderboards\/games\/(\d+)\/runner-entries$/;

export const isRunnerEntriesPath = (path: string): boolean =>
    RUNNER_ENTRIES_RE.test(path);

export const handleRunnerEntries = async (event: APIGatewayProxyEvent) => {
    if (event.httpMethod !== "GET") return methodNotAllowed();

    const match = event.path.match(RUNNER_ENTRIES_RE);
    if (!match) return notFound("Not found");
    const gameId = parseInt(match[1]);

    const qs = event.queryStringParameters || {};
    const username = qs.username?.trim();
    const guestName = qs.guestName?.trim();

    if ((username ? 1 : 0) + (guestName ? 1 : 0) !== 1) {
        return yourFault("exactly one of username or guestName is required");
    }

    if (guestName) {
        const entries = await getRunnerGameEntries(gameId, { guestName });
        return ok(JSON.stringify({ result: { userId: null, entries } }));
    }

    const db = await getDb();
    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(
            // Same guard the sibling /user/by-name/{username}/rankings route
            // carries: an anonymized account does not exist under its real
            // name, and this route would otherwise be a name -> userId oracle
            // that undoes the masking.
            sql`lower(${users.username}) = lower(${username}) AND ${users.anonymized} IS NOT TRUE`,
        )
        .limit(1);

    // 404 rather than an empty list — the dialog's "no account found" branch
    // reads this, and an empty list would still confirm the account exists.
    if (!user) return notFound("User not found");

    const scopes = await getUserAnonymizeScopes(user.id);
    if (scopes.global) return notFound("User not found");

    const entries = await getRunnerGameEntries(gameId, { userId: user.id });
    return ok(JSON.stringify({ result: { userId: user.id, entries } }));
};
```

- [ ] **Step 2: Wire the dispatch**

In `therun/src/api/leaderboards/handler.ts`, add to the import block near the other handler imports:

```typescript
import { handleRunnerEntries, isRunnerEntriesPath } from "./runner-entries-handler";
```

Then add the dispatch immediately **before** the `// GET /leaderboards/user/by-name/{username}/rankings` block (around line 422), so the more specific path is matched first:

```typescript
    // GET /v1/leaderboards/games/{gameId}/runner-entries
    if (isRunnerEntriesPath(path)) {
        return handleRunnerEntries(event);
    }
```

- [ ] **Step 3: Typecheck and run the unit suite**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit && npm test`
Expected: no new errors versus the baseline, unit suite green.

- [ ] **Step 4: Commit and push (this deploys)**

```bash
cd /home/joey/therun/therun
git add src/api/leaderboards/runner-entries-handler.ts src/api/leaderboards/handler.ts
git commit -m "feat(api): GET /v1/leaderboards/games/{id}/runner-entries

Answers what a runner already has on a game's boards, by username or by a
bare name. Rides the /mod proxy base path — no new gateway route, the api
stack has one CFN resource slot left."
git push origin main
```

- [ ] **Step 5: Post-deploy check**

Run `/home/joey/therun/.claude/monitoring/check-health.sh 15`, then re-run at ~5, ~10 and ~15 minutes. Confirm the endpoint answers:

```bash
curl -s "https://api.therun.gg/mod/v1/leaderboards/games/1/runner-entries?username=joeyistotal" | head -c 400
```

Expected: a `{"result":{"userId":…,"entries":[…]}}` body, or `{"error":"User not found"}` for an unknown name — not a 403 (403 means the path did not reach the Lambda).

---

### Task 3: Frontend — types, fetcher, action

**Files:**
- Modify: `therun-fr/types/leaderboards.types.ts`
- Modify: `therun-fr/src/lib/leaderboards-v1.ts`
- Create: `therun-fr/src/actions/runner-entries.action.ts`

**Interfaces:**
- Produces: `RunnerGameEntry`, `RunnerEntriesResult`, `runnerEntriesCacheTag(gameId, key)`, `getRunnerGameEntries(gameId, ref)`, `lookupRunnerEntriesAction(gameId, ref)`.

- [ ] **Step 1: Create the branch**

```bash
cd /home/joey/therun/therun-fr
git checkout -b submit-run-dialog
```

- [ ] **Step 2: Add the type mirrors**

Append to `therun-fr/types/leaderboards.types.ts`:

```typescript
/** One board entry a runner already holds in a game — union of a finished
 *  run and a manual time, one per (category, subcategoryKey). Mirrors
 *  `src/leaderboards/runner-entries.ts` backend-side. */
export interface RunnerGameEntry {
    categoryId: number;
    category: string;
    categorySlug: string;
    subcategoryKey: string;
    timeMs: number;
    timing: 'realtime' | 'gametime';
    rank: number | null;
    totalRunners: number;
    source: 'run' | 'manual';
    runId?: number;
    manualTimeId?: number;
}

export type RunnerEntriesResult =
    | { status: 'found'; userId: number | null; entries: RunnerGameEntry[] }
    /** No account under that name (or it is globally anonymized). The dialog's
     *  add-under-this-name branch. */
    | { status: 'no-account' };
```

- [ ] **Step 3: Add the fetcher**

Append to `therun-fr/src/lib/leaderboards-v1.ts`, after `getUserRankingsByName`:

```typescript
export const runnerEntriesCacheTag = (gameId: number, runner: string) =>
    `runner-entries:${gameId}:${runner.toLowerCase()}`;

/**
 * Every board entry a runner already holds in one game, by account name or
 * by a bare name.
 *
 * Rides the `/mod` base-path mapping for the same reason
 * `getUserRankingsByName` does: the main gateway is at its resource cap, so
 * the route exists only through the proxy API, which strips the prefix.
 */
export async function getRunnerGameEntries(
    gameId: number,
    ref: { username: string } | { guestName: string },
): Promise<RunnerEntriesResult> {
    'use cache';
    cacheLife('minutes');
    const runner = 'username' in ref ? ref.username : ref.guestName;
    cacheTag(runnerEntriesCacheTag(gameId, runner));

    const qs =
        'username' in ref
            ? `username=${encodeURIComponent(ref.username)}`
            : `guestName=${encodeURIComponent(ref.guestName)}`;

    try {
        const body = await v1Fetch<{
            result: { userId: number | null; entries: RunnerGameEntry[] };
        }>(`/mod/v1/leaderboards/games/${gameId}/runner-entries?${qs}`);
        return {
            status: 'found',
            userId: body.result.userId,
            entries: body.result.entries ?? [],
        };
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) {
            return { status: 'no-account' };
        }
        throw e;
    }
}
```

Add `RunnerEntriesResult` and `RunnerGameEntry` to the existing type import from `'../../types/leaderboards.types'` at the top of the file.

- [ ] **Step 4: Add the action**

Create `therun-fr/src/actions/runner-entries.action.ts`:

```typescript
'use server';

import { getRunnerGameEntries } from '~src/lib/leaderboards-v1';
import type { RunnerEntriesResult } from '../../types/leaderboards.types';

/**
 * Client-callable lookup for the submit dialog's runner step. Public data —
 * no session gate; the backend route is public too.
 */
export async function lookupRunnerEntriesAction(
    gameId: number,
    ref: { username: string } | { guestName: string },
): Promise<RunnerEntriesResult | { error: string }> {
    try {
        return await getRunnerGameEntries(gameId, ref);
    } catch {
        return { error: 'Could not check this runner. Try again.' };
    }
}
```

- [ ] **Step 5: Typecheck**

Run: `cd /home/joey/therun/therun-fr && npx tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: the same count as on `main` (record it first with `git stash && npx tsc --noEmit 2>&1 | grep -c "error TS" && git stash pop`).

- [ ] **Step 6: Commit**

```bash
cd /home/joey/therun/therun-fr
git add types/leaderboards.types.ts src/lib/leaderboards-v1.ts src/actions/runner-entries.action.ts
git commit -m "feat(games-v2): fetch a runner's existing entries on a game"
```

---

### Task 4: Frontend — runner-state machine

**Files:**
- Create: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/runner-state.ts`
- Test: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/runner-state.test.ts`

This is the decision logic behind step 2, kept pure so it is testable without rendering search.

**Interfaces:**
- Consumes: `RunnerEntriesResult`, `RunnerGameEntry` from Task 3.
- Produces: `type RunnerChoice`, `resolveRunnerChoice(result, name, board)`, `entriesOnOtherBoards(entries, board)`.

- [ ] **Step 1: Write the failing test**

Create `runner-state.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type {
    RunnerEntriesResult,
    RunnerGameEntry,
} from '../../../../../types/leaderboards.types';
import { entriesOnOtherBoards, resolveRunnerChoice } from './runner-state';

const board = { categoryId: 10, subcategoryKey: '' };

const entry = (over: Partial<RunnerGameEntry> = {}): RunnerGameEntry => ({
    categoryId: 10,
    category: 'Any%',
    categorySlug: 'any',
    subcategoryKey: '',
    timeMs: 120000,
    timing: 'realtime',
    rank: 3,
    totalRunners: 40,
    source: 'run',
    runId: 7,
    ...over,
});

const found = (entries: RunnerGameEntry[]): RunnerEntriesResult => ({
    status: 'found',
    userId: 42,
    entries,
});

describe('resolveRunnerChoice', () => {
    it('links to the account and allows next when the board is free', () => {
        const c = resolveRunnerChoice(found([]), 'Kirbymastah', board);
        expect(c.kind).toBe('account');
        expect(c.canProceed).toBe(true);
        expect(c.ref).toEqual({ userId: 42 });
    });

    it('blocks next when the account already holds the selected board', () => {
        const c = resolveRunnerChoice(found([entry()]), 'Kirbymastah', board);
        expect(c.canProceed).toBe(false);
        expect(c.existing?.timeMs).toBe(120000);
    });

    it('does not block on an entry from a different subcategory', () => {
        const c = resolveRunnerChoice(
            found([entry({ subcategoryKey: 'glitchless' })]),
            'Kirbymastah',
            board,
        );
        expect(c.canProceed).toBe(true);
        expect(c.existing).toBeNull();
    });

    it('falls back to a name-only ref when there is no account', () => {
        const c = resolveRunnerChoice(
            { status: 'no-account' },
            'SomeRunner',
            board,
        );
        expect(c.kind).toBe('name-only');
        expect(c.ref).toEqual({ guestName: 'SomeRunner' });
        expect(c.canProceed).toBe(true);
    });

    it('blocks a name-only runner that already holds the board', () => {
        const c = resolveRunnerChoice(
            { status: 'found', userId: null, entries: [entry({ source: 'manual', manualTimeId: 5, runId: undefined })] },
            'SomeRunner',
            board,
        );
        expect(c.kind).toBe('name-only');
        expect(c.canProceed).toBe(false);
        expect(c.existing?.manualTimeId).toBe(5);
    });

    it('trims the typed name into the ref', () => {
        const c = resolveRunnerChoice({ status: 'no-account' }, '  Ann  ', board);
        expect(c.ref).toEqual({ guestName: 'Ann' });
    });
});

describe('entriesOnOtherBoards', () => {
    it('excludes the selected board', () => {
        const others = entriesOnOtherBoards(
            [entry(), entry({ categoryId: 11, category: '100%', categorySlug: '100' })],
            board,
        );
        expect(others).toHaveLength(1);
        expect(others[0].categorySlug).toBe('100');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/joey/therun/therun-fr && npx vitest run "app/(new-layout)/games-v2/[game]/submit-dialog/runner-state.test.ts"`
Expected: FAIL — cannot resolve `./runner-state`.

- [ ] **Step 3: Write the module**

Create `runner-state.ts`:

```typescript
import type {
    RunnerEntriesResult,
    RunnerGameEntry,
} from '../../../../../types/leaderboards.types';
import type { RunnerRef } from '../../../../../types/moderation.types';

export interface BoardSlice {
    categoryId: number;
    subcategoryKey: string;
}

export interface RunnerChoice {
    /** 'account' — linked to a therun account. 'name-only' — added under the
     *  typed name, not linked to anything else on therun. */
    kind: 'account' | 'name-only';
    displayName: string;
    ref: RunnerRef;
    /** The runner's existing entry on the *selected* board, or null. Present
     *  means the dialog offers a link to it instead of a Next button — a
     *  second entry on the same board is what this step exists to prevent. */
    existing: RunnerGameEntry | null;
    /** Entries on the game's other boards. Context only, never a block. */
    otherBoards: RunnerGameEntry[];
    canProceed: boolean;
}

const sameSlice = (e: RunnerGameEntry, board: BoardSlice): boolean =>
    e.categoryId === board.categoryId &&
    e.subcategoryKey === board.subcategoryKey;

export function entriesOnOtherBoards(
    entries: RunnerGameEntry[],
    board: BoardSlice,
): RunnerGameEntry[] {
    return entries.filter((e) => !sameSlice(e, board));
}

/**
 * Turns a lookup result plus the typed name into what step 2 renders and
 * what the create call will send.
 *
 * A `userId` is only ever produced by the lookup — the search index carries
 * no numeric id, so this is the single place a name becomes an account
 * reference. Everything else is added under the name as typed.
 */
export function resolveRunnerChoice(
    result: RunnerEntriesResult,
    typedName: string,
    board: BoardSlice,
): RunnerChoice {
    const displayName = typedName.trim();

    if (result.status === 'no-account') {
        return {
            kind: 'name-only',
            displayName,
            ref: { guestName: displayName },
            existing: null,
            otherBoards: [],
            canProceed: displayName.length > 0,
        };
    }

    const existing = result.entries.find((e) => sameSlice(e, board)) ?? null;
    const kind = result.userId != null ? 'account' : 'name-only';

    return {
        kind,
        displayName,
        ref:
            result.userId != null
                ? { userId: result.userId }
                : { guestName: displayName },
        existing,
        otherBoards: entriesOnOtherBoards(result.entries, board),
        canProceed: existing === null && displayName.length > 0,
    };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/joey/therun/therun-fr && npx vitest run "app/(new-layout)/games-v2/[game]/submit-dialog/runner-state.test.ts"`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/joey/therun/therun-fr
git add "app/(new-layout)/games-v2/[game]/submit-dialog/"
git commit -m "feat(games-v2): runner-resolution state for the submit dialog"
```

---

### Task 5: Frontend — submit href becomes a dialog trigger

**Files:**
- Modify: `therun-fr/src/lib/board-url.ts:106-113`
- Test: `therun-fr/src/lib/__tests__/board-url.test.ts` (add cases; create the file if absent)
- Modify: `therun-fr/app/(new-layout)/games-v2/[game]/submit/page.tsx` (becomes a redirect)
- Modify: `therun-fr/app/(new-layout)/games-v2/[game]/game-page.tsx:91` and `setup/steps/step-categories.tsx:135` (the two hardcoded `/submit` hrefs)

**Interfaces:**
- Produces: `buildSubmitHref(gameSlug, ctx)` returning `<board href>?…&submit=1`; `SUBMIT_PARAM = 'submit'`.

- [ ] **Step 1: Write the failing test**

Add to `therun-fr/src/lib/__tests__/board-url.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildSubmitHref } from '../board-url';

describe('buildSubmitHref', () => {
    it('points at the board with submit=1, not a submit route', () => {
        const href = buildSubmitHref('super-mario-64');
        expect(href).not.toContain('/submit');
        expect(href).toContain('/games-v2/super-mario-64');
        expect(href).toContain('submit=1');
    });

    it('carries the board context so the dialog opens preselected', () => {
        const href = buildSubmitHref('super-mario-64', {
            categorySlug: '16-star',
            subcategoryKey: 'no-lblj',
        });
        expect(href).toContain('category=16-star');
        expect(href).toContain('submit=1');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/__tests__/board-url.test.ts`
Expected: FAIL — the href still contains `/submit`.

- [ ] **Step 3: Rewrite `buildSubmitHref`**

Replace `therun-fr/src/lib/board-url.ts:106-113` with:

```typescript
/** Query param that opens the submit dialog on a board page. */
export const SUBMIT_PARAM = 'submit';

/**
 * Opens the submit dialog on the board carrying this context. Every
 * "Submit a run" / "set the first record" / "Correct this time" entry point
 * goes through here, so the dialog opens preselected to the board the runner
 * was looking at.
 *
 * This used to be a route (`/games-v2/{game}/submit`). It is a query param on
 * the board itself now — the dialog lives on the game page, and a param keeps
 * every existing call site working without each one having to reach into the
 * page's state.
 */
export function buildSubmitHref(
    gameSlug: string,
    ctx: BoardLinkContext = {},
): string {
    const sp = buildBoardQuery(ctx);
    sp.set(SUBMIT_PARAM, '1');
    return withQuery(`/games-v2/${gameSegment(gameSlug)}`, sp);
}
```

The `mode?: 'claim'` parameter goes away. Fix the one call site that passes it — `run-view/run-actions.tsx:153` (`correctHref`) and `run-view/run-view.tsx:135` (`claimHref`) — by deleting the `mode: 'claim'` property from the context object. There is one submit flow now, so the two hrefs become identical to the plain submit href for that board.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd /home/joey/therun/therun-fr && npx vitest run src/lib/__tests__/board-url.test.ts`
Expected: PASS.

- [ ] **Step 5: Turn the submit route into a redirect**

Replace the whole body of `therun-fr/app/(new-layout)/games-v2/[game]/submit/page.tsx` with:

```typescript
import { redirect } from 'next/navigation';
import { buildSubmitHref } from '~src/lib/board-url';

interface Props {
    params: Promise<{ game: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The submit page is a dialog on the board now. This route stays as a
 * redirect so bookmarks and links posted before the change still land in
 * the right place, carrying whatever board context they had.
 */
export default async function SubmitRedirect({ params, searchParams }: Props) {
    const { game } = await params;
    const sp = await searchParams;

    const first = (key: string): string | undefined => {
        const v = sp[key];
        return Array.isArray(v) ? v[0] : v;
    };

    const variables: Record<string, string> = {};
    for (const [key, value] of Object.entries(sp)) {
        if (key === 'category' || key === 'mode' || key === 'submit') continue;
        const v = Array.isArray(value) ? value[0] : value;
        if (v) variables[key] = v;
    }

    redirect(
        buildSubmitHref(game, {
            categorySlug: first('category'),
            variables,
        }),
    );
}
```

Delete `submit/submit-page.module.scss` if nothing else imports it.

Check `BoardLinkContext` in `board-url.ts` for the exact property name that carries variable params, and use that name rather than `variables` if it differs.

- [ ] **Step 6: Replace the two hardcoded `/submit` hrefs**

In `game-page.tsx:91` and `setup/steps/step-categories.tsx:135`, replace
`` href={`/games-v2/${encodeURIComponent(data.game.name)}/submit`} ``
with `href={buildSubmitHref(data.game.name)}` (importing `buildSubmitHref` from `~src/lib/board-url`; `game-page.tsx` already imports `buildBoardHref` from there).

- [ ] **Step 7: Verify no `/submit` links remain**

Run: `cd /home/joey/therun/therun-fr && grep -rn "games-v2/\${.*}/submit\|/submit\`" app src | grep -v "submit-run\|submit-claim\|me-submissions"`
Expected: no matches outside `submit/page.tsx`.

- [ ] **Step 8: Commit**

```bash
cd /home/joey/therun/therun-fr
git add src/lib/board-url.ts src/lib/__tests__/board-url.test.ts "app/(new-layout)/games-v2/[game]/submit/page.tsx" "app/(new-layout)/games-v2/[game]/game-page.tsx" "app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx" "app/(new-layout)/games-v2/[game]/run-view/run-actions.tsx" "app/(new-layout)/games-v2/[game]/run-view/run-view.tsx"
git commit -m "refactor(games-v2): submit links open a dialog on the board

buildSubmitHref returns the board href with submit=1 instead of a route, so
all six entry points keep working. /submit stays as a redirect."
```

---

### Task 6: Frontend — dialog shell and step 1 (board)

**Files:**
- Create: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/submit-run-dialog.tsx`
- Create: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/step-board.tsx`
- Create: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/submit-run-dialog.module.scss`
- Modify: `therun-fr/app/(new-layout)/games-v2/[game]/game-page.tsx`

**Interfaces:**
- Consumes: `BoardDialog` from `../shared/board-dialog`, `loadVariablesAction` from `../submit/load-variables.action`, `buildSubcategoryKey` from `../submit/subcategory-key`, `RulesPanel`/`RulesBody` from `../rules/rules-panel`, `SUBMIT_PARAM` from `~src/lib/board-url`.
- Produces: `<SubmitRunDialog game categories groups gameRules emulatorPolicy canModerate initialCategorySlug initialVariables open onClose />`; `<StepBoard …/>`.

- [ ] **Step 1: Write step 1**

Create `step-board.tsx`. It renders the category select (copy `renderCategoryOptions` verbatim from `submit/submit-form.tsx:722-763` into this file — the old file is deleted in Task 8), the rules disclosure, and one select per `role === 'subcategory'` variable, and reports validity upward:

```typescript
'use client';

import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import {
    type EmulatorPolicy,
    RulesBody,
    RulesPanel,
} from '../rules/rules-panel';
import styles from './submit-run-dialog.module.scss';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    categoryId: number;
    onCategoryChange: (id: number) => void;
    subcatDefs: VariableRow[];
    subcategory: Record<string, string>;
    onSubcategoryChange: (nameNormalized: string, value: string) => void;
    varsLoading: boolean;
    varsError: boolean;
    combinationInvalid: boolean;
    gameRules?: string | null;
    categoryRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    rulesOpen: boolean;
    onToggleRules: () => void;
}

export function StepBoard({
    categories,
    groups,
    categoryId,
    onCategoryChange,
    subcatDefs,
    subcategory,
    onSubcategoryChange,
    varsLoading,
    varsError,
    combinationInvalid,
    gameRules,
    categoryRules,
    emulatorPolicy,
    rulesOpen,
    onToggleRules,
}: Props) {
    return (
        <div className={styles.step}>
            <div>
                <label htmlFor="submit-category" className="form-label">
                    Category
                </label>
                <select
                    id="submit-category"
                    className="form-select"
                    value={categoryId}
                    onChange={(e) => onCategoryChange(Number(e.target.value))}
                >
                    {renderCategoryOptions(categories, groups)}
                </select>
            </div>

            {subcatDefs.map((def) => (
                <div key={def.nameNormalized}>
                    <label
                        htmlFor={`sub-${def.nameNormalized}`}
                        className="form-label"
                    >
                        {def.name}
                    </label>
                    <select
                        id={`sub-${def.nameNormalized}`}
                        className="form-select"
                        value={subcategory[def.nameNormalized] ?? ''}
                        onChange={(e) =>
                            onSubcategoryChange(
                                def.nameNormalized,
                                e.target.value,
                            )
                        }
                        disabled={varsLoading}
                        required
                    >
                        {def.values.map((bucket, idx) => (
                            <option
                                key={`${def.nameNormalized}-${idx}`}
                                value={bucket[0]}
                            >
                                {bucket[0]}
                            </option>
                        ))}
                    </select>
                </div>
            ))}

            {(categoryRules?.trim() ||
                gameRules?.trim() ||
                emulatorPolicy) && (
                <div>
                    <RulesPanel
                        rules={categoryRules}
                        gameRules={gameRules}
                        emulatorPolicy={emulatorPolicy}
                        open={rulesOpen}
                        onToggle={onToggleRules}
                        label="Category rules"
                    />
                    {rulesOpen && (
                        <RulesBody
                            rules={categoryRules}
                            gameRules={gameRules}
                            emulatorPolicy={emulatorPolicy}
                        />
                    )}
                </div>
            )}

            {varsError && (
                <div className="alert alert-warning py-2 mb-0" role="alert">
                    Could not load subcategories for this category. You can
                    still submit; they will use their defaults.
                </div>
            )}

            {combinationInvalid && (
                <div className="alert alert-warning py-2 mb-0" role="alert">
                    This combination has no leaderboard. Pick a different
                    combination to submit.
                </div>
            )}
        </div>
    );
}

function renderCategoryOptions(
    categories: ResolvedCategory[],
    groups: ResolvedGroup[],
) {
    if (groups.length === 0) {
        return categories.map((c) => (
            <option key={c.id} value={c.id}>
                {c.display}
            </option>
        ));
    }

    const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const ungrouped = categories.filter((c) => c.groupId == null);
    const nodes: React.ReactNode[] = [];

    for (const g of sortedGroups) {
        const inGroup = categories.filter((c) => c.groupId === g.id);
        if (inGroup.length === 0) continue;
        nodes.push(
            <optgroup key={`g-${g.id}`} label={g.name}>
                {inGroup.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </optgroup>,
        );
    }
    if (ungrouped.length > 0) {
        nodes.push(
            <optgroup key="g-ungrouped" label="Other">
                {ungrouped.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </optgroup>,
        );
    }
    return nodes;
}
```

- [ ] **Step 2: Write the dialog shell**

Create `submit-run-dialog.tsx`. It owns: step index, category + variables state (lifted verbatim from `submit-form.tsx:99-234` — the `loadVariablesAction` effect, `canonicalDefault`, `canonicalMatch`, `appliedInitialSubcategory` ref, `subcatDefs`/`filterDefs`/`displayNames`/`subcategoryKey`/`combinationInvalid` derivations), the runner choice from Task 4, and the time fields from Task 7.

Its step list is `canModerate ? ['board', 'runner', 'time'] : ['board', 'time']`. Footer buttons: Back (hidden on the first step), Next (disabled per step validity), and Submit on the last step. It renders inside `<BoardDialog open onClose labelledBy="submit-run-dialog-title" size="lg">` with an `<h2 id="submit-run-dialog-title">Submit a run</h2>`.

Step 1 validity: `!varsLoading && !combinationInvalid`.

- [ ] **Step 3: Mount it in `GamePage`**

In `game-page.tsx`, add near the other hooks:

```typescript
    const searchParams = useSearchParams();
    const router = useRouter();
    const submitOpen = searchParams.get(SUBMIT_PARAM) === '1';

    // Closing drops the param so the dialog does not reopen on Back, and
    // uses replace so the open/closed states are not two history entries.
    const closeSubmit = () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete(SUBMIT_PARAM);
        const qs = next.toString();
        router.replace(qs ? `?${qs}` : '?', { scroll: false });
    };
```

Render `<SubmitRunDialog … open={submitOpen} onClose={closeSubmit} />` alongside the board, passing `data.categories`, `data.groups`, `data.game`, `data.gameMeta` rules fields, `canModerate={canManageRuns}`, and the current board as the initial selection (`data.selectedCategory.name` and the subcategory values already parsed for the board). `useSearchParams` requires a `<Suspense>` boundary in some layouts — if the build complains, wrap the dialog in one.

- [ ] **Step 4: Verify in the browser**

```bash
cd /home/joey/therun/therun-fr
ps -eo pid,args | grep "next dev" | grep -v grep    # must be empty
npm run dev
```

Open a game board, click Submit a run, confirm: the dialog opens, the category and subcategory match the board you were on, the rules disclosure expands, and Escape closes it and clears `?submit=1` from the URL. **Kill the dev server before finishing** (`kill <pid>` for the exact pid).

- [ ] **Step 5: Commit**

```bash
cd /home/joey/therun/therun-fr
git add "app/(new-layout)/games-v2/[game]/submit-dialog/" "app/(new-layout)/games-v2/[game]/game-page.tsx"
git commit -m "feat(games-v2): submit dialog shell and board step"
```

---

### Task 7: Frontend — step 2 (runner) and step 3 (time)

**Files:**
- Create: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/step-runner.tsx`
- Create: `therun-fr/app/(new-layout)/games-v2/[game]/submit-dialog/step-time.tsx`
- Modify: `.../submit-dialog/submit-run-dialog.tsx`

**Interfaces:**
- Consumes: `resolveRunnerChoice`/`entriesOnOtherBoards`/`RunnerChoice` (Task 4), `lookupRunnerEntriesAction` (Task 3), `findUserOrRun` via the topbar's search hook, `parseRunTimeInput`/`formatRunTimeEcho` from `~src/lib/run-time-input`, `EMPTY_TIME`/`TimeField` from `../submit/time-input`, `selfClaimTimeAction`, `createManualTimeAction`.
- Produces: `<StepRunner …/>`, `<StepTime …/>`.

- [ ] **Step 1: Write step 2**

`step-runner.tsx` renders a search field (reuse `SearchInput` from `~src/components/search/search-input.component` with `filters={['user']}`, driven by the same `use-fuzzy-search` hook the topbar uses; if wiring that hook proves heavier than the step needs, a plain debounced input calling `findUserOrRun` through a server action is acceptable — the requirement is "select a user the way the topbar does", not literal component reuse).

On selecting a result or confirming a typed name, it calls `lookupRunnerEntriesAction(gameId, ref)` and passes the result through `resolveRunnerChoice`. Rendering by `choice`:

- `existing !== null`:
  > **{displayName} already has a run on this board** — {formatRunTimeEcho(existing.timeMs)}{existing.rank != null && ` (#${existing.rank} of ${existing.totalRunners})`}

  plus a link to that entry (`existing.source === 'run' ? \`/games-v2/${gameSlug}/run/${existing.runId}\` : \`/games-v2/${gameSlug}/manual/${existing.manualTimeId}\``) and a "Pick someone else" button that clears the choice. Next stays disabled.
- `kind === 'account'`, no existing: "No run on this board yet." Next enabled.
- `kind === 'name-only'`: "No account found. Check the spelling — if they don't have one, the run is added under this name and won't be linked to a therun account." with a confirm-the-name input, prefilled with what was typed. Next enabled once non-empty. **Do not use the word "anonymous".**
- `otherBoards.length > 0` in every case: a context line, not a block —
  "Also on this game: Any% — 35:48 (#3) · 100% — 1:12:04 (#7)", built from `category`, `formatRunTimeEcho(timeMs)`, and rank.

- [ ] **Step 2: Write step 3**

`step-time.tsx` takes the fields lifted from `claim-fields.tsx`:

- Timing radio pair, rendered only when `!category.hideRealTime && !category.hideGameTime`; label the game-time option from `category.gameTimeLabel ?? 'igt'`. Otherwise the single visible timing is implicit and no control renders.
- Time text input parsed with `parseRunTimeInput`; inline error "Enter a valid time (h:mm:ss, m:ss, or m:ss.SSS)" once touched and unparseable.
- `<input type="date">` labelled "Date achieved", prefilled with today's local date (reuse `todayISODate` from `submit-form.tsx:57-64`, moved into `step-time.tsx`), `max={today}`, clearable. Helper: "Leave empty to date it from today."
- VOD URL text input, optional, validated with the `isValidHttpUrl` helper (`submit-form.tsx:79-86`, moved here). Inline error once touched: "Enter a full http(s) link."

Step 3 validity: a parsed time is present and the VOD field is either empty or a valid http(s) URL.

- [ ] **Step 3: Wire submission**

In `submit-run-dialog.tsx`:

```typescript
const submit = async () => {
    setSubmitting(true);
    setError(null);

    // A non-moderator never reaches the runner step, so `choice` is null and
    // they always take the self branch.
    const res =
        choice !== null
            ? await createManualTimeAction(game.name, {
                  runnerRef: choice.ref,
                  categoryId: category.id,
                  subcategoryKey,
                  timing: effectiveTiming,
                  timeMs: time.ms as number,
                  evidenceUrl: vodUrl.trim() || null,
                  runDate: runDate || null,
                  reason: 'Added via Submit a run',
              })
            : await selfClaimTimeAction({
                  gameId: game.id,
                  categoryId: category.id,
                  timing: effectiveTiming,
                  timeMs: time.ms as number,
                  subcategoryKey: subcategoryKey || undefined,
                  evidenceUrl: vodUrl.trim() || null,
                  runDate: runDate || null,
              });

    setSubmitting(false);
    if ('error' in res) {
        setError(res.error);
        return;
    }
    setResult(res);
};
```

A non-moderator has no `choice`, so they always take the self branch. A moderator submitting for themselves goes through the mod branch with `{ userId }` — same board outcome, and the mod log records who entered it, which is correct.

- [ ] **Step 4: Success panel**

On `result`, replace the step body with: a status line (`applied === 'instant' ? 'The run is on the board.' : 'The run is submitted and awaiting verification. It appears on the board marked unverified.'`), a "See it on the board" link built with `buildBoardHref(game.name, { categorySlug: category.name, subcategoryKey })`, a link to the entry (`/games-v2/{game}/manual/{manualTimeId}` — both actions return a manual-time id), and a "Submit another" button that resets to step 1.

- [ ] **Step 5: Verify in the browser**

Start the dev server (checking first that none is running), then walk both paths on a game you moderate:

1. Signed in as a non-mod: hero → dialog → board step → time step → submit. Confirm the entry appears on the board.
2. As a mod: search a runner who already has a time on the selected board — confirm Next is blocked and the link opens their entry. Search one who does not — confirm Next proceeds. Type a name with no account — confirm the "added under this name" copy and that submitting creates the entry under that name.
3. Confirm the "Also on this game" line appears for a runner with times on other categories.

**Kill the dev server before finishing.**

- [ ] **Step 6: Commit**

```bash
cd /home/joey/therun/therun-fr
git add "app/(new-layout)/games-v2/[game]/submit-dialog/"
git commit -m "feat(games-v2): runner and time steps for the submit dialog"
```

---

### Task 8: Frontend — remove the old submit form

**Files:**
- Delete: `therun-fr/app/(new-layout)/games-v2/[game]/submit/submit-form.tsx`, `run-fields.tsx`, `claim-fields.tsx`, `submit-form.module.scss`
- Delete: `therun-fr/src/actions/submit-run.action.ts`
- Modify: `therun-fr/docs/plans/2026-08-12-submit-run-dialog-design.md` (mark implemented)

Keep `submit/subcategory-key.ts` (imported by `leaderboard/run-inspector.tsx:53`), `submit/time-input.ts`, `submit/load-variables.action.ts`, and `submit/page.tsx` (now the redirect).

- [ ] **Step 1: Check for remaining importers**

Run:

```bash
cd /home/joey/therun/therun-fr
grep -rn "submit-form\|run-fields\|claim-fields\|submit-run.action" app src types | grep -v "submit-dialog"
```

Expected: no matches other than the files being deleted. If `describeSubmitWarning` (`src/lib/run-view/submit-warnings.ts`) loses its only consumer, keep it — it has its own test and the manual-time result may surface warnings; do not delete it in this task.

- [ ] **Step 2: Delete**

```bash
cd /home/joey/therun/therun-fr
git rm "app/(new-layout)/games-v2/[game]/submit/submit-form.tsx" \
       "app/(new-layout)/games-v2/[game]/submit/run-fields.tsx" \
       "app/(new-layout)/games-v2/[game]/submit/claim-fields.tsx" \
       "app/(new-layout)/games-v2/[game]/submit/submit-form.module.scss" \
       src/actions/submit-run.action.ts
```

- [ ] **Step 3: Full check**

```bash
cd /home/joey/therun/therun-fr
npx vitest run
npm run lint
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected: tests green, lint clean on changed files, TS error count no higher than the baseline recorded in Task 3.

- [ ] **Step 4: Clear the build cache and build**

```bash
cd /home/joey/therun/therun-fr
ps -eo pid,args | grep "next dev" | grep -v grep    # must be empty before rm -rf .next
rm -rf .next
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Mark the design doc implemented and push**

Add `**Status:** Implemented 2026-08-12 on branch \`submit-run-dialog\`.` under the design doc's title, then:

```bash
cd /home/joey/therun/therun-fr
git add -A
git commit -m "refactor(games-v2): delete the submit page form

The dialog replaces it; submitRunAction has no caller left."
git push -u origin submit-run-dialog
```

Do not open a PR — Joey opens it.

---

## Self-Review

**Spec coverage.** Design §"Why one write path" → Task 7 step 3. §Reachability → Task 5. §Step 1 → Task 6 (defaults from the board context: Task 5 puts them in the URL, Task 6 step 3 reads them). §Step 2 → Tasks 4 and 7, including the "added under this name" copy and the other-boards context line. §Step 3 → Task 7. §Backend → Tasks 1 and 2. §Cache invalidation → open, see below. §Open item → Task 7 step 1 handles both link shapes off `source`.

**Gap found and left deliberate.** The design says the new `runner-entries` cache tag joins the set `revalidate-boards.ts` clears. No task does that, because the dialog's lookups are `'use cache'` with a `minutes` life and are read once per open — a stale answer costs at most one avoidable "already has a run" block within a minute of a submission. Wiring it needs the runner's name at revalidation time, which the mutation actions do not currently carry. Left out; if it bites, add `runnerEntriesCacheTag` to `revalidateAffectedBoards`'s caller with the name that was just submitted.

**Type consistency.** `RunnerGameEntry` fields match between `runner-entries.ts` (Task 1) and `types/leaderboards.types.ts` (Task 3). `RunnerRef` is imported from `types/moderation.types.ts` in Task 4 and is the same type `createManualTimeAction` accepts in Task 7. `resolveRunnerChoice` returns `kind: 'account' | 'name-only'`; Task 7's submit branch keys off `choice !== null` rather than a kind, since a non-moderator never produces a choice at all (fixed inline).
