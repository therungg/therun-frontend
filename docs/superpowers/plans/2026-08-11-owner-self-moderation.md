# Owner Self-Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runner can remove (full wizard: remove / set time / select run), move (with re-verification), and hide their identity on their own games-v2 leaderboard runs.

**Architecture:** Backend grows the existing `/v1/me` self-service family (owner check = `run.userId === callerId`, ban check, trust tiers) — no "or owner" branches in mod auth. Frontend gives your own board row the mods' entry point: the run inspector drawer in a restricted owner mode, plus the same verbs on the run detail page. All owner actions land in the unified mod log with actor = the runner.

**Tech Stack:** Backend: AWS Lambda + Drizzle/Postgres (repo `/home/joey/therun/therun`). Frontend: Next.js 16 App Router (repo `/home/joey/therun/therun-fr`).

**Spec:** `docs/superpowers/specs/2026-08-11-owner-self-moderation-design.md`

## Global Constraints

- Backend branch: `owner-self-moderation` in `/home/joey/therun/therun`. Frontend branch: `owner-self-moderation` in `/home/joey/therun/therun-fr` (already exists, holds the spec commit). **Never push frontend main. Never open PRs.**
- **No new API Gateway resources** — the `api` CFN stack is at 499/500. Every new route MUST ride the existing `/v1/me` dispatch (`src/api/me/handler.ts`), which is already registered. Run `npm run cdk -- synth api` and confirm the template resource count is unchanged before any deploy.
- Backend push to main auto-deploys AND applies pending drizzle migrations — never run `cdk deploy` manually; sequence the migration with the code that needs it (they're on the same branch here, so one push).
- Mod-log redaction contract: runner identity goes ONLY under `data.subject`, never into `remark` (see `src/services/mod-log.ts:3-27`).
- Frontend: Biome formatting (4-space indent, single quotes, trailing commas); `npm run typecheck` and `npm run lint` are NOT clean on main (~356 pre-existing errors) — gate on a baseline diff, not exit 0.
- Games-v2 page is admin-gated (`page.tsx:35`); owner controls ship behind that gate. No work to lift it.
- Backend tests: `npm test` (unit) and the integration project run hermetically (local Docker Postgres, mocked AWS) — run them freely. Nothing that touches real AWS.

---

## Part 1 — Backend (repo `/home/joey/therun/therun`)

### Task B1: Migration — allow `origin = 'self'` on run_board_overrides

**Files:**
- Modify: `src/db/schema.ts:1867`
- Create: `drizzle/` migration via drizzle-kit

**Interfaces:**
- Produces: `run_board_overrides.origin` accepts `'self'`; Task B4 inserts it.

- [ ] **Step 1: Edit the check constraint in the schema**

At `src/db/schema.ts:1867` change:

```ts
check("run_board_overrides_origin_check", sql`${table.origin} IN ('mod')`),
```

to:

```ts
check("run_board_overrides_origin_check", sql`${table.origin} IN ('mod', 'self')`),
```

- [ ] **Step 2: Generate the migration**

Run the repo's drizzle generate script (see `package.json` scripts; the flow is documented in `therun/CLAUDE.md`). Inspect the generated SQL: it must DROP and re-ADD `run_board_overrides_origin_check` with the two-value list. If drizzle-kit fails to detect a check-constraint change, hand-write the migration SQL in a new `drizzle/00XX_*.sql` following the previous numbered file's header format:

```sql
ALTER TABLE "run_board_overrides" DROP CONSTRAINT "run_board_overrides_origin_check";
ALTER TABLE "run_board_overrides" ADD CONSTRAINT "run_board_overrides_origin_check" CHECK ("origin" IN ('mod', 'self'));
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(self-mod): allow origin='self' on run_board_overrides"
```

---

### Task B2: Mod-log vocabulary — canonical self_* actions

**Files:**
- Modify: `src/services/mod-log.ts:119-138` (MOD_LOG_ACTIONS)
- Modify: `src/api/me/run-verdict.ts:58-63, 85-90` (raw log inserts → buildModLogRow)
- Modify: `src/api/me/manual-time.ts:129-134, 161-166` (same)

**Interfaces:**
- Produces: `MOD_LOG_ACTIONS.selfRejectRun = "self_reject_run"`, `.selfUnrejectRun = "self_unreject_run"`, `.selfCreateManualTime = "self_create_manual_time"`, `.selfDeleteManualTime = "self_delete_manual_time"`, `.selfMoveRun = "self_move_run"`, `.selfAnonymizeApply = "self_anonymize_apply"`, `.selfAnonymizeLift = "self_anonymize_lift"`. Tasks B4/B5 and frontend Task F2 consume these exact strings.

- [ ] **Step 1: Add the seven self actions to MOD_LOG_ACTIONS**

Append inside the `MOD_LOG_ACTIONS` object in `src/services/mod-log.ts`:

```ts
    // Owner self-service verbs (actor = the runner; subject = the runner).
    // Same feed/history/public-log pipeline as mod verbs.
    selfRejectRun: "self_reject_run",
    selfUnrejectRun: "self_unreject_run",
    selfCreateManualTime: "self_create_manual_time",
    selfDeleteManualTime: "self_delete_manual_time",
    selfMoveRun: "self_move_run",
    selfAnonymizeApply: "self_anonymize_apply",
    selfAnonymizeLift: "self_anonymize_lift",
```

- [ ] **Step 2: Route the existing self log inserts through buildModLogRow**

In `src/api/me/run-verdict.ts`, replace the reject-path insert (lines 58-63) with:

```ts
        await db.insert(logs).values(
            buildModLogRow({
                actorUserId: callerId,
                action: MOD_LOG_ACTIONS.selfRejectRun,
                entity: "finished_run",
                target: runId,
                reason: reason ?? "self-reject",
                gameId: run.gameId,
                categoryId: run.categoryId,
                subject: { userId: callerId, username: run.runnerName ?? null },
            }),
        );
```

and the unreject-path insert (lines 85-90) with the same shape using `action: MOD_LOG_ACTIONS.selfUnrejectRun`, `reason: reason ?? "self-unreject"`, and `extra: { tier, newStatus }`. Add imports: `import { buildModLogRow, MOD_LOG_ACTIONS } from "../../services/mod-log";`

Same treatment in `src/api/me/manual-time.ts`: the create insert (lines 129-134) becomes `buildModLogRow({ actorUserId: c.callerId, action: MOD_LOG_ACTIONS.selfCreateManualTime, entity: "manual_time", target: row.id, reason: typeof body.reason === "string" ? body.reason : null, gameId: body.gameId, categoryId: body.categoryId, subject: { userId: c.callerId }, extra: { applied, timeMs: body.timeMs } })`; the delete insert (lines 161-166) becomes the equivalent with `MOD_LOG_ACTIONS.selfDeleteManualTime`, `reason: "self-delete"`, `subject: { userId: c.callerId }`.

- [ ] **Step 3: Typecheck and run unit tests**

Run: `npx tsc --noEmit && npm test`
Expected: no NEW type errors (baseline diff), unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/services/mod-log.ts src/api/me/run-verdict.ts src/api/me/manual-time.ts
git commit -m "feat(self-mod): canonical self_* actions in the unified mod log"
```

---

### Task B3: `GET /v1/me/eligible-runs?gameId=N`

**Files:**
- Create: `src/api/me/eligible-runs.ts`
- Modify: `src/api/me/handler.ts`

**Interfaces:**
- Consumes: `getUserEligibleRunsInGame({ gameId, userId })` from `src/leaderboards/mass-mgmt/get-user-eligible-runs.ts:33` (returns `UserEligibleRunRow[]` — same shape the mod route serves, so the frontend's existing `UserEligibleRunRow` type mirrors it already).
- Produces: `{ result: UserEligibleRunRow[] }` for the caller's own runs. Frontend Task F1 consumes.

- [ ] **Step 1: Write the handler**

Create `src/api/me/eligible-runs.ts`:

```ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { forbidden, ok, yourFault } from "../responses";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { getAuthenticatedUserFromEvent } from "../../session/getAuthenticatedUserFromEvent";
import { isBanned } from "../../rbac/self-service-trust";
import { getUserEligibleRunsInGame } from "../../leaderboards/mass-mgmt/get-user-eligible-runs";

// GET /v1/me/eligible-runs?gameId=N — the caller's own eligible runs in a
// game. Owner counterpart of the mod route
// /leaderboards/games/{gameId}/users/{userId}/eligible-runs; same row shape.
export const handleSelfEligibleRuns = async (event: APIGatewayProxyEvent) => {
    let authUser;
    try { authUser = await getAuthenticatedUserFromEvent(event); }
    catch { return forbidden("Not authenticated"); }

    const gameId = parseInt(event.queryStringParameters?.gameId ?? "", 10);
    if (Number.isNaN(gameId) || gameId <= 0) return yourFault("gameId: positive integer required");

    const db = await getDb();
    const [callerRow] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${authUser.user})`)
        .limit(1);
    if (!callerRow) return forbidden("user not found");

    if ((await isBanned(callerRow.id)).banned) return forbidden("banned");

    const rows = await getUserEligibleRunsInGame({ gameId, userId: callerRow.id });
    return ok(JSON.stringify({ result: rows }));
};
```

- [ ] **Step 2: Register in the me router**

In `src/api/me/handler.ts` add (before the notFound fallthrough):

```ts
    if (method === "GET" && /\/v1\/me\/eligible-runs\/?$/.test(path)) return handleSelfEligibleRuns(event);
```

with `import { handleSelfEligibleRuns } from "./eligible-runs";`

- [ ] **Step 3: Typecheck, commit**

Run: `npx tsc --noEmit`
```bash
git add src/api/me/eligible-runs.ts src/api/me/handler.ts
git commit -m "feat(self-mod): GET /v1/me/eligible-runs"
```

---

### Task B4: `POST /v1/me/runs/{runId}/move` — owner move with re-verification

**Files:**
- Modify: `src/leaderboards/mass-mgmt/board-override.ts` (option params on setBoardOverride)
- Create: `src/api/me/move-run.ts`
- Modify: `src/api/me/handler.ts`

**Interfaces:**
- Consumes: `setBoardOverride` (`board-override.ts:47`), `MOD_LOG_ACTIONS.selfMoveRun` (Task B2), `isBanned`.
- Produces: `SetBoardOverrideInput` gains optional `origin?: "mod" | "self"`, `demoteVerifiedToPending?: boolean`, `logAction?: string`. Endpoint body `{ categoryId: number, subcategoryKey: string, reason?: string }` → `{ result: { moved: true, reverify: boolean } }`. Frontend Task F1 consumes the endpoint.

- [ ] **Step 1: Extend setBoardOverride**

In `src/leaderboards/mass-mgmt/board-override.ts`, add to `SetBoardOverrideInput`:

```ts
    /** Who initiated the relocation. Defaults to "mod". */
    origin?: "mod" | "self";
    /** Owner-move policy: a verified run re-enters verification in the target. */
    demoteVerifiedToPending?: boolean;
    /** Mod-log action name; defaults to "board_override_set". */
    logAction?: string;
```

Inside the transaction in `setBoardOverride`:
1. Both the update and insert branches of the `runBoardOverrides` upsert set `origin: input.origin ?? "mod"` (add the field to the `.set({...})` and `.values({...})` objects; the insert currently hardcodes `origin: "mod"`).
2. Compute before calling `executeRunMove`:

```ts
        const demote =
            input.demoteVerifiedToPending === true &&
            run.verificationStatus === "verified";
```

3. Pass the demotion through the move so entry flags are computed for the pending state:

```ts
        await executeRunMove({
            db: tx,
            runId: input.runId,
            run: {
                userId: run.userId,
                runnerName: run.runnerName,
                gameId: run.gameId,
                time: run.time,
                gameTime: run.gameTime ?? null,
                verificationStatus: demote ? "pending" : run.verificationStatus,
            },
            oldCategoryId: currentCategoryId,
            oldSubcategoryKey: currentSubcategoryKey,
            newCategoryId: input.target.categoryId,
            newSubcategoryKey: input.target.subcategoryKey,
            extraFinishedRunUpdate: demote
                ? { verificationStatus: "pending", rejectionReason: null }
                : undefined,
        });
```

4. The mod-log insert uses `action: input.logAction ?? "board_override_set"`, and when `demote` add `extra: { ..., reverify: true }` and `after: { ...after, verificationStatus: "pending" }`.
5. Return `{ updated: true, reverify: demote }` — widen `BoardOverrideResult` to `{ updated: boolean; reverify?: boolean }`.

- [ ] **Step 2: Write the handler**

Create `src/api/me/move-run.ts`:

```ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { forbidden, notFound, ok, yourFault } from "../responses";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../../db";
import { finishedRuns, users } from "../../db/schema";
import { getAuthenticatedUserFromEvent } from "../../session/getAuthenticatedUserFromEvent";
import { isBanned } from "../../rbac/self-service-trust";
import {
    CategoryNotInGameError,
    RunNotFoundError,
    TargetNotChangedError,
    setBoardOverride,
} from "../../leaderboards/mass-mgmt/board-override";
import { MOD_LOG_ACTIONS } from "../../services/mod-log";

// POST /v1/me/runs/{runId}/move — move YOUR OWN run to another board in the
// same game. Policy (spec 2026-08-11): an owner-move always re-verifies — a
// verified run enters the target as pending; carrying verification over
// would let a runner verify on an easy board and self-move to a hard one.
export const handleSelfMoveRun = async (event: APIGatewayProxyEvent) => {
    const m = (event.path || "").match(/\/v1\/me\/runs\/(\d+)\/move\/?$/);
    if (!m) return notFound("not found");
    const runId = parseInt(m[1], 10);

    let authUser;
    try { authUser = await getAuthenticatedUserFromEvent(event); }
    catch { return forbidden("Not authenticated"); }

    let body: any;
    try { body = JSON.parse(event.body || "{}"); } catch { return yourFault("invalid JSON"); }
    if (typeof body.categoryId !== "number" || !Number.isInteger(body.categoryId) || body.categoryId <= 0) {
        return yourFault("categoryId: positive integer required");
    }
    if (typeof body.subcategoryKey !== "string") {
        return yourFault("subcategoryKey: string required");
    }

    const db = await getDb();
    const [callerRow] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${authUser.user})`)
        .limit(1);
    if (!callerRow) return forbidden("user not found");
    const callerId = callerRow.id;

    if ((await isBanned(callerId)).banned) return forbidden("banned");

    const [run] = await db.select().from(finishedRuns).where(eq(finishedRuns.id, runId)).limit(1);
    if (!run) return notFound("run not found");
    if (run.userId !== callerId) return forbidden("not your run");

    const reason =
        typeof body.reason === "string" && body.reason.trim().length > 0
            ? body.reason.trim().slice(0, 1000)
            : "Moved by the runner";

    try {
        const result = await setBoardOverride({
            gameId: run.gameId,
            runId,
            target: { categoryId: body.categoryId, subcategoryKey: body.subcategoryKey },
            callerId,
            reason,
            origin: "self",
            demoteVerifiedToPending: true,
            logAction: MOD_LOG_ACTIONS.selfMoveRun,
        });
        return ok(JSON.stringify({ result: { moved: true, reverify: result.reverify === true } }));
    } catch (e) {
        if (e instanceof TargetNotChangedError) return yourFault(e.message);
        if (e instanceof CategoryNotInGameError) return yourFault(e.message);
        if (e instanceof RunNotFoundError) return notFound(e.message);
        throw e;
    }
};
```

- [ ] **Step 3: Register in the me router**

In `src/api/me/handler.ts`:

```ts
    if (method === "POST" && /\/v1\/me\/runs\/\d+\/move\/?$/.test(path)) return handleSelfMoveRun(event);
```

(Place BEFORE the `/verdict` test — order doesn't collide, but keep run-scoped routes together.) Import `handleSelfMoveRun` from `./move-run`.

- [ ] **Step 4: Verify existing board-override callers still compile** (mod handler passes no new options — defaults preserve behavior). Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/leaderboards/mass-mgmt/board-override.ts src/api/me/move-run.ts src/api/me/handler.ts
git commit -m "feat(self-mod): POST /v1/me/runs/{runId}/move with forced re-verification"
```

---

### Task B5: Self hide-identity — `GET/POST/DELETE /v1/me/anonymize`

**Files:**
- Create: `src/api/me/anonymize.ts`
- Modify: `src/api/me/handler.ts`

**Interfaces:**
- Consumes: `createAnonymizeRule`, `liftAnonymizeRule`, `AnonymizeRuleRow` (`src/services/anonymize-service.ts:530, 687, 473`), `runAnonymizeInvalidation` (`src/services/anonymize-cache-invalidation.ts`), `MOD_LOG_ACTIONS` (Task B2).
- Produces:
  - `GET /v1/me/anonymize?gameId=N` → `{ result: { hidden: boolean, selfApplied: boolean, ruleId: number | null, displayName: string | null } }`
  - `POST /v1/me/anonymize` body `{ gameId }` → `{ result: { hidden: true, displayName: string, alreadyExists: boolean } }`
  - `DELETE /v1/me/anonymize` body `{ gameId }` → `{ result: { hidden: false } }` (403 if the active rule was mod-applied)
- Self-applied is detected as `rule.createdBy === rule.targetId` (no schema change — a mod can never create a rule where those match its target AND itself, because `createdBy` is the caller).

**Semantics (spec):** a user-scope rule `{ type: 'user', targetId: callerId, gameId, categoryId: null }` — the whole game, current and future runs. Lift is allowed only for self-applied rules; mod/admin rules stay admin-liftable only. Note the log actions: `createAnonymizeRule`/`liftAnonymizeRule` write `anonymize_apply`/`anonymize_lift` internally with the caller as actor — since caller = the runner here, actor is correct. Additionally write a `self_anonymize_apply`/`self_anonymize_lift` marker row? NO — one event, one row. Instead: the service functions already log; we accept `anonymize_apply` rows whose `actorUserId === subject.userId`, and Task F2's renderer labels that combination "by the runner". Do NOT double-log.

- [ ] **Step 1: Write the handler**

Create `src/api/me/anonymize.ts`:

```ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { forbidden, notFound, ok, yourFault } from "../responses";
import { and, eq, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { anonymizeRules, users } from "../../db/schema";
import { getAuthenticatedUserFromEvent } from "../../session/getAuthenticatedUserFromEvent";
import { isBanned } from "../../rbac/self-service-trust";
import {
    createAnonymizeRule,
    formatAnonName,
    liftAnonymizeRule,
} from "../../services/anonymize-service";
import { runAnonymizeInvalidation } from "../../services/anonymize-cache-invalidation";

const resolveCaller = async (event: APIGatewayProxyEvent) => {
    let authUser;
    try { authUser = await getAuthenticatedUserFromEvent(event); }
    catch { return { error: forbidden("Not authenticated") } as const; }
    const db = await getDb();
    const [row] = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${authUser.user})`)
        .limit(1);
    if (!row) return { error: forbidden("user not found") } as const;
    return { callerId: row.id, db } as const;
};

/** The caller's active game-scoped user rule, if any. */
const findActiveGameRule = async (db: any, callerId: number, gameId: number) => {
    const [rule] = await db
        .select()
        .from(anonymizeRules)
        .where(and(
            eq(anonymizeRules.type, "user"),
            eq(anonymizeRules.targetId, callerId),
            eq(anonymizeRules.gameId, gameId),
            isNull(anonymizeRules.categoryId),
            isNull(anonymizeRules.liftedAt),
        ))
        .limit(1);
    return rule ?? null;
};

// /v1/me/anonymize — the owner's board-level privacy toggle (spec
// 2026-08-11): "don't show who I am in this game", current AND future runs.
// One user-scope rule per game; self-applied rules (createdBy === targetId)
// can be lifted by the owner, mod-applied ones only by an admin.
export const handleSelfAnonymize = async (event: APIGatewayProxyEvent) => {
    const method = event.httpMethod;

    const c = await resolveCaller(event);
    if ("error" in c) return c.error;

    let gameId: number;
    if (method === "GET") {
        gameId = parseInt(event.queryStringParameters?.gameId ?? "", 10);
    } else {
        let body: any;
        try { body = JSON.parse(event.body || "{}"); } catch { return yourFault("invalid JSON"); }
        gameId = body.gameId;
    }
    if (typeof gameId !== "number" || Number.isNaN(gameId) || gameId <= 0) {
        return yourFault("gameId: positive integer required");
    }

    if (method === "GET") {
        const rule = await findActiveGameRule(c.db, c.callerId, gameId);
        return ok(JSON.stringify({
            result: {
                hidden: rule != null,
                selfApplied: rule != null && rule.createdBy === rule.targetId,
                ruleId: rule?.id ?? null,
                displayName: rule != null ? formatAnonName(rule.anonId) : null,
            },
        }));
    }

    if ((await isBanned(c.callerId)).banned) return forbidden("banned");

    if (method === "POST") {
        const result = await createAnonymizeRule({
            type: "user",
            targetId: c.callerId,
            gameId,
            categoryId: null,
            reason: "Hidden by the runner",
            callerId: c.callerId,
        });
        if (!result.alreadyExists) {
            // Derived caches bake identity — catch them up before returning
            // (Lambda freezes fire-and-forget promises).
            await runAnonymizeInvalidation(result.rule, "apply");
        }
        return ok(JSON.stringify({
            result: {
                hidden: true,
                displayName: result.rule.displayName,
                alreadyExists: result.alreadyExists,
            },
        }));
    }

    if (method === "DELETE") {
        const rule = await findActiveGameRule(c.db, c.callerId, gameId);
        if (!rule) return ok(JSON.stringify({ result: { hidden: false } }));
        if (rule.createdBy !== rule.targetId) {
            return forbidden("identity was hidden by a moderator — contact an admin to lift it");
        }
        const lifted = await liftAnonymizeRule({
            ruleId: rule.id,
            callerId: c.callerId,
            reason: "Unhidden by the runner",
        });
        await runAnonymizeInvalidation(lifted, "lift");
        return ok(JSON.stringify({ result: { hidden: false } }));
    }

    return notFound("not found");
};
```

Check `formatAnonName` is exported from anonymize-service (`:37` per the map); if not, export it. Check `runAnonymizeInvalidation`'s exact signature in `src/services/anonymize-cache-invalidation.ts` (the mod handler calls `runAnonymizeInvalidation(result.rule, "apply")` — mirror exactly, including the lift call shape used by the admin lift handler in `mod-mass-handler.ts` DELETE branch).

- [ ] **Step 2: Register in the me router**

```ts
    if (/\/v1\/me\/anonymize\/?$/.test(path)) return handleSelfAnonymize(event);
```

Import from `./anonymize`.

- [ ] **Step 3: Typecheck, commit**

```bash
git add src/api/me/anonymize.ts src/api/me/handler.ts
git commit -m "feat(self-mod): /v1/me/anonymize — owner hide-identity toggle"
```

---

### Task B6: Backend integration tests

**Files:**
- Create: `test/integration/self-moderation.test.ts`

**Interfaces:** Consumes handlers from B3/B4/B5 via the same invocation style the existing integration tests use.

- [ ] **Step 1: Study the harness** — read `test/integration/mod-mass-mark-and-board-override.test.ts` and `test/integration/anonymize.test.ts` for: db setup/teardown, how an authenticated `APIGatewayProxyEvent` is faked (session stub for `getAuthenticatedUserFromEvent`), and how runs/users/categories are seeded. Reuse those helpers verbatim.

- [ ] **Step 2: Write the tests.** Cover, with one `describe` per endpoint:

*eligible-runs:* (1) returns only the caller's runs for the game; (2) 403 unauthenticated; (3) 400 on missing gameId.

*move:* (4) owner moves own verified run → run's categoryId/subcategoryKey updated, `verificationStatus === 'pending'`, override row has `origin: 'self'`, log row `action === 'self_move_run'` with `data.subject.userId` = owner, response `reverify: true`; (5) pending run moves and stays pending (`reverify: false`); (6) 403 moving someone else's run; (7) 400 when target equals current board; (8) 400 when target category belongs to another game; (9) banned user → 403.

*anonymize:* (10) POST creates a user/game rule (`createdBy === targetId`), GET reports `hidden: true, selfApplied: true`; (11) POST twice → `alreadyExists: true`, single rule; (12) DELETE lifts the self rule, GET reports `hidden: false`; re-POST reuses the same anonId; (13) rule created by a DIFFERENT user (mod) on the caller → DELETE returns 403 and the rule stays active; (14) GET with no rule → `hidden: false, ruleId: null`.

- [ ] **Step 3: Run** the integration project per the repo's vitest config (`vitest.config.ts` — integration project name; requires local Docker per `therun/CLAUDE.md`). Expected: all new tests pass, no existing test breaks.

- [ ] **Step 4: Commit**

```bash
git add test/integration/self-moderation.test.ts
git commit -m "test(self-mod): integration coverage for /v1/me self-moderation"
```

---

### Task B7: Contract artifact + ship

**Files:**
- Create: `docs/frontend-guide-self-moderation.md` (backend repo; copy to `therun-fr/docs/`)

- [ ] **Step 1: Write the guide** — routes, bodies, response shapes exactly as built (B3/B4/B5), the self-applied lift rule, the re-verify semantics, and the note that self actions appear in the unified mod log with actor = runner. Copy the file into `therun-fr/docs/`.

- [ ] **Step 2: Gateway sanity** — `npm run cdk -- synth api`; confirm resource count unchanged vs main (no new Resources in `cdk.out/api.template.json` diff).

- [ ] **Step 3: STOP — coordinate with Joey before merging to backend main.** Push of main auto-deploys and applies the B1 migration. When Joey approves: merge branch → push main → run `/home/joey/therun/.claude/monitoring/check-health.sh 15` immediately and at ~5/~10/~15 min (per root CLAUDE.md, incl. PushNotification duty on errors).

---

## Part 2 — Frontend (repo `/home/joey/therun/therun-fr`, branch `owner-self-moderation`)

### Task F1: Types, fetchers, server actions

**Files:**
- Modify: `types/moderation.types.ts`
- Modify: `src/lib/moderation/self-service.ts`
- Modify: `src/actions/run-user-actions.action.ts`

**Interfaces (produced — later tasks import these exact names):**
- Types: `SelfMoveRunResult = { moved: boolean; reverify: boolean }`, `SelfAnonymizeState = { hidden: boolean; selfApplied: boolean; ruleId: number | null; displayName: string | null }`, `SelfAnonymizeApplyResult = { hidden: true; displayName: string; alreadyExists: boolean }`.
- Fetchers (self-service.ts): `selfEligibleRuns(sessionId, gameId): Promise<UserEligibleRunRow[]>`, `selfMoveRun(sessionId, runId, input: { categoryId: number; subcategoryKey: string }): Promise<SelfMoveRunResult>`, `selfAnonymizeState(sessionId, gameId): Promise<SelfAnonymizeState>`, `selfAnonymizeApply(sessionId, gameId): Promise<SelfAnonymizeApplyResult>`, `selfAnonymizeLift(sessionId, gameId): Promise<{ hidden: false }>`.
- Server actions (run-user-actions.action.ts), all returning the file's `Result<T>` union: `loadSelfEligibleRunsAction(gameId): Result<{ rows: UserEligibleRunRow[] }>`, `selfMoveRunAction(runId, target: { categoryId: number; subcategoryKey: string }): Result<{ reverify: boolean }>`, `selfAnonymizeStateAction(gameId): Result<{ state: SelfAnonymizeState }>`, `selfAnonymizeApplyAction(gameId): Result<{ displayName: string }>`, `selfAnonymizeLiftAction(gameId): Result`.

- [ ] **Step 1: Add the three types** to `types/moderation.types.ts` next to the existing `Self*` types (`UserEligibleRunRow` already exists there).

- [ ] **Step 2: Add the five fetchers** to `src/lib/moderation/self-service.ts`, each a thin `meFetch` call matching the existing three (GET calls pass no method/body; move is `meFetch(`/v1/me/runs/${runId}/move`, { sessionId, method: 'POST', body: input })`; anonymize apply/lift are POST/DELETE to `/v1/me/anonymize` with `body: { gameId }`; state is `meFetch(`/v1/me/anonymize?gameId=${gameId}`, { sessionId })`).

- [ ] **Step 3: Add the five server actions** to `src/actions/run-user-actions.action.ts`, following `selfRunVerdictAction`'s exact pattern (session guard → fetcher → `revalidateRunDetails([runId])` for run-scoped mutations → `toError`). `selfMoveRunAction` and the anonymize mutations must also revalidate the board: import and call the same board revalidation helper the mod actions use after `moveRunAction` (see `revalidate-boards.ts` usage in `board-override.action.ts`) — mirror it, passing the gameSlug/categoryIds the caller provides. If that helper needs a gameSlug, add it as an action parameter (`selfMoveRunAction(gameSlug, runId, target)` — adjust the interface above accordingly and keep it consistent everywhere).

- [ ] **Step 4: Typecheck** (`npm run typecheck` — baseline diff only), **commit**:

```bash
git add types/moderation.types.ts src/lib/moderation/self-service.ts src/actions/run-user-actions.action.ts
git commit -m "feat(self-mod): types, fetchers, server actions for owner self-moderation"
```

---

### Task F2: Mod-log renderer labels for self verbs

**Files:**
- Modify: `src/lib/moderation/describe-log-action.ts`
- Test: `src/lib/moderation/__tests__/` (add to the existing describe-log-action test if present; else create one following a neighboring test's shape)

- [ ] **Step 1: Write the failing test** — `describeLogAction('self_reject_run')` (use the file's exported function name; check it) returns label `'Hidden by runner'`; same for the six others below; unknown strings still fall through to the generic label.

- [ ] **Step 2: Add to ACTION_LABELS:**

```ts
    // Owner self-service verbs — actor is the runner themself.
    self_reject_run: { label: 'Hidden by runner', severity: 'mute' },
    self_unreject_run: { label: 'Restored by runner', severity: 'ok' },
    self_create_manual_time: { label: 'Time set by runner', severity: 'mute' },
    self_delete_manual_time: { label: 'Time removed by runner', severity: 'mute' },
    self_move_run: { label: 'Moved by runner', severity: 'mute' },
    self_anonymize_apply: { label: 'Identity hidden', severity: 'mute' },
    self_anonymize_lift: { label: 'Identity restored', severity: 'ok' },
```

(The last two are reached only if the backend ever splits self-anonymize actions; today self-anonymize logs `anonymize_apply`/`anonymize_lift` with actor = subject, which the existing labels already cover. Keeping the entries costs nothing and future-proofs the deny-list feed.)

- [ ] **Step 3: Run the test, commit**

```bash
npx vitest run src/lib/moderation
git add -A && git commit -m "feat(self-mod): log labels for self-service verbs"
```

---

### Task F3: Owner remove wizard — `OwnerRemoveForm`

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/shared/owner-remove-form.tsx`
- Test: `app/(new-layout)/games-v2/[game]/shared/owner-remove-form.test.tsx`

**Interfaces:**
- Consumes: `loadSelfEligibleRunsAction`, `selfRunVerdictAction` (existing), `selfCreateManualTime` via a small new server action below, `UserEligibleRunRow`.
- Produces:

```ts
export interface OwnerRemoveFormProps {
    gameId: number;
    runId: number;
    /** Board identity — filters eligible runs to this board and orders them. */
    categoryId: number;
    subcategoryKey: string;
    primaryTiming: 'rt' | 'gt';
    /** This entry's board time (ms) — decides which other runs are "faster". */
    runTimeMs: number | null;
    onDone: () => void;
    onClose: () => void;
}
export function OwnerRemoveForm(props: OwnerRemoveFormProps): JSX.Element;
```

**Design (mirrors the mod wizard's Decide→Confirm, owner-sized):** no reason picker, no notify toggle, no runner-vs-run scope (removing "yourself from the board" IS the select-run/remove choice). Decide step options:
1. **Just remove this run** — self-reject `runId`.
2. **Another run of mine stands instead** — pick from your other runs on this board (`loadSelfEligibleRunsAction(gameId)` filtered to `categoryId + subcategoryKey`, excluding `runId`, ordered by the board's primary clock). Cascade: every listed run FASTER than the chosen one (and the current `runId`) is self-rejected too — the confirm step lists them exactly like the mod wizard's `fasterThanLegit` cascade.
3. **Set a time instead** — a manual time via `selfCreateManualTime`; reuse the time/date input markup from `manage/moderation/shared/run-action-parts.tsx` if it exports the field components, else replicate the mod wizard's `replaceTimeText`/`replaceDateText` parsing (see `run-action-dialog.tsx:233-235` and its parse helpers).

Confirm step: summary sentence + list of runs being hidden; primary button "Remove my run"; on success `toast.success` with the applied/provisional distinction (any `applied === 'provisional'` in the batch → "Submitted for moderator review."), then `onDone()`.

Mutations run sequentially (self-reject each cascade run, then the manual time if chosen); first error aborts and surfaces inline (dialog stays open, matching `self-run-verdict.tsx`'s convention).

- [ ] **Step 1: Write failing tests** covering: (a) with no other runs on the board, the Decide step offers only options 1 and 3; (b) choosing a slower run as "stands instead" produces a cascade listing only the current run; (c) choosing option 2 with a faster run present lists both the current run and the faster run in the confirm summary; (d) confirm calls `selfRunVerdictAction` once per cascade run. Mock the server actions module. Follow `run-action-dialog.test.tsx`'s setup (same test utils/renderer — note the repo's vitest globals convention).

- [ ] **Step 2: Run tests, verify they fail** (`npx vitest run "app/(new-layout)/games-v2"` — expected: FAIL, component missing).

- [ ] **Step 3: Implement `OwnerRemoveForm`** per the design block above. Visuals: reuse the wizard's SCSS module classes via `run-action-parts.tsx` where exported; otherwise the standard `BoardDialog` + `btn btn-sm` patterns used in `self-run-verdict.tsx`.

- [ ] **Step 4: Run tests to green.**

- [ ] **Step 5: Commit**

```bash
git add "app/(new-layout)/games-v2/[game]/shared/owner-remove-form."* 
git commit -m "feat(self-mod): owner remove wizard (remove / select run / set time)"
```

---

### Task F4: Move dialog owner mode

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/boards/move-dialog.tsx`

**Interfaces:**
- Produces: `MoveDialogProps` gains `ownerMode?: boolean` and `onSubmitOwner?: (target: { categoryId: number; subcategoryKey: string }) => Promise<{ ok: true; reverify: boolean } | { error: string }>`.

- [ ] **Step 1: Add the props.** When `ownerMode`: (a) the reason textarea is not rendered and `reasonOk` is not part of the submit-disabled condition; (b) submit calls `onSubmitOwner(target)` instead of `moveRunAction`; (c) a standing notice renders above the footer: *"Moving your run takes it off this board and submits it for verification on the new one — it will not carry its verified status over."*; (d) on success with `reverify: true`, `toast.success('Run moved — awaiting verification on its new board.')`, else `toast.success('Run moved.')`. Mod path (no flag) is byte-for-byte unchanged — verify by reading the diff.

- [ ] **Step 2: Typecheck + existing tests** (`npx vitest run "app/(new-layout)/games-v2"`), **commit**: `feat(self-mod): MoveDialog owner mode`.

---

### Task F5: Owner hide-identity dialog

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/shared/owner-hide-identity-dialog.tsx`

**Interfaces:**
- Consumes: `selfAnonymizeStateAction`, `selfAnonymizeApplyAction`, `selfAnonymizeLiftAction` (F1).
- Produces:

```ts
export function OwnerHideIdentityDialog(props: {
    open: boolean;
    onClose: () => void;
    onDone: () => void;
    gameId: number;
    gameDisplay: string;
}): JSX.Element;
```

- [ ] **Step 1: Implement.** On open, load state via `selfAnonymizeStateAction(gameId)`. Three renderings:
  - **Not hidden:** copy — *"Hide who you are across {gameDisplay}. Every run you have here — and any you add later — shows as a stable placeholder instead of your name. Your times, ranks and history stay. You can unhide yourself at any time; re-hiding uses the same placeholder number."* Primary button "Hide my identity" → `selfAnonymizeApplyAction` → success toast with the returned `displayName`.
  - **Hidden, selfApplied:** *"You're shown here as {displayName}."* Button "Unhide" → `selfAnonymizeLiftAction`.
  - **Hidden, not selfApplied:** *"A moderator hid your identity here. Only a site admin can lift it."* — no action button.
  No reason field anywhere. Errors inline, `BoardDialog` chrome, same pending/confirm conventions as `self-run-verdict.tsx`.

- [ ] **Step 2: Typecheck, commit**: `feat(self-mod): owner hide-identity dialog`.

---

### Task F6: Board entry point — own row + inspector owner mode + hidden-state affordance

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/run-inspector.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-row.tsx:493-503`
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx` (props threading)
- Modify: `app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-pager.tsx:346-368, 498-501`
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx:213` (+ `page.tsx`/`data.ts` if gameId isn't already threaded — `GamePageData` has the game; check `types.ts`)

- [ ] **Step 1: RunInspector owner mode.** Add prop `mode?: 'mod' | 'owner'` (default `'mod'`) and `gameId: number` to `Props` (`run-inspector.tsx:59`). In owner mode:
  - Verb bar (`:915-945`): replace `verbsForStatus` output with: status `'rejected'` → a single **Restore my run** button wired to the existing `useSelfRunVerdict` hook (`shared/self-run-verdict.tsx`); otherwise a single **Remove my run…** button that expands `OwnerRemoveForm` (F3) in the `verbForm` slot instead of `RunActionForm`.
  - Secondary bar (`:946-970`): **Move…** and **Hide identity…** only (no "Adjust time…").
  - Move… opens `MoveDialog` with `ownerMode` + `onSubmitOwner: (target) => selfMoveRunAction(gameSlug, runId, target)` (adapt to F1's final signature). Board context for the category picker: `openModDialog` currently calls `loadModBoardContextAction` (`:457-485`), which 403s for non-mods. Add a parallel `loadOwnerBoardContextAction` in `leaderboard/actions/` that is `loadModBoardContextAction` minus the `canModerateGame` check (categories + variables are board-picker data, not privileged; `listCategoryVariables` rides the public variables route — verify by calling it as a non-mod in dev; if it 403s, take categories/variables from props instead: the pager already holds the board's category/variable data — thread it in). Owner mode calls the owner loader.
  - Hide identity… opens `OwnerHideIdentityDialog` (F5) with `gameId`/`gameDisplay` — NOT the mod `HideIdentityDialog`.
  - Timeline undo buttons (`TimelineUndoButton`) render only in mod mode (they call mod actions).
  - Quick keyboard verbs and `onPrev/onNext` stepping stay.

- [ ] **Step 2: Row + table + pager.** In `leaderboard-row.tsx`, alongside the `canManage` Moderate button (`:493-503`), add:

```tsx
                    {!canManage && isCurrentUser && onModerate && (
                        <button
                            type="button"
                            className={styles.moderateBtn}
                            onClick={() => onModerate(entry)}
                            title="Manage your entry"
                        >
                            Manage
                        </button>
                    )}
```

(`isCurrentUser` already exists in the row — see `leaderboard-table.tsx:249` threading.) In `leaderboard-pager.tsx`, `onModerate`/`RunInspector` currently gate on `canManage` (`:498-501`): widen to also fire when the inspected entry is the session user's own row (`isSameRunner(sessionUsername, entry.runnerName)`), passing `mode="owner"` in that case (mods keep `mode="mod"` even on their own runs — the mod surface is a superset). Entries with `entry.runId == null` (pure manual times) keep the mod-only gate: the owner path for set times is delete-via-remove-wizard only if `manualTimeId` maps to a self manual time — out of scope; hide the Manage button for `entry.runId == null`.

- [ ] **Step 3: Hidden-state affordance.** After self-hide, the owner's row is a placeholder — `isSameRunner` fails and the entry point disappears, so the unhide path must not live on the row. In the pager's header area (next to the find-me control, `:346-368`): when a session exists, the board page loads `selfAnonymizeStateAction(gameId)` (server-side in `data.ts`, threaded as `selfHidden: { hidden: boolean; selfApplied: boolean; displayName: string | null } | null` on `GamePageData`); when `hidden`, render a muted inline note — *"You're shown on this board as {displayName}"* — with an **Unhide…** button (self-applied only) opening `OwnerHideIdentityDialog`.

- [ ] **Step 4: Tests + typecheck.** Extend the pager/row test files if they exist (search for `leaderboard-row.test`/`leaderboard-pager.test`); at minimum add a row test: own row without `canManage` renders Manage; foreign row renders nothing. `npm run typecheck` baseline diff.

- [ ] **Step 5: Commit**: `feat(self-mod): own-row Manage entry, inspector owner mode, unhide affordance`.

---

### Task F7: Run detail page — Move + Hide identity + full remove

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/run-view/run-actions.tsx`

- [ ] **Step 1:** For `isOwnRun`, add two buttons after "Correct this time…": **Move my run…** and **Hide my identity…**, opening `MoveDialog` (ownerMode, needs the owner board context loader from F6 for the category picker — reuse `loadOwnerBoardContextAction`) and `OwnerHideIdentityDialog`. `RunViewModel` must expose `gameId` and the run's `categoryId`/`subcategoryKey` — check `run-view.tsx`; thread them if absent. Replace the bare "Hide my run" confirm with the same button it is today (keep it — it's the quick path) — the full `OwnerRemoveForm` wizard is the board drawer's job; do NOT duplicate it here (YAGNI: the run page links to the board).

- [ ] **Step 2: Typecheck, commit**: `feat(self-mod): move + hide identity on the run page`.

---

### Task F8: Final verification pass

- [ ] **Step 1:** `npm run typecheck` and `npm run lint` — diff against main's baseline (`git stash`-free method: run on main first, save counts, compare). No new errors.
- [ ] **Step 2:** `npx vitest run "app/(new-layout)/games-v2" src/lib/moderation` — all green.
- [ ] **Step 3:** If a dev server was started at any point for manual checks, kill it (match exact pid). `rm -rf .next` only with no server running.
- [ ] **Step 4:** Push the branch (`git push -u origin owner-self-moderation`). NO PR — Joey opens PRs. Report: browser pass is outstanding and Joey's to do (needs an admin session; games-v2 is admin-gated).

---

## Execution order & cross-repo sequencing

1. Tasks B1→B7 first (backend branch). B7 ends at a STOP: Joey approves the backend merge+deploy (migration rides it).
2. Frontend F1→F8 can be built against the contract immediately after B7's guide doc exists (fetchers hit the deployed backend only at runtime), but **do not merge frontend main before the backend is deployed** — the new `/v1/me` routes 404 until then.
3. Subagents: scope each task's agent to ONE repo; hand frontend agents the guide doc + type mirrors, not backend source (root CLAUDE.md convention).

## Self-review notes (already applied)

- Spec's "set time creates a self manual-time" → F3 option 3; "select run promotes another run" → F3 option 2 cascade; both reuse existing backend endpoints — only eligible-runs needed adding (B3).
- Spec's `extra.selfApplied` flag → replaced by the `createdBy === targetId` invariant (no migration; a mod-created rule can never satisfy it).
- Spec's "self_anonymize_apply/lift log actions" → single-log decision in B5: service-level `anonymize_apply/lift` rows with actor = subject; F2 keeps the self labels as dead-letter entries for the deny-list feed. The mod-log still shows the event with the runner as actor — the spec's observable requirement.
- Spec's re-verify → B4 `demoteVerifiedToPending` + F4 notice copy.
- Move mechanism: games-v2 mods move runs via board-override (`MoveDialog` → `PUT …/board-override`), NOT the legacy `POST /leaderboards/runs/{id}/move` — the self endpoint mirrors board-override semantics (override row with `origin: 'self'`, original placement preserved, mods/admins can still clear it).
