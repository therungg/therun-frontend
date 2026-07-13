# Run Detail Page + Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public run/manual-time detail pages with a provenance view ("how did this run get on the board"), public summary + mod full chain, per `docs/superpowers/specs/2026-07-13-run-detail-provenance-design.md`.

**Architecture:** Backend (Drizzle/Postgres Lambda API at `/home/joey/therun/therun`) gains provenance columns, an identity-merge audit table, an extended RunDetail, a public manual-time detail endpoint, and a mod-gated provenance endpoint. Frontend (Next 16 at `/home/joey/therun/therun-fr`) gains two public routes sharing one RunView component, with a mod layer reusing the existing RunCard/RunActionDialog.

**Tech Stack:** Backend: TypeScript, Drizzle ORM, drizzle-kit migrations, Jest. Frontend: Next.js 16 App Router (`'use cache'`/`cacheLife`/`cacheTag`), React 19, Bootstrap 5 utilities, vitest.

## Global Constraints

- Two repos, one branch name each: `run-detail-provenance` (feature branches; NEVER open PRs — push only).
- Backend repo root: `/home/joey/therun/therun`. Frontend repo root: `/home/joey/therun/therun-fr`. All paths below are relative to the repo the task names.
- Backend responses: `ok(JSON.stringify(...))` from `src/api/responses.ts`; public `/v1/leaderboards` reads wrap as `{ result: ... }`; mod endpoints return bare JSON (matches `modFetch`).
- Backend display names = `users.username`, fallback `` `user#${id}` ``.
- `finished_runs.source` / `created_at` must stay NULL for historical rows — never add a column default, never backfill.
- Frontend: new `RunDetail` fields are optional — the UI must render when they're absent (older backend).
- Frontend tests live in `src/**/__tests__/*.test.ts` (vitest); backend unit tests in `test/automated/unit/**`, integration in `test/manual/integration/**` (jest).
- Biome formatting (4-space indent, single quotes) in frontend; backend uses double quotes — match each file's surroundings.
- Commit messages: conventional (`feat:`, `fix:`, `docs:`), NO co-author line.
- Frontend commits will trigger husky/biome on staged files — that's expected; let it run.

## File Structure

**Backend (`/home/joey/therun/therun`):**
- Modify `src/db/schema.ts` — `finishedRuns` +2 columns; `logs` index; new `runIdentityHistory` table.
- Create `drizzle/00NN_*.sql` via `npm run generate-migration`.
- Modify `src/sync/sync-runs-to-postgres.ts`, `src/api/leaderboards/submit-handler.ts` — set `source`/`createdAt`.
- Modify `src/services/override-carry/{types.ts,carry-guest-claim-overrides.ts}`, `src/services/move-user.ts`, `src/api/admin/handler.ts` — identity audit + actor threading.
- Create `src/leaderboards/provenance/derive-origin.ts` (pure) + `test/automated/unit/provenance/derive-origin.test.ts`.
- Modify `src/leaderboards/run-history.ts` — appeal/`run_flag` fix, drop dead branch.
- Modify `src/api/leaderboards/handler.ts` — extend `handleRunDetail`, register two new routes.
- Create `src/api/leaderboards/manual-time-detail-handler.ts` (public) and `src/api/leaderboards/mod-provenance-handler.ts` (mod).
- Create `test/manual/integration/leaderboards/provenance.test.ts`.

**Frontend (`/home/joey/therun/therun-fr`):**
- Modify `types/leaderboards.types.ts` (+`RunOrigin`, `ManualTimeDetail`, extend `RunDetail`), `types/moderation.types.ts` (+`RunProvenance` family).
- Modify `src/lib/leaderboards-v1.ts` (+`getManualTimeById`); create `src/lib/moderation/provenance.ts`.
- Create `src/lib/run-view/{time-format.ts,origin-summary.ts,provenance-timeline.ts,describe-event.ts}` + `src/lib/run-view/__tests__/*.test.ts`.
- Create `app/(new-layout)/games-v2/[game]/run-view/{run-view.tsx,origin-panel.tsx,run-history-list.tsx,run-actions.tsx,mod-provenance-panel.tsx}`.
- Create `app/(new-layout)/games-v2/[game]/run/[runId]/page.tsx`, `app/(new-layout)/games-v2/[game]/manual/[manualTimeId]/page.tsx`.
- Modify `app/(new-layout)/games-v2/[game]/leaderboard/{leaderboard-row.tsx,row-actions-menu.tsx}`, `manage/run/[runId]/manage-run-page.tsx`, `src/lib/moderation/revalidate-boards.ts`, `manage/moderation/shared/actions/{exclude,restore,verdicts,manual-times}.action.ts`.

---

## Task 1: Backend schema — provenance columns, identity audit table, logs index

**Files:**
- Modify: `src/db/schema.ts` (finishedRuns ~line 824, logs at 554, new table after `runReassignmentHistory` ~line 1305)
- Create: `drizzle/00NN_run_provenance.sql` (generated)

**Interfaces:**
- Produces: `finishedRuns.source: text | null`, `finishedRuns.createdAt: timestamp("created_at") | null`, exported `runIdentityHistory` table, `logs_entity_target_idx`.

- [ ] **Step 1: Create the branch**

```bash
cd /home/joey/therun/therun && git checkout -b run-detail-provenance
```

- [ ] **Step 2: Add columns to `finishedRuns`**

In `src/db/schema.ts`, inside the `finishedRuns` column object, directly after the line `verifyQueueHidden: boolean("verify_queue_hidden").default(false).notNull(),`:

```ts
        // Provenance: how the row entered the system ('timer' | 'guest_submit',
        // later 'submission'). NULL for rows ingested before this column existed —
        // unknowable, never backfill. No column default: PG would fill history.
        source: text(),
        createdAt: timestamp("created_at"),
```

- [ ] **Step 3: Add the `runIdentityHistory` table**

In `src/db/schema.ts`, directly after the `runReassignmentHistory` table definition:

```ts
// Forward-only audit of identity merges (move-user guest folds). Rows before
// this table existed are unrecoverable — the guest name was overwritten in place.
export const runIdentityHistory = pgTable(
    "run_identity_history",
    {
        id: serial().primaryKey(),
        runId: text("run_id").notNull(),
        fromGuestName: text("from_guest_name"),
        fromUserId: integer("from_user_id").references(() => users.id),
        toUserId: integer("to_user_id")
            .references(() => users.id)
            .notNull(),
        mergedAt: timestamp("merged_at").defaultNow().notNull(),
        performedBy: integer("performed_by").references(() => users.id),
    },
    (table) => [index("rih_run_idx").on(table.runId)],
);
```

- [ ] **Step 4: Index `logs(entity, target)`**

Convert `logs` (schema.ts:554) from the single-arg to the two-arg `pgTable` form — columns unchanged:

```ts
export const logs = pgTable(
    "logs",
    {
        id: serial().primaryKey(),
        userId: integer().references(() => users.id).notNull(),
        remark: varchar({ length: 1000 }),
        action: varchar({ length: 255 }).notNull(),
        entity: varchar({ length: 255 }).notNull(),
        target: varchar({ length: 255 }),
        data: jsonb(),
        timestamp: timestamp().defaultNow().notNull(),
    },
    (table) => [index("logs_entity_target_idx").on(table.entity, table.target)],
);
```

- [ ] **Step 5: Generate and inspect the migration**

Run: `npm run generate-migration`
Expected: a new `drizzle/0070_*.sql` (number may differ). Open it and verify it contains exactly: `ALTER TABLE "finished_runs" ADD COLUMN "source" text;`, `ALTER TABLE "finished_runs" ADD COLUMN "created_at" timestamp;` (NO `DEFAULT`), `CREATE TABLE "run_identity_history" (...)`, `CREATE INDEX "rih_run_idx" ...`, `CREATE INDEX "logs_entity_target_idx" ...`, plus FK constraints. If a `DEFAULT now()` appears on `created_at`, the schema change is wrong — fix Step 2 (no `.defaultNow()`).

- [ ] **Step 6: Apply and typecheck**

Run: `npm run migrate` then `npx tsc --noEmit`
Expected: migration applies cleanly; no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(provenance): source/created_at on finished_runs, run_identity_history table, logs index"
```

---

## Task 2: Backend — stamp `source`/`createdAt` at insert sites; audit identity merges

**Files:**
- Modify: `src/sync/sync-runs-to-postgres.ts:461-486`, `src/api/leaderboards/submit-handler.ts:73-93`
- Modify: `src/services/override-carry/types.ts`, `src/services/override-carry/carry-guest-claim-overrides.ts:21-47`
- Modify: `src/services/move-user.ts:13,135-154`, `src/api/admin/handler.ts:41-59`

**Interfaces:**
- Consumes: Task 1's `runIdentityHistory`, `finishedRuns.source/createdAt`.
- Produces: `moveUser(from: string, to: string, performedBy?: number)`; `GuestClaimCarry` gains `performedBy?: number | null`.

- [ ] **Step 1: Sync insert stamps `source: "timer"`**

In `src/sync/sync-runs-to-postgres.ts`, in the `finishedRunRows.push({ ... })` object (~line 461), after `excluded: runExcluded,` add:

```ts
    source: "timer",
    createdAt: new Date(),
```

- [ ] **Step 2: Guest submit stamps `source: "guest_submit"`**

In `src/api/leaderboards/submit-handler.ts`, in the `db.insert(finishedRuns).values({ ... })` object (~line 73), after `vodUrl: vodUrl || null,` add:

```ts
    source: "guest_submit",
    createdAt: new Date(),
```

- [ ] **Step 3: Thread the actor into the carry input**

In `src/services/override-carry/types.ts`, add to the `GuestClaimCarry` interface:

```ts
    performedBy?: number | null;
```

- [ ] **Step 4: Write audit rows in `carryGuestClaimOverrides`**

In `src/services/override-carry/carry-guest-claim-overrides.ts`:
- Add `runIdentityHistory` to the schema import: `import { finishedRuns, runIdentityHistory } from "../../db/schema";`
- Extend the `.returning({...})` of the finished_runs UPDATE (line 36) to include the id:

```ts
        .returning({
            id: finishedRuns.id,
            gameId: finishedRuns.gameId,
            categoryId: finishedRuns.categoryId,
        });
```

- Directly after `counts.finishedRuns = updated.length;` insert:

```ts
    if (updated.length > 0) {
        await tx.insert(runIdentityHistory).values(
            updated.map((row) => ({
                runId: String(row.id),
                fromGuestName: c.fromGuestName,
                fromUserId: null,
                toUserId: c.toUserId,
                performedBy: c.performedBy ?? null,
            })),
        );
    }
```

- [ ] **Step 5: Thread the actor from `moveUser` and its handler**

In `src/services/move-user.ts` change the signature (line 13) to `export const moveUser = async (from: string, to: string, performedBy?: number) => {` and in the `carryGuestClaimOverrides(tx, { ... })` call (~line 137) add `performedBy: performedBy ?? null,`.

In `src/api/admin/handler.ts` `handleMoveUser` (line 41): after `confirmPermission(user, "edit", "user");` resolve the caller id and pass it through:

```ts
    const db = await getDb();
    const [caller] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${user.user})`)
        .limit(1);
```

and change line 56 to `await moveUser(from, to, caller?.id);`. Add imports at the top: `import { getDb } from "../../db"; import { users } from "../../db/schema"; import { sql } from "drizzle-orm";` (skip any already present).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (No automated test for this task — it's insert-site wiring against a live DB; the mod provenance endpoint test in Task 6 plus Joey's manual pass cover it. Do not fake a DB-mutation test.)

- [ ] **Step 7: Commit**

```bash
git add src/sync/sync-runs-to-postgres.ts src/api/leaderboards/submit-handler.ts src/services/override-carry/ src/services/move-user.ts src/api/admin/handler.ts
git commit -m "feat(provenance): stamp ingest source, audit identity merges"
```

---

## Task 3: Backend — origin derivation helper (pure, TDD)

**Files:**
- Create: `src/leaderboards/provenance/derive-origin.ts`
- Test: `test/automated/unit/provenance/derive-origin.test.ts`

**Interfaces:**
- Produces: `deriveOriginPath(row: { source: string | null; speedrunRunId: number | null; isGuest: boolean; submittedBy: number | null }): "timer" | "guest_submit" | "submission" | null` — used by Tasks 4 and 6.

- [ ] **Step 1: Write the failing test**

`test/automated/unit/provenance/derive-origin.test.ts`:

```ts
import { deriveOriginPath } from "../../../../src/leaderboards/provenance/derive-origin";

describe("deriveOriginPath", () => {
    it("prefers the stored source column", () => {
        expect(deriveOriginPath({ source: "guest_submit", speedrunRunId: 5, isGuest: false, submittedBy: null }))
            .toBe("guest_submit");
        expect(deriveOriginPath({ source: "submission", speedrunRunId: null, isGuest: false, submittedBy: 1 }))
            .toBe("submission");
    });
    it("ignores unknown source values and falls back to markers", () => {
        expect(deriveOriginPath({ source: "junk", speedrunRunId: 5, isGuest: false, submittedBy: null }))
            .toBe("timer");
    });
    it("derives timer from a linked speedrun run", () => {
        expect(deriveOriginPath({ source: null, speedrunRunId: 42, isGuest: false, submittedBy: null }))
            .toBe("timer");
    });
    it("derives guest_submit from isGuest + submittedBy", () => {
        expect(deriveOriginPath({ source: null, speedrunRunId: null, isGuest: true, submittedBy: 7 }))
            .toBe("guest_submit");
    });
    it("returns null when nothing matches", () => {
        expect(deriveOriginPath({ source: null, speedrunRunId: null, isGuest: false, submittedBy: null }))
            .toBeNull();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest test/automated/unit/provenance/derive-origin.test.ts`
Expected: FAIL — cannot find module `derive-origin`.

- [ ] **Step 3: Implement**

`src/leaderboards/provenance/derive-origin.ts`:

```ts
export type FinishedRunOriginPath = "timer" | "guest_submit" | "submission";

const KNOWN: ReadonlySet<string> = new Set(["timer", "guest_submit", "submission"]);

// Rows older than the source column (2026-07) are derived from markers:
// a linked speedrun run means timer sync; isGuest + submittedBy means guest submit.
export const deriveOriginPath = (row: {
    source: string | null;
    speedrunRunId: number | null;
    isGuest: boolean;
    submittedBy: number | null;
}): FinishedRunOriginPath | null => {
    if (row.source && KNOWN.has(row.source)) {
        return row.source as FinishedRunOriginPath;
    }
    if (row.speedrunRunId != null) return "timer";
    if (row.isGuest && row.submittedBy != null) return "guest_submit";
    return null;
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest test/automated/unit/provenance/derive-origin.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/leaderboards/provenance/ test/automated/unit/provenance/
git commit -m "feat(provenance): pure origin-path derivation"
```

---

## Task 4: Backend — history query fixes (appeals visible, dead branch removed)

**Files:**
- Modify: `src/leaderboards/run-history.ts:41-61`
- Test: `test/manual/integration/runs/handler.test.ts` (existing — must stay green)

**Interfaces:**
- Consumes: appeals are logged as `entity='run_flag'`, `data.runId=<number>` (`src/leaderboards/appeals/create-appeal.ts:33-38`).

- [ ] **Step 1: Fix the SQL**

In `getRunHistory`, replace the WHERE clause of the raw SQL:

```ts
         WHERE (entity = 'finished_run' AND target = ${String(runId)})
            OR (entity = 'run_report'   AND data->>'runId' = ${String(runId)})
            OR (entity = 'run_flag'     AND data->>'runId' = ${String(runId)})
```

(The old `entity = 'manual_time' AND data->>'runId' = ...` branch is dead — manual-time logs carry no `runId`; delete it. The new `run_flag` branch makes `create_appeal` events reachable — the action is already in `TYPE_FOR_ACTION`.)

- [ ] **Step 2: Run the existing integration test**

Run: `npx jest test/manual/integration/runs/handler.test.ts`
Expected: PASS (the unknown-run test still returns `200` with an empty array).

- [ ] **Step 3: Commit**

```bash
git add src/leaderboards/run-history.ts
git commit -m "fix(run-history): surface appeal events, drop dead manual_time branch"
```

---

## Task 5: Backend — extend RunDetail + public manual-time detail endpoint

**Files:**
- Modify: `src/api/leaderboards/handler.ts` (`handleRunDetail` at 111, route chain at ~179-224)
- Create: `src/api/leaderboards/manual-time-detail-handler.ts`
- Test: `test/manual/integration/leaderboards/provenance.test.ts`

**Interfaces:**
- Consumes: `deriveOriginPath` (Task 3), Task 1 columns.
- Produces (public API, `{ result }`-wrapped):
  - `GET /v1/leaderboards/runs/{runId}` additionally returns `origin: { path, submittedBy: {userId,name}|null, speedrunRunId: string|null, ingestedAt: string|null }`, `verifiedBy: {userId,name}|null`, `verifiedAt: string|null`, `rejectionReason: string|null`.
  - `GET /v1/leaderboards/manual-times/{id}` returns `ManualTimeDetail` (shape in Step 3).

- [ ] **Step 1: Extend `handleRunDetail`**

In `src/api/leaderboards/handler.ts`:
- Add imports: `import { alias } from "drizzle-orm/pg-core";` and `import { deriveOriginPath } from "../../leaderboards/provenance/derive-origin";` (adjust the relative path to match the file's existing import style).
- Before the select, define aliases: `const submitter = alias(users, "submitter"); const verifier = alias(users, "verifier");` (add `users` to the schema import if absent).
- Add to the `.select({...})`:

```ts
            submittedById: finishedRuns.submittedBy,
            submitterName: submitter.username,
            verifiedById: finishedRuns.verifiedBy,
            verifierName: verifier.username,
            verifiedAt: finishedRuns.verifiedAt,
            rejectionReason: finishedRuns.rejectionReason,
            speedrunRunId: finishedRuns.runId,
            source: finishedRuns.source,
            createdAt: finishedRuns.createdAt,
```

- Add joins after the two existing `innerJoin`s:

```ts
        .leftJoin(submitter, eq(submitter.id, finishedRuns.submittedBy))
        .leftJoin(verifier, eq(verifier.id, finishedRuns.verifiedBy))
```

- In the `result` object, after `variables: ...`, add:

```ts
            origin: {
                path: deriveOriginPath({
                    source: row.source,
                    speedrunRunId: row.speedrunRunId,
                    isGuest: row.isGuest,
                    submittedBy: row.submittedById,
                }),
                submittedBy:
                    row.submittedById != null
                        ? { userId: row.submittedById, name: row.submitterName ?? `user#${row.submittedById}` }
                        : null,
                speedrunRunId: row.speedrunRunId != null ? String(row.speedrunRunId) : null,
                ingestedAt: row.createdAt ? row.createdAt.toISOString() : null,
            },
            verifiedBy:
                row.verifiedById != null
                    ? { userId: row.verifiedById, name: row.verifierName ?? `user#${row.verifiedById}` }
                    : null,
            verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
            rejectionReason: row.rejectionReason ?? null,
```

- [ ] **Step 2: Write the failing integration test**

`test/manual/integration/leaderboards/provenance.test.ts`:

```ts
import { handleLeaderboards } from "../../../../src/api/leaderboards/handler";

describe("run detail provenance", () => {
    it("404s for an unknown run and still has the result envelope shape on errors", async () => {
        const event: any = {
            path: "/v1/leaderboards/runs/999999999",
            httpMethod: "GET",
            pathParameters: { runId: "999999999" },
            headers: {},
        };
        const res = await handleLeaderboards(event);
        expect(res.statusCode).toBe(404);
    });

    it("404s for an unknown manual time", async () => {
        const event: any = {
            path: "/v1/leaderboards/manual-times/999999999",
            httpMethod: "GET",
            headers: {},
        };
        const res = await handleLeaderboards(event);
        expect(res.statusCode).toBe(404);
    });
});
```

Note: `handleRunDetail` reads `event.pathParameters.runId` — keep that in the event. If `handleLeaderboards` is not exported, export it (check the bottom of handler.ts — the API entry imports it, so it is).

- [ ] **Step 3: Run to verify the manual-time test fails**

Run: `npx jest test/manual/integration/leaderboards/provenance.test.ts`
Expected: first test PASS, second FAIL (no manual-times route yet → falls through to `yourFault`, 400).

- [ ] **Step 4: Implement the manual-time detail handler**

`src/api/leaderboards/manual-time-detail-handler.ts`:

```ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { categories, games, manualTimes, users } from "../../db/schema";
import { notFound, ok, yourFault } from "../responses";

export const isManualTimeDetailPath = (path: string): boolean =>
    /\/leaderboards\/manual-times\/\d+$/.test(path);

// Public read for one manual time — the detail-page target for board entries
// with source='manual'. Mirrors the RunDetail shape. The asserting mod's name
// is deliberately NOT exposed here (mod-side only, via the provenance endpoint);
// a self-claim's creator IS the runner, so that name is public.
export const handleManualTimeDetail = async (event: APIGatewayProxyEvent) => {
    const match = event.path.match(/\/manual-times\/(\d+)$/);
    if (!match) return yourFault("manualTimeId is required");
    const id = parseInt(match[1], 10);

    const db = await getDb();
    const [row] = await db
        .select({
            id: manualTimes.id,
            gameId: manualTimes.gameId,
            categoryId: manualTimes.categoryId,
            subcategoryKey: manualTimes.subcategoryKey,
            timing: manualTimes.timing,
            timeMs: manualTimes.timeMs,
            evidenceUrl: manualTimes.evidenceUrl,
            verificationStatus: manualTimes.verificationStatus,
            source: manualTimes.source,
            createdAt: manualTimes.createdAt,
            userId: manualTimes.userId,
            guestName: manualTimes.guestName,
            accountName: users.username,
            gameDisplay: games.display,
            categoryDisplay: categories.display,
        })
        .from(manualTimes)
        .innerJoin(games, eq(games.id, manualTimes.gameId))
        .innerJoin(categories, eq(categories.id, manualTimes.categoryId))
        .leftJoin(users, eq(users.id, manualTimes.userId))
        .where(eq(manualTimes.id, id))
        .limit(1);

    if (!row) return notFound("Manual time not found");

    const runnerName = row.accountName ?? row.guestName ?? "unknown";
    const path = row.source === "self" ? "manual_self" : "manual_mod";
    return ok(
        JSON.stringify({
            result: {
                manualTimeId: row.id,
                gameId: row.gameId,
                gameDisplay: row.gameDisplay,
                categoryId: row.categoryId,
                categoryDisplay: row.categoryDisplay,
                subcategoryKey: row.subcategoryKey,
                runnerName,
                userId: row.userId,
                isGuest: row.userId == null,
                timing: row.timing,
                timeMs: row.timeMs,
                evidenceUrl: row.evidenceUrl,
                verificationStatus: row.verificationStatus,
                origin: {
                    path,
                    submittedBy:
                        path === "manual_self" && row.userId != null
                            ? { userId: row.userId, name: runnerName }
                            : null,
                    speedrunRunId: null,
                    ingestedAt: row.createdAt.toISOString(),
                },
            },
        }),
    );
};
```

- [ ] **Step 5: Register the route**

In `handleLeaderboards` in `src/api/leaderboards/handler.ts`, next to the existing `/runs/\d+` branch (~line 222), add (import `isManualTimeDetailPath, handleManualTimeDetail` at the top):

```ts
    // GET /leaderboards/manual-times/{id}
    if (event.httpMethod === "GET" && isManualTimeDetailPath(path)) {
        return handleManualTimeDetail(event);
    }
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx jest test/manual/integration/leaderboards/provenance.test.ts && npx tsc --noEmit`
Expected: both tests PASS; typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add src/api/leaderboards/handler.ts src/api/leaderboards/manual-time-detail-handler.ts test/manual/integration/leaderboards/
git commit -m "feat(provenance): extend RunDetail origin, public manual-time detail endpoint"
```

---

## Task 6: Backend — mod provenance endpoint

**Files:**
- Create: `src/api/leaderboards/mod-provenance-handler.ts`
- Modify: `src/api/leaderboards/handler.ts` (delegate in `handleLeaderboards`, top section ~182-219)
- Test: `test/manual/integration/leaderboards/provenance.test.ts` (extend)

**Interfaces:**
- Consumes: `deriveOriginPath` (Task 3), `runIdentityHistory` (Task 1), the `requireMod` pattern from `src/api/leaderboards/mod-mass-handler.ts:40-56`.
- Produces (mod API, bare JSON — matches `modFetch`):
  - `GET /mod/leaderboards/games/{gameId}/runs/{runId}/provenance`
  - `GET /mod/leaderboards/games/{gameId}/manual-times/{id}/provenance`
  - Response: `{ ingest: {...}, reassignments: [...], identity: [...], moderation: {...} }` exactly as spec §3c.

- [ ] **Step 1: Extend the failing test**

Add to `test/manual/integration/leaderboards/provenance.test.ts`:

```ts
describe("mod provenance endpoint", () => {
    it("403s without auth", async () => {
        const event: any = {
            path: "/leaderboards/games/1/runs/1/provenance",
            httpMethod: "GET",
            headers: {},
        };
        const res = await handleLeaderboards(event);
        expect(res.statusCode).toBe(403);
    });

    it("403s without auth for the manual-time variant", async () => {
        const event: any = {
            path: "/leaderboards/games/1/manual-times/1/provenance",
            httpMethod: "GET",
            headers: {},
        };
        const res = await handleLeaderboards(event);
        expect(res.statusCode).toBe(403);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest test/manual/integration/leaderboards/provenance.test.ts`
Expected: the two new tests FAIL (400 from the fallthrough, not 403).

- [ ] **Step 3: Implement the handler**

`src/api/leaderboards/mod-provenance-handler.ts`:

```ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "../../db";
import {
    categories,
    categoryReassignments,
    finishedRuns,
    gameReassignments,
    games,
    manualTimes,
    runIdentityHistory,
    runReassignmentHistory,
    users,
} from "../../db/schema";
import { getAuthenticatedUserFromEvent } from "../auth";
import { forbidden, notFound, ok, yourFault } from "../responses";
import { deriveOriginPath } from "../../leaderboards/provenance/derive-origin";
import { checkGameMgmtPermission } from "../games/permissions";

export const isProvenancePath = (path: string): boolean =>
    /\/leaderboards\/games\/\d+\/(runs|manual-times)\/\d+\/provenance$/.test(path);

// NOTE: copy the exact import paths for getAuthenticatedUserFromEvent and
// checkGameMgmtPermission from src/api/leaderboards/mod-mass-handler.ts — the
// paths above are placeholders for whatever that file uses.

const resolveUserId = async (db: any, username: string): Promise<number | null> => {
    const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1);
    return rows[0]?.id ?? null;
};

const requireMod = async (event: APIGatewayProxyEvent, gameId: number) => {
    let authUser;
    try {
        authUser = await getAuthenticatedUserFromEvent(event);
    } catch {
        return { error: forbidden("Not authenticated") } as const;
    }
    const db = await getDb();
    const callerId = await resolveUserId(db, authUser.user);
    if (callerId === null) return { error: forbidden("User not found") } as const;
    try {
        await checkGameMgmtPermission(callerId, "verify-reject-run", { gameId });
    } catch {
        return { error: forbidden("Not authorized to mod this game") } as const;
    }
    return { callerId, db } as const;
};

const nameMap = async (db: any, ids: Array<number | null>): Promise<Map<number, string>> => {
    const wanted = [...new Set(ids.filter((x): x is number => x != null))];
    if (wanted.length === 0) return new Map();
    const rows = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .where(inArray(users.id, wanted));
    return new Map(rows.map((r: { id: number; username: string }) => [r.id, r.username]));
};

const ref = (id: number | null, names: Map<number, string>) =>
    id == null ? null : { userId: id, name: names.get(id) ?? `user#${id}` };

const loadReassignments = async (db: any, runId: number) => {
    const fromGame = alias(games, "from_game");
    const toGame = alias(games, "to_game");
    const fromCat = alias(categories, "from_cat");
    const toCat = alias(categories, "to_cat");
    const rows = await db
        .select({
            gameReassignmentId: runReassignmentHistory.gameReassignmentId,
            categoryReassignmentId: runReassignmentHistory.categoryReassignmentId,
            fromGameId: runReassignmentHistory.fromGameId,
            fromCategoryId: runReassignmentHistory.fromCategoryId,
            toGameId: runReassignmentHistory.toGameId,
            toCategoryId: runReassignmentHistory.toCategoryId,
            movedAt: runReassignmentHistory.movedAt,
            undoneAt: runReassignmentHistory.undoneAt,
            fromGameName: fromGame.display,
            toGameName: toGame.display,
            fromCategoryName: fromCat.display,
            toCategoryName: toCat.display,
            gamePerformedBy: gameReassignments.performedBy,
            catPerformedBy: categoryReassignments.performedBy,
        })
        .from(runReassignmentHistory)
        .leftJoin(gameReassignments, eq(gameReassignments.id, runReassignmentHistory.gameReassignmentId))
        .leftJoin(categoryReassignments, eq(categoryReassignments.id, runReassignmentHistory.categoryReassignmentId))
        .leftJoin(fromGame, eq(fromGame.id, runReassignmentHistory.fromGameId))
        .leftJoin(toGame, eq(toGame.id, runReassignmentHistory.toGameId))
        .leftJoin(fromCat, eq(fromCat.id, runReassignmentHistory.fromCategoryId))
        .leftJoin(toCat, eq(toCat.id, runReassignmentHistory.toCategoryId))
        .where(eq(runReassignmentHistory.runId, String(runId)))
        .orderBy(runReassignmentHistory.movedAt);

    const names = await nameMap(db, rows.flatMap((r: any) => [r.gamePerformedBy, r.catPerformedBy]));
    return rows.map((r: any) => ({
        kind: r.gameReassignmentId != null ? "game" : "category",
        reassignmentId: r.gameReassignmentId ?? r.categoryReassignmentId,
        from: {
            gameId: r.fromGameId,
            gameName: r.fromGameName ?? `game#${r.fromGameId}`,
            categoryId: r.fromCategoryId,
            categoryName: r.fromCategoryName ?? `category#${r.fromCategoryId}`,
        },
        to: {
            gameId: r.toGameId,
            gameName: r.toGameName ?? `game#${r.toGameId}`,
            categoryId: r.toCategoryId,
            categoryName: r.toCategoryName ?? `category#${r.toCategoryId}`,
        },
        movedAt: r.movedAt.toISOString(),
        undoneAt: r.undoneAt ? r.undoneAt.toISOString() : null,
        performedBy: ref(r.gamePerformedBy ?? r.catPerformedBy, names),
    }));
};

const loadIdentity = async (db: any, runId: number) => {
    const rows = await db
        .select()
        .from(runIdentityHistory)
        .where(eq(runIdentityHistory.runId, String(runId)))
        .orderBy(runIdentityHistory.mergedAt);
    const names = await nameMap(db, rows.flatMap((r: any) => [r.toUserId, r.performedBy]));
    return rows.map((r: any) => ({
        fromGuestName: r.fromGuestName,
        fromUserId: r.fromUserId,
        to: ref(r.toUserId, names),
        mergedAt: r.mergedAt.toISOString(),
        performedBy: ref(r.performedBy, names),
    }));
};

export const handleProvenance = async (event: APIGatewayProxyEvent) => {
    if (event.httpMethod !== "GET") return yourFault("Method not allowed");
    const m = event.path.match(/\/leaderboards\/games\/(\d+)\/(runs|manual-times)\/(\d+)\/provenance$/);
    if (!m) return yourFault("bad path");
    const gameId = parseInt(m[1], 10);
    const kind = m[2];
    const id = parseInt(m[3], 10);

    const auth = await requireMod(event, gameId);
    if ("error" in auth) return auth.error;
    const { db } = auth;

    if (kind === "manual-times") {
        const [row] = await db
            .select()
            .from(manualTimes)
            .where(eq(manualTimes.id, id))
            .limit(1);
        if (!row || row.gameId !== gameId) return notFound("Manual time not found");
        const names = await nameMap(db, [row.createdBy, row.userId]);
        return ok(
            JSON.stringify({
                ingest: {
                    path: row.source === "self" ? "manual_self" : "manual_mod",
                    submittedBy: row.source === "self" ? ref(row.userId, names) : null,
                    createdBy: ref(row.createdBy, names),
                    reason: row.reason,
                    ingestedAt: row.createdAt.toISOString(),
                    speedrunRunId: null,
                    platform: null,
                    emulator: null,
                    rawVariables: null,
                },
                reassignments: [],
                identity: [],
                moderation: {
                    modNote: null,
                    ineligibleReason: null,
                    excluded: false,
                    verifyQueueHidden: false,
                },
            }),
        );
    }

    const [run] = await db
        .select()
        .from(finishedRuns)
        .where(eq(finishedRuns.id, id))
        .limit(1);
    if (!run || run.gameId !== gameId) return notFound("Run not found");

    const names = await nameMap(db, [run.submittedBy]);
    const [reassignments, identity] = await Promise.all([
        loadReassignments(db, id),
        loadIdentity(db, id),
    ]);

    return ok(
        JSON.stringify({
            ingest: {
                path: deriveOriginPath({
                    source: run.source,
                    speedrunRunId: run.runId,
                    isGuest: run.isGuest,
                    submittedBy: run.submittedBy,
                }),
                submittedBy: ref(run.submittedBy, names),
                createdBy: null,
                reason: null,
                ingestedAt: run.createdAt ? run.createdAt.toISOString() : null,
                speedrunRunId: run.runId != null ? String(run.runId) : null,
                platform: run.platform,
                emulator: run.emulator,
                rawVariables: run.rawVariables ?? null,
            },
            reassignments,
            identity,
            moderation: {
                modNote: run.modNote,
                ineligibleReason: run.ineligibleReason,
                excluded: run.excluded,
                verifyQueueHidden: run.verifyQueueHidden,
            },
        }),
    );
};
```

**IMPORTANT:** before writing this file, open `src/api/leaderboards/mod-mass-handler.ts` and copy its exact imports for `getAuthenticatedUserFromEvent` and `checkGameMgmtPermission` (and its `requireMod`) — the import paths in the snippet are placeholders and WILL be wrong.

- [ ] **Step 4: Delegate the route**

In `handleLeaderboards` (`src/api/leaderboards/handler.ts`), alongside the other `is*Path` delegations at the top (~182-219):

```ts
    if (isProvenancePath(path)) {
        return handleProvenance(event);
    }
```

with the matching import. Order matters: this must run BEFORE `isModMassPath`/`isManualTimesPath` checks if their regexes could also match — `isManualTimesPath` (`/\/leaderboards\/games\/\d+\/manual-times/`) DOES match the manual-times provenance path, so put the `isProvenancePath` check first.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx jest test/manual/integration/leaderboards/provenance.test.ts && npx tsc --noEmit`
Expected: all 4 tests PASS (403s now come from `requireMod`); typecheck clean.

- [ ] **Step 6: Commit and push the backend branch**

```bash
git add src/api/leaderboards/
git commit -m "feat(provenance): mod provenance endpoint (runs + manual times)"
git push -u origin run-detail-provenance
```

---

## Task 7: Frontend — types + fetchers + pure view helpers (TDD)

**Files:**
- Modify: `types/leaderboards.types.ts`, `types/moderation.types.ts`
- Modify: `src/lib/leaderboards-v1.ts`; Create: `src/lib/moderation/provenance.ts`
- Create: `src/lib/run-view/time-format.ts`, `src/lib/run-view/origin-summary.ts`
- Test: `src/lib/run-view/__tests__/time-format.test.ts`, `src/lib/run-view/__tests__/origin-summary.test.ts`

**Interfaces:**
- Produces:
  - Types: `RunOrigin`, `RunOriginRef`, `ManualTimeDetail`; `RunDetail` gains optional `origin`, `verifiedBy`, `verifiedAt`, `rejectionReason`; `RunProvenance` family in moderation types.
  - `getManualTimeById(id: number): Promise<ManualTimeDetail | null>` (cached, tag `manual-time:${id}`)
  - `getRunProvenance(sessionId: string, gameId: number, runId: number): Promise<RunProvenance>` and `getManualTimeProvenance(sessionId: string, gameId: number, manualTimeId: number): Promise<RunProvenance>`
  - `formatTimeMs(ms: number): string` (e.g. `1:23:45.678` / `23:45` — used in titles/metadata)
  - `originSummary(origin: RunOrigin | null | undefined, runnerName: string): { line: string; showSplitsLink: boolean } | null`

- [ ] **Step 1: Branch**

```bash
cd /home/joey/therun/therun-fr && git checkout -b run-detail-provenance
```

- [ ] **Step 2: Add the types**

In `types/leaderboards.types.ts`, after `RunDetail`:

```ts
export interface RunOriginRef {
    userId: number;
    name: string;
}

export type RunOriginPath =
    | 'timer'
    | 'guest_submit'
    | 'submission'
    | 'manual_mod'
    | 'manual_self';

export interface RunOrigin {
    path: RunOriginPath | null;
    submittedBy: RunOriginRef | null;
    speedrunRunId: string | null;
    ingestedAt: string | null;
}

// Backend: GET /v1/leaderboards/manual-times/{id}
export interface ManualTimeDetail {
    manualTimeId: number;
    gameId: number;
    gameDisplay: string;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    timing: 'realtime' | 'gametime';
    timeMs: number;
    evidenceUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    origin: RunOrigin;
}
```

and extend `RunDetail` (all optional — older backend must keep working):

```ts
    origin?: RunOrigin;
    verifiedBy?: RunOriginRef | null;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
```

In `types/moderation.types.ts`, in §G:

```ts
// ── Run provenance (mod-only full chain) ─────────────────────────────────────

export interface ProvenanceEntityRef {
    gameId: number;
    gameName: string;
    categoryId: number;
    categoryName: string;
}

export interface ProvenanceReassignment {
    kind: 'game' | 'category';
    reassignmentId: number;
    from: ProvenanceEntityRef;
    to: ProvenanceEntityRef;
    movedAt: string;
    undoneAt: string | null;
    performedBy: { userId: number; name: string } | null;
}

export interface ProvenanceIdentity {
    fromGuestName: string | null;
    fromUserId: number | null;
    to: { userId: number; name: string } | null;
    mergedAt: string;
    performedBy: { userId: number; name: string } | null;
}

export interface RunProvenance {
    ingest: {
        path: 'timer' | 'guest_submit' | 'submission' | 'manual_mod' | 'manual_self' | null;
        submittedBy: { userId: number; name: string } | null;
        createdBy: { userId: number; name: string } | null;
        reason: string | null;
        ingestedAt: string | null;
        speedrunRunId: string | null;
        platform: string | null;
        emulator: boolean | null;
        rawVariables: Record<string, string> | null;
    };
    reassignments: ProvenanceReassignment[];
    identity: ProvenanceIdentity[];
    moderation: {
        modNote: string | null;
        ineligibleReason: string | null;
        excluded: boolean;
        verifyQueueHidden: boolean;
    };
}
```

- [ ] **Step 3: Fetchers**

In `src/lib/leaderboards-v1.ts` (mirrors `getRunById` exactly — same file, same idioms):

```ts
export async function getManualTimeById(
    id: number,
): Promise<ManualTimeDetail | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`manual-time:${id}`);
    try {
        const body = await v1Fetch<{ result: ManualTimeDetail }>(
            `/v1/leaderboards/manual-times/${id}`,
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}
```

(add `ManualTimeDetail` to the types import.)

Create `src/lib/moderation/provenance.ts`:

```ts
import type { RunProvenance } from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

// Mod-only full provenance chain. No caching — mods need live data.
export function getRunProvenance(
    sessionId: string,
    gameId: number,
    runId: number,
): Promise<RunProvenance> {
    return modFetch(`/leaderboards/games/${gameId}/runs/${runId}/provenance`, {
        sessionId,
    });
}

export function getManualTimeProvenance(
    sessionId: string,
    gameId: number,
    manualTimeId: number,
): Promise<RunProvenance> {
    return modFetch(
        `/leaderboards/games/${gameId}/manual-times/${manualTimeId}/provenance`,
        { sessionId },
    );
}
```

(match the relative types import style used by `src/lib/moderation/runs.ts`.)

- [ ] **Step 4: Write failing tests for the pure helpers**

`src/lib/run-view/__tests__/time-format.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { formatTimeMs } from '../time-format';

describe('formatTimeMs', () => {
    test('hours', () => expect(formatTimeMs(3600000 + 23 * 60000 + 45000)).toBe('1:23:45'));
    test('minutes', () => expect(formatTimeMs(23 * 60000 + 45000)).toBe('23:45'));
    test('sub-minute keeps ms', () => expect(formatTimeMs(59678)).toBe('0:59.678'));
    test('zero-pads inner units', () => expect(formatTimeMs(3600000 + 5000)).toBe('1:00:05'));
});
```

`src/lib/run-view/__tests__/origin-summary.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { originSummary } from '../origin-summary';
import type { RunOrigin } from '../../../../types/leaderboards.types';

const base: RunOrigin = {
    path: null,
    submittedBy: null,
    speedrunRunId: null,
    ingestedAt: '2026-07-01T00:00:00.000Z',
};

describe('originSummary', () => {
    test('timer', () => {
        const s = originSummary({ ...base, path: 'timer' }, 'joey');
        expect(s?.line).toContain('Auto-tracked from a LiveSplit upload');
        expect(s?.showSplitsLink).toBe(true);
    });
    test('guest submit names the submitter', () => {
        const s = originSummary(
            { ...base, path: 'guest_submit', submittedBy: { userId: 1, name: 'modguy' } },
            'guestrunner',
        );
        expect(s?.line).toBe('Submitted on behalf of guestrunner by modguy');
        expect(s?.showSplitsLink).toBe(false);
    });
    test('manual self', () => {
        expect(originSummary({ ...base, path: 'manual_self' }, 'joey')?.line).toBe(
            'Self-claimed by the runner',
        );
    });
    test('manual mod', () => {
        expect(originSummary({ ...base, path: 'manual_mod' }, 'joey')?.line).toBe(
            'Time asserted by a moderator',
        );
    });
    test('null origin and null path both hide the panel', () => {
        expect(originSummary(undefined, 'joey')).toBeNull();
        expect(originSummary({ ...base, path: null }, 'joey')).toBeNull();
    });
});
```

- [ ] **Step 5: Run to verify they fail**

Run: `npx vitest run src/lib/run-view/__tests__/`
Expected: FAIL — modules don't exist.

- [ ] **Step 6: Implement**

`src/lib/run-view/time-format.ts`:

```ts
// Human duration for titles/metadata. Sub-minute times keep milliseconds;
// longer times drop them (matches how boards read).
export function formatTimeMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const millis = ms % 1000;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    if (m > 0) return `${m}:${pad(s)}`;
    return `0:${pad(s)}.${String(millis).padStart(3, '0')}`;
}
```

`src/lib/run-view/origin-summary.ts`:

```ts
import type { RunOrigin } from '../../../types/leaderboards.types';

export interface OriginSummary {
    line: string;
    showSplitsLink: boolean;
}

// Public one-line answer to "how did this entry get on the board".
// Returns null when the backend didn't send an origin (older API) — panel hides.
export function originSummary(
    origin: RunOrigin | null | undefined,
    runnerName: string,
): OriginSummary | null {
    if (!origin?.path) return null;
    switch (origin.path) {
        case 'timer':
            return {
                line: 'Auto-tracked from a LiveSplit upload',
                showSplitsLink: true,
            };
        case 'guest_submit':
        case 'submission':
            return {
                line: origin.submittedBy
                    ? `Submitted on behalf of ${runnerName} by ${origin.submittedBy.name}`
                    : `Submitted by ${runnerName}`,
                showSplitsLink: false,
            };
        case 'manual_self':
            return { line: 'Self-claimed by the runner', showSplitsLink: false };
        case 'manual_mod':
            return { line: 'Time asserted by a moderator', showSplitsLink: false };
    }
}
```

- [ ] **Step 7: Run tests + typecheck**

Run: `npx vitest run src/lib/run-view/__tests__/ && npm run typecheck`
Expected: all PASS; typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add types/ src/lib/leaderboards-v1.ts src/lib/moderation/provenance.ts src/lib/run-view/
git commit -m "feat(run-view): provenance types, fetchers, origin summary helpers"
```

---

## Task 8: Frontend — provenance timeline merge (pure, TDD) + shared describe-event

**Files:**
- Create: `src/lib/run-view/provenance-timeline.ts`, `src/lib/run-view/describe-event.ts`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx` (import `describeEvent` from the new module, delete its local copy)
- Test: `src/lib/run-view/__tests__/provenance-timeline.test.ts`

**Interfaces:**
- Consumes: `RunProvenance`, `HistoryEvent` types.
- Produces:
  - `describeEvent(e: HistoryEvent): string` — moved verbatim from `row-actions-menu.tsx` (find the local `describeEvent` there and lift it unchanged).
  - `buildProvenanceTimeline(prov: RunProvenance | null, history: HistoryEvent[]): TimelineItem[]` with `TimelineItem = { at: string | null; kind: 'ingest' | 'reassignment' | 'identity' | 'history'; label: string; sub: string | null; struck: boolean }`.

- [ ] **Step 1: Write the failing test**

`src/lib/run-view/__tests__/provenance-timeline.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { buildProvenanceTimeline } from '../provenance-timeline';
import type { RunProvenance } from '../../../../types/moderation.types';
import type { HistoryEvent } from '../../../../types/moderation.types';

const prov: RunProvenance = {
    ingest: {
        path: 'timer',
        submittedBy: null,
        createdBy: null,
        reason: null,
        ingestedAt: '2026-01-01T00:00:00.000Z',
        speedrunRunId: '42',
        platform: 'PC',
        emulator: false,
        rawVariables: null,
    },
    reassignments: [
        {
            kind: 'game',
            reassignmentId: 7,
            from: { gameId: 1, gameName: 'Elden Rng', categoryId: 2, categoryName: 'Any%' },
            to: { gameId: 3, gameName: 'Elden Ring', categoryId: 4, categoryName: 'Any%' },
            movedAt: '2026-02-01T00:00:00.000Z',
            undoneAt: null,
            performedBy: { userId: 9, name: 'modguy' },
        },
    ],
    identity: [],
    moderation: { modNote: null, ineligibleReason: null, excluded: false, verifyQueueHidden: false },
};

const history: HistoryEvent[] = [
    { type: 'verdict', action: 'verdict_verify', byRole: 'mod', reason: 'looks clean', at: '2026-03-01T00:00:00.000Z' },
];

describe('buildProvenanceTimeline', () => {
    test('orders ingest -> reassignment -> history', () => {
        const items = buildProvenanceTimeline(prov, history);
        expect(items.map((i) => i.kind)).toEqual(['ingest', 'reassignment', 'history']);
    });
    test('ingest with null date sorts first', () => {
        const p = { ...prov, ingest: { ...prov.ingest, ingestedAt: null } };
        const items = buildProvenanceTimeline(p, history);
        expect(items[0].kind).toBe('ingest');
        expect(items[0].at).toBeNull();
    });
    test('reassignment label names the original board and actor', () => {
        const item = buildProvenanceTimeline(prov, [])[1];
        expect(item.label).toContain('Elden Rng');
        expect(item.label).toContain('Elden Ring');
        expect(item.sub).toContain('modguy');
        expect(item.struck).toBe(false);
    });
    test('undone reassignments are struck', () => {
        const p = {
            ...prov,
            reassignments: [{ ...prov.reassignments[0], undoneAt: '2026-02-02T00:00:00.000Z' }],
        };
        expect(buildProvenanceTimeline(p, [])[1].struck).toBe(true);
    });
    test('works with null provenance (history only)', () => {
        const items = buildProvenanceTimeline(null, history);
        expect(items).toHaveLength(1);
        expect(items[0].kind).toBe('history');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/run-view/__tests__/provenance-timeline.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`src/lib/run-view/describe-event.ts`: locate the `describeEvent` function inside `app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx`, move it here VERBATIM (with the `HistoryEvent` import), export it, and change `row-actions-menu.tsx` to `import { describeEvent } from '~src/lib/run-view/describe-event';`.

`src/lib/run-view/provenance-timeline.ts`:

```ts
import type { HistoryEvent, RunProvenance } from '../../../types/moderation.types';
import { describeEvent } from './describe-event';

export interface TimelineItem {
    at: string | null; // ISO; null = unknown (pre-column ingest) — sorts first
    kind: 'ingest' | 'reassignment' | 'identity' | 'history';
    label: string;
    sub: string | null;
    struck: boolean;
}

const INGEST_LABEL: Record<string, string> = {
    timer: 'Ingested from a LiveSplit upload',
    guest_submit: 'Submitted as a guest run',
    submission: 'Submitted via the run form',
    manual_mod: 'Manual time asserted by a moderator',
    manual_self: 'Manual time self-claimed by the runner',
};

export function buildProvenanceTimeline(
    prov: RunProvenance | null,
    history: HistoryEvent[],
): TimelineItem[] {
    const items: TimelineItem[] = [];

    if (prov) {
        const ing = prov.ingest;
        const bits = [
            ing.submittedBy ? `by ${ing.submittedBy.name}` : null,
            ing.createdBy ? `by ${ing.createdBy.name}` : null,
            ing.platform ? `platform ${ing.platform}` : null,
            ing.emulator ? 'emulator' : null,
            ing.reason ? `"${ing.reason}"` : null,
        ].filter(Boolean);
        items.push({
            at: ing.ingestedAt,
            kind: 'ingest',
            label: ing.path ? (INGEST_LABEL[ing.path] ?? ing.path) : 'Origin unknown',
            sub: bits.length ? bits.join(' · ') : null,
            struck: false,
        });
        for (const r of prov.reassignments) {
            items.push({
                at: r.movedAt,
                kind: 'reassignment',
                label: `Originally on ${r.from.gameName} / ${r.from.categoryName} — moved to ${r.to.gameName} / ${r.to.categoryName}`,
                sub: r.performedBy ? `by ${r.performedBy.name}` : null,
                struck: r.undoneAt != null,
            });
        }
        for (const m of prov.identity) {
            items.push({
                at: m.mergedAt,
                kind: 'identity',
                label: m.fromGuestName
                    ? `Guest "${m.fromGuestName}" merged into ${m.to?.name ?? 'account'}`
                    : `Identity moved to ${m.to?.name ?? 'account'}`,
                sub: m.performedBy ? `by ${m.performedBy.name}` : null,
                struck: false,
            });
        }
    }

    for (const e of history) {
        items.push({
            at: e.at,
            kind: 'history',
            label: describeEvent(e),
            sub: e.reason ? `"${e.reason}"` : null,
            struck: false,
        });
    }

    return items.sort((a, b) => {
        if (a.at === null) return -1;
        if (b.at === null) return 1;
        return a.at.localeCompare(b.at);
    });
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run src/lib/run-view/__tests__/ && npm run typecheck`
Expected: PASS + clean (including the row-actions-menu import change).

- [ ] **Step 5: Commit**

```bash
git add src/lib/run-view/ "app/(new-layout)/games-v2/[game]/leaderboard/row-actions-menu.tsx"
git commit -m "feat(run-view): provenance timeline builder, shared describe-event"
```

---

## Task 9: Frontend — shared RunView components

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/run-view/run-view.tsx` (server), `origin-panel.tsx` (server), `run-history-list.tsx` (server), `run-actions.tsx` (client)

**Interfaces:**
- Consumes: `RunDetail`/`ManualTimeDetail`, `ResolvedGame` (fields: `id`, `name` = slug, `display`, `image`), `Vod` from `~src/components/run/dashboard/vod`, `UserLink` from `~src/components/links/links`, `DurationToFormatted` from `~src/components/util/datetime`, `VerificationBadge`/`VariablesLine` (check `manage/run/[runId]/run-card.tsx` for their location — reuse, don't duplicate), server actions `reportRunAction`/`appealRunAction` from `~src/actions/run-user-actions.action`, `originSummary`, `buildProvenanceTimeline`.
- Produces:

```tsx
// run-view.tsx
export interface RunViewModel {
    kind: 'run' | 'manual';
    id: number;                       // runId or manualTimeId
    game: ResolvedGame;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    realTime: number | null;
    gameTime: number | null;
    runDate: string | null;           // null for manual times (no run date)
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
    origin: RunOrigin | null;
    verifiedBy: RunOriginRef | null;
    rejectionReason: string | null;
}
export function RunView(props: {
    model: RunViewModel;
    history: HistoryEvent[];          // [] for manual times
    sessionUsername: string | null;
    modPanel?: React.ReactNode;       // mod layer slot, page decides
}): JSX.Element;
```

Layout (Bootstrap utilities, matching `game-header.tsx` / `run-card.tsx` idioms):

1. Header: `<header className="d-flex align-items-center gap-3 mb-3">` — `<img src={game.image} width={48} height={64} style={{ aspectRatio: '3 / 4' }} alt="" />` (only when `game.image`), `<h1 className="h4 mb-0">` runner + time, category + subcategory pills as `badge text-bg-secondary`, verification badge; when `verifiedBy` is set append `<span className="text-muted small">verified by {verifiedBy.name}</span>`; when rejected and `rejectionReason` present show `<div className="alert alert-warning small">Rejected: {rejectionReason}</div>`.
2. Two-column: `row` → `col-lg-8`: `<Vod vod={model.vodUrl} />` when vodUrl else a bordered empty state "No video attached"; `col-lg-4`: times card (`border rounded p-3` with RT/GT via `DurationToFormatted`, run date via `toLocaleDateString()` when `runDate`), variables list, `<OriginPanel ... />`, `<RunActions ... />`.
3. Below: `<RunHistoryList events={history} />` (hidden when empty) then `{modPanel}`.

- `origin-panel.tsx` (server): calls `originSummary(model.origin, model.runnerName)`; renders `null` when it returns null. Otherwise `border rounded p-3`: the `line`, `ingestedAt` as `Ingested {new Date(...).toLocaleDateString()}` or `Ingest date unknown` when null, and when `showSplitsLink && model.userId != null && !model.isGuest`: `<Link href={`/${model.runnerName}/${encodeURIComponent(model.game.display)}`}>View splits & attempt stats</Link>`. Pending manual claims (`origin.path === 'manual_self' && verificationStatus === 'pending'`) get `badge text-bg-warning">Self-reported · unverified`.
- `run-history-list.tsx` (server): the `<ul className="list-unstyled">` / `<li className="border-start ps-3 pb-3 position-relative">` markup from the row-actions-menu history modal, using `describeEvent` + `byRole` + relative time (`moment(e.at).fromNow()` — moment is already a dependency there).
- `run-actions.tsx` (`'use client'`): Report + Appeal buttons with reason modals, calling `reportRunAction(runId, reason)` / `appealRunAction(runId, reason)`, toast on success/error — copy the modal pattern from `row-actions-menu.tsx`. Appeal renders only when `sessionUsername === model.runnerName`; both render only for `kind === 'run'` (reports/appeals are run-scoped). Report requires sign-in — hide when `sessionUsername` is null. Include a "Copy link" button using `navigator.clipboard.writeText(window.location.href)`.

- [ ] **Step 1: Build the four components** per the interface above. Reuse — do not re-implement — `Vod`, `UserLink`, `DurationToFormatted`, and whatever badge/variables components `run-card.tsx` imports.

- [ ] **Step 1b: Test the vod URL parsing (spec Testing section)**

`src/components/run/dashboard/vod.tsx` has a `youtubeParser` — export it if it isn't already, then add `src/lib/run-view/__tests__/vod-parse.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { youtubeParser } from '~src/components/run/dashboard/vod';

describe('youtubeParser', () => {
    test('watch url', () => {
        expect(youtubeParser('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toContain('dQw4w9WgXcQ');
    });
    test('short url', () => {
        expect(youtubeParser('https://youtu.be/dQw4w9WgXcQ')).toContain('dQw4w9WgXcQ');
    });
    test('non-youtube returns falsy', () => {
        expect(youtubeParser('https://example.com/video')).toBeFalsy();
    });
});
```

Adjust assertions to the parser's actual return shape (id vs full embed URL) after reading it — the behaviors under test (extracts id from both URL forms, rejects non-YouTube) must hold. Run: `npx vitest run src/lib/run-view/__tests__/vod-parse.test.ts` — PASS.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: clean. (No render-test infra exists — vitest has no jsdom here; correctness is covered by the pure-helper tests and Joey's manual pass.)

- [ ] **Step 3: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/run-view/"
git commit -m "feat(run-view): shared run view components"
```

---

## Task 10: Frontend — public routes `run/[runId]` and `manual/[manualTimeId]`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/run/[runId]/page.tsx`, `app/(new-layout)/games-v2/[game]/manual/[manualTimeId]/page.tsx`

**Interfaces:**
- Consumes: `resolveGame` (`~src/lib/games-v1`), `getRunById`/`getManualTimeById`, `getRunHistory` (`~src/lib/moderation/runs` — public, works without session), `getSession` (`~src/actions/session.action`), `canModerateGame` (`~src/lib/moderation/can-moderate`), `getRunProvenance`/`getManualTimeProvenance`, `RunView`, `ModProvenancePanel` (Task 11 — until it exists, pass `modPanel={undefined}`), `buildMetadata`/`getGameImage` (`~src/utils/metadata`), `formatTimeMs`.

- [ ] **Step 1: Run page**

`app/(new-layout)/games-v2/[game]/run/[runId]/page.tsx` (server component — NO admin gate; this is a public page by design, spec §1):

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getRunProvenance } from '~src/lib/moderation/provenance';
import { getRunHistory } from '~src/lib/moderation/runs';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { buildMetadata } from '~src/utils/metadata';
import { RunView } from '../../run-view/run-view';
import { ModProvenancePanel } from '../../run-view/mod-provenance-panel';

interface PageProps {
    params: Promise<{ game: string; runId: string }>;
}

async function load(gameSlug: string, runIdRaw: string) {
    const runId = Number.parseInt(runIdRaw, 10);
    if (!Number.isFinite(runId)) return null;
    const game = await resolveGame(gameSlug);
    if (!game) return null;
    const run = await getRunById(runId);
    if (!run || run.gameId !== game.id) return null;
    return { game, run, runId };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { game, runId } = await params;
    const data = await load(game, runId);
    if (!data) return buildMetadata();
    const time = formatTimeMs(data.run.time);
    return buildMetadata({
        title: `${time} by ${data.run.runnerName} — ${data.run.gameDisplay} ${data.run.categoryDisplay}`,
        description: `${data.run.runnerName}'s ${data.run.categoryDisplay} run of ${data.run.gameDisplay} in ${time}, on therun.gg leaderboards.`,
    });
}

export default async function RunDetailPage({ params }: PageProps) {
    const { game: gameSlug, runId: runIdRaw } = await params;
    const data = await load(gameSlug, runIdRaw);
    if (!data) notFound();
    const { game, run, runId } = data;

    const session = await getSession();
    const isMod = canModerateGame(session, game.name);

    const [history, provenance] = await Promise.all([
        getRunHistory(runId).catch(() => []),
        isMod && session?.id
            ? getRunProvenance(session.id, game.id, runId).catch(() => null)
            : Promise.resolve(null),
    ]);

    return (
        <RunView
            model={{
                kind: 'run',
                id: runId,
                game,
                categoryDisplay: run.categoryDisplay,
                subcategoryKey: run.subcategoryKey,
                runnerName: run.runnerName,
                userId: run.userId,
                isGuest: run.isGuest,
                realTime: run.realTime,
                gameTime: run.gameTime,
                runDate: run.runDate,
                vodUrl: run.vodUrl,
                verificationStatus: run.verificationStatus,
                variables: run.variables,
                origin: run.origin ?? null,
                verifiedBy: run.verifiedBy ?? null,
                rejectionReason: run.rejectionReason ?? null,
            }}
            history={history}
            sessionUsername={session?.username ?? null}
            modPanel={
                isMod ? (
                    <ModProvenancePanel
                        provenance={provenance}
                        history={history}
                        gameSlug={game.name}
                        runId={runId}
                    />
                ) : undefined
            }
        />
    );
}
```

(`canModerateGame(session, ...)` — check the `User | undefined` param type against what `getSession` returns; pass accordingly.)

- [ ] **Step 2: Manual-time page**

`app/(new-layout)/games-v2/[game]/manual/[manualTimeId]/page.tsx` — same skeleton with: `getManualTimeById`, `mt.gameId !== game.id → notFound()`, `history={[]}` (no run-history endpoint for manual times), time fields mapped as `realTime: mt.timing === 'realtime' ? mt.timeMs : null`, `gameTime: mt.timing === 'gametime' ? mt.timeMs : null`, `runDate: null`, `vodUrl: mt.evidenceUrl`, `origin: mt.origin`, `verifiedBy: null`, `rejectionReason: null`, `kind: 'manual'`, metadata title from `formatTimeMs(mt.timeMs)`, and mod panel via `getManualTimeProvenance`.

- [ ] **Step 3: Typecheck + dev smoke**

Run: `npm run typecheck`
Expected: clean. (Task 11 creates `ModProvenancePanel` — if executing tasks in order, temporarily stub it as `export function ModProvenancePanel(): null { return null; }` in Task 9's directory and note it; Task 11 replaces the stub. Better: execute Tasks 9-11 as one review unit if your executor allows.)

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/run/" "app/(new-layout)/games-v2/[game]/manual/"
git commit -m "feat(run-view): public run and manual-time detail pages"
```

---

## Task 11: Frontend — mod provenance panel + manage-page integration

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/run-view/mod-provenance-panel.tsx` (server)
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/manage-run-page.tsx`

**Interfaces:**
- Consumes: `buildProvenanceTimeline`, `RunProvenance`, `RunCard` (existing client action card at `manage/run/[runId]/run-card.tsx`).
- Produces: `ModProvenancePanel(props: { provenance: RunProvenance | null; history: HistoryEvent[]; gameSlug: string; runId: number | null }): JSX.Element`.

- [ ] **Step 1: Implement the panel**

`mod-provenance-panel.tsx` (server component; visually distinct — `border border-warning-subtle rounded p-3`, heading "Moderator view"):

- Timeline: `buildProvenanceTimeline(provenance, history)` rendered as the same `list-unstyled` / `border-start ps-3` timeline; `struck` items get `text-decoration-line-through text-muted` and an `(undone)` suffix; `at === null` renders "date unknown".
- When `provenance` is null: `<p className="text-muted small">Full provenance unavailable (endpoint missing or errored) — showing public history only.</p>` (graceful-degradation requirement, spec §4).
- Moderation facts row when provenance present: `modNote`, `ineligibleReason`, `excluded`, `verifyQueueHidden` as label/value pairs; `rawVariables` as `<code>` when present.

- [ ] **Step 2: Put the shared view on the manage page**

In `manage-run-page.tsx`: keep the existing `RunCard` (the mod action buttons) but add above it the provenance timeline. Simplest correct move: the manage page (`manage/run/[runId]/page.tsx`) already loads `run` + session server-side — extend its loader to also fetch `getRunProvenance(session.id, game.id, runId).catch(() => null)` and `getRunHistory(runId).catch(() => [])`, pass both into `ManageRunPage`, and render `<ModProvenancePanel provenance={...} history={...} gameSlug={game.name} runId={run.runId} />` above `<RunCard ...>`. Do NOT rebuild the manage page around `RunView` — its chrome (SubrouteChrome) and gating already work; the shared pieces are the timeline + helpers.

- [ ] **Step 3: Typecheck + lint, remove any Task 10 stub**

Run: `npm run typecheck && npm run lint`
Expected: clean; grep for the temporary stub comment if one was added in Task 10 and confirm it's gone.

- [ ] **Step 4: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/run-view/mod-provenance-panel.tsx" "app/(new-layout)/games-v2/[game]/manage/run/"
git commit -m "feat(run-view): mod provenance panel, wired into manage run page"
```

---

## Task 12: Frontend — board links + cache revalidation

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx`
- Modify: `src/lib/moderation/revalidate-boards.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/exclude.action.ts`, `restore.action.ts`, `verdicts.action.ts`, `manual-times.action.ts`
- Modify: `src/actions/run-user-actions.action.ts`

**Interfaces:**
- Consumes: `LeaderboardEntry.runId` / `.manualTimeId` / `.source`.
- Produces: `revalidateRunDetails(runIds: number[], manualTimeIds?: number[]): void` in `revalidate-boards.ts`.

- [ ] **Step 1: Link every board entry to its detail page**

In `leaderboard-row.tsx`, compute:

```tsx
const detailHref =
    entry.source === 'manual' && entry.manualTimeId != null
        ? `/games-v2/${gameSlug}/manual/${entry.manualTimeId}`
        : entry.runId != null
          ? `/games-v2/${gameSlug}/run/${entry.runId}`
          : null;
```

and wrap the primary time cell's value in `<Link href={detailHref} className="text-decoration-none">` when `detailHref` is non-null (plain text otherwise). Keep the existing Manage button untouched.

- [ ] **Step 1b: WR card link (spec: "Board rows and the WR card link every entry to its page")**

In `app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx`, apply the same `detailHref` computation to whatever run/entry object the card renders (check its prop shape — it needs `runId`/`manualTimeId`/`source` available; if the WR data lacks them, thread them through from the loader in `data.ts` rather than skipping the link) and wrap the WR time in the same `<Link>`.

- [ ] **Step 2: Revalidation helper**

In `src/lib/moderation/revalidate-boards.ts` add (imports match the file's existing `revalidateTag` usage — two-arg form, profile `'minutes'`):

```ts
// Run/manual detail pages cache under run:{id} / manual-time:{id} (minutes profile).
// Call after any verdict/exclude/restore/manual-time mutation so the detail page
// reflects the action immediately.
export function revalidateRunDetails(
    runIds: number[],
    manualTimeIds: number[] = [],
): void {
    for (const id of runIds) revalidateTag(`run:${id}`, 'minutes');
    for (const id of manualTimeIds) revalidateTag(`manual-time:${id}`, 'minutes');
}
```

(Note: `getRunById` already tags `run:${runId}` — this makes existing verdicts finally invalidate it.)

- [ ] **Step 3: Call it from every mutating action**

- `exclude.action.ts`, `restore.action.ts`, `verdicts.action.ts`: after their existing `revalidateAffectedBoards(...)` call, add `revalidateRunDetails(runIds);` (each action already has the `runIds` array in scope — verify the variable name per file).
- `manual-times.action.ts`: after its board revalidation, `revalidateRunDetails([], [manualTimeId]);` (match the in-scope id variable).
- `src/actions/run-user-actions.action.ts`: in `selfRunVerdictAction` and `appealRunAction`, after a successful call add `revalidateRunDetails([runId]);` (import from `~src/lib/moderation/revalidate-boards`).

- [ ] **Step 4: Typecheck + full test suite**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean/green.

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx" src/lib/moderation/revalidate-boards.ts "app/(new-layout)/games-v2/[game]/manage/moderation/shared/actions/" src/actions/run-user-actions.action.ts
git commit -m "feat(run-view): board entry links, run-detail cache revalidation"
```

---

## Task 13: Finalize — build, push, status doc

**Files:**
- Modify: `docs/superpowers/specs/2026-07-13-run-detail-provenance-design.md` (status line)

- [ ] **Step 1: Frontend production build**

Run: `cd /home/joey/therun/therun-fr && rm -rf .next && npm run build`
Expected: build succeeds. Fix anything it surfaces before proceeding.

- [ ] **Step 2: Backend typecheck + full unit tests**

Run: `cd /home/joey/therun/therun && npx tsc --noEmit && npx jest test/automated/unit/`
Expected: clean/green.

- [ ] **Step 3: Update spec status + push both branches**

Change the spec's `**Status:**` line to `Implemented on branch run-detail-provenance (both repos) — pending Joey's review/merge and backend deploy.` Then:

```bash
cd /home/joey/therun/therun && git push -u origin run-detail-provenance
cd /home/joey/therun/therun-fr && git add docs/ && git commit -m "docs: mark run-detail provenance spec implemented" && git push -u origin run-detail-provenance
```

Do NOT open PRs. Do NOT deploy the backend — migrations were applied to the dev DB only; production deploy is Joey's.

- [ ] **Step 4: Report**

Summarize for Joey: what shipped, the two branches, that the backend needs his deploy + prod migration, and the manual pass checklist (one run per origin path, a reassigned run, a manual time, board links, mod layer on/off).
