# Board Claims Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the backend contract in `docs/frontend-guide-board-claims-and-setup.md` (board claims, per-game moderators list, game metadata + configured flag, session `adminedGames`/`moderatedGames`) in the backend repo `/home/joey/therun/therun` so the already-shipped frontend surfaces go live.

**Architecture:** Extend the existing (frontend-unconsumed) `moderator_requests` flow rather than a parallel table — new columns for deny reason + granted role, a contract-shaped `/v1/board-claims` API over it, DB-level one-open-request guarantee, notifications via `emitNotification`. Session enrichment derives `moderatedGames`/`adminedGames` from `role_assignments` (today they never feed the session — the frontend's core assumption is currently false). Metadata columns extend `games_pg` + `pageData.game`. Approvals reuse `assignRole` (Redis role-cache invalidation + audit + pageData rebuild), not `reviewModRequest`'s direct insert.

**Tech Stack:** AWS Lambda handlers (prefix dispatch in `src/api/api-entry.ts`), Drizzle ORM + PostgreSQL, drizzle-kit migrations, jest (ts-jest) with `test/automated/unit` (pure) vs `test/manual/integration` (live DB).

## Global Constraints

- **Repos/branches:** backend work in `/home/joey/therun/therun` on branch `game-setup-wizard` created FROM `profile-leaderboard-pbs` (@ 79a3d7d). One frontend task runs in `/home/joey/therun/therun-fr` on the existing `game-setup-wizard` branch. Never create PRs; push branches only (final task).
- **Migrations:** `npm run generate-migration` ONLY — NEVER `npm run migrate` (Joey applies at deploy; dev-DB creds are stale). Commit the generated `drizzle/0NNN_*.sql` + `drizzle/meta/0NNN_snapshot.json` + `drizzle/meta/_journal.json` together. Current head is `0070_gray_dust.sql`; the new one will be `0071_*`.
- **Tests:** run `test/automated/unit` suites only (pure, no DB). NEVER run `test/manual/integration` — they need a deployed env + migrated DB (and the test DB lacks migrations ≥0070). New integration tests are committed unrun, for Joey.
- **Typecheck gate:** `npx tsc --noEmit` has pre-existing errors inside `node_modules` (TS ~4.6.4 vs drizzle 0.39). Gate = no NEW errors outside `node_modules`: `npx tsc --noEmit 2>&1 | grep -v node_modules` must show nothing new vs before your change.
- **Response envelope:** success = `ok(JSON.stringify({ result: ... }))`; errors via `src/api/responses.ts` helpers (`yourFault` 400, `forbidden` 403, `notFound` 404, `methodNotAllowed` 405). No 409 helper exists — define a local `conflict` (copy the pattern from `src/api/me/submission.ts:27-34`). Handlers wrap in try/catch mapping `ValidationError` → `yourFault` (see `src/api/roles/handler.ts:283`).
- **Auth pattern:** public GET arms run BEFORE `getAuthenticatedUserFromEvent(event)`; authed arms resolve the Postgres user id from the Twitch username via the handler's existing `getUserPgId`/`resolveCaller` helper.
- **Status mapping:** DB keeps `moderator_requests.status` values `pending|approved|rejected`; the `/v1/board-claims` API maps `rejected` → `denied` (the frontend's `BoardClaimStatus`). Never write `denied` to the DB.
- **Game key format:** the frontend's CASL `{game}` conditions and `canModerateGame` match against `games_pg.name` (the normalized name, same value `/v1/games/by-slug` returns as `name`). `moderatedGames`/`adminedGames` entries MUST be `games_pg.name` values.
- **Commits:** no co-author line. Do not add Claude as co-author.
- The reference for every payload shape is `/home/joey/therun/therun-fr/docs/frontend-guide-board-claims-and-setup.md` — read it before each task.

---

### Task 1: Branch + schema + migration 0071

**Files:**
- Modify: `/home/joey/therun/therun/src/db/schema.ts` (games table ~line 27; moderatorRequests table ~line 1401)
- Create (generated): `drizzle/0071_*.sql`, `drizzle/meta/0071_snapshot.json`, `drizzle/meta/_journal.json` update

**Interfaces:**
- Produces: `games_pg` columns `cover_url`, `platforms` (jsonb string[], default `[]`), `release_year`, `discord_url`, `configured` (boolean default false not null); `moderator_requests` columns `deny_reason`, `granted_role`; partial unique index enforcing one pending request per (user, game).

- [ ] **Step 1: Create the branch**

```bash
cd /home/joey/therun/therun && git checkout profile-leaderboard-pbs && git checkout -b game-setup-wizard
```

- [ ] **Step 2: Extend the games table**

In `src/db/schema.ts`, add to the `games` pgTable column object (after `abbreviation`):

```typescript
    coverUrl: text("cover_url"),
    platforms: jsonb().$type<string[]>().default(sql`'[]'::jsonb`),
    releaseYear: integer("release_year"),
    discordUrl: text("discord_url"),
    configured: boolean().default(false).notNull(),
```

(`jsonb`, `sql`, `integer`, `boolean`, `text` are already imported in schema.ts — verify and reuse.)

- [ ] **Step 3: Extend moderator_requests**

Add to the `moderatorRequests` column object (after `status`):

```typescript
        denyReason: text("deny_reason"),
        grantedRole: text("granted_role"),
```

Add to its index array a partial unique index (one open request per user+game — DB-level guarantee behind the API's 409):

```typescript
        uniqueIndex("moderator_requests_open_unique")
            .on(table.userId, table.gameId)
            .where(sql`status = 'pending'`),
```

(`uniqueIndex` import: check existing imports; other tables use it.)

- [ ] **Step 4: Generate the migration (do NOT migrate)**

```bash
cd /home/joey/therun/therun && npm run generate-migration
```

Expected: new `drizzle/0071_*.sql` containing the five games columns, two moderator_requests columns, and the partial unique index. Read the SQL and confirm it contains ONLY these changes (no drift from unrelated schema state; if drift appears, stop and report BLOCKED).

- [ ] **Step 5: Typecheck gate + commit**

```bash
cd /home/joey/therun/therun && npx tsc --noEmit 2>&1 | grep -v node_modules | head
```
Expected: same (empty or pre-existing-only) as before the change.

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(claims): schema for board claims, game metadata, configured flag"
```

---

### Task 2: Session enrichment — moderatedGames + adminedGames from role_assignments (TDD)

Role assignments currently never feed the session: `src/session/get-session.ts:77-96` enriches `user.roles` from legacy `getUserRoles` only, and `user.moderatedGames` is always `[]` (`src/repositories/users.ts:87,113`). This task closes the gap the whole feature depends on.

**Files:**
- Create: `/home/joey/therun/therun/src/services/game-roles-for-user.ts`
- Test: `/home/joey/therun/therun/test/automated/unit/rbac/derive-game-lists.test.ts`
- Modify: `src/repositories/users.ts` (User interface), `src/session/get-session.ts`

**Interfaces:**
- Produces: `deriveGameLists(rows: { role: string; gameName: string | null }[]): { moderatedGames: string[]; adminedGames: string[] }` (pure); `getGameRoleRowsForUser(username: string): Promise<{ role: string; gameName: string | null }[]>`; `User.adminedGames?: string[]`.
- Semantics: `moderatedGames` = distinct game names where role ∈ {game-admin, game-mod, game-verifier}; `adminedGames` = distinct game names where role = game-admin. Null gameName rows ignored.

- [ ] **Step 1: Write the failing test**

```typescript
// test/automated/unit/rbac/derive-game-lists.test.ts
import { deriveGameLists } from "../../../../src/services/game-roles-for-user";

describe("deriveGameLists", () => {
    it("collects moderated and admined games by role tier", () => {
        const out = deriveGameLists([
            { role: "game-admin", gameName: "supermario64" },
            { role: "game-mod", gameName: "halo" },
            { role: "game-verifier", gameName: "quake" },
        ]);
        expect(out.moderatedGames.sort()).toEqual([
            "halo",
            "quake",
            "supermario64",
        ]);
        expect(out.adminedGames).toEqual(["supermario64"]);
    });

    it("dedupes and ignores null gameName and non-game roles", () => {
        const out = deriveGameLists([
            { role: "game-admin", gameName: "supermario64" },
            { role: "game-mod", gameName: "supermario64" },
            { role: "global-admin", gameName: null },
            { role: "series-admin", gameName: "halo" },
        ]);
        expect(out.moderatedGames).toEqual(["supermario64"]);
        expect(out.adminedGames).toEqual(["supermario64"]);
    });

    it("returns empty lists for no rows", () => {
        expect(deriveGameLists([])).toEqual({
            moderatedGames: [],
            adminedGames: [],
        });
    });
});
```

- [ ] **Step 2: Run it, confirm it fails** (module not found)

```bash
cd /home/joey/therun/therun && npx jest test/automated/unit/rbac/derive-game-lists.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/services/game-roles-for-user.ts
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { games, roleAssignments, users } from "../db/schema";

const MODERATING_ROLES = ["game-admin", "game-mod", "game-verifier"];

export function deriveGameLists(
    rows: { role: string; gameName: string | null }[],
): { moderatedGames: string[]; adminedGames: string[] } {
    const moderated = new Set<string>();
    const admined = new Set<string>();
    for (const row of rows) {
        if (!row.gameName) continue;
        if (MODERATING_ROLES.includes(row.role)) moderated.add(row.gameName);
        if (row.role === "game-admin") admined.add(row.gameName);
    }
    return {
        moderatedGames: [...moderated],
        adminedGames: [...admined],
    };
}

export async function getGameRoleRowsForUser(
    username: string,
): Promise<{ role: string; gameName: string | null }[]> {
    const db = await getDb();
    return db
        .select({ role: roleAssignments.role, gameName: games.name })
        .from(roleAssignments)
        .innerJoin(users, eq(roleAssignments.userId, users.id))
        .innerJoin(games, eq(roleAssignments.gameId, games.id))
        .where(
            and(
                sql`lower(${users.username}) = lower(${username})`,
                isNotNull(roleAssignments.gameId),
            ),
        );
}
```

(Adapt the drizzle join/where idiom to the file's neighbors if the exact operators differ — `resolveCaller` in `src/api/me/submission.ts` shows the `lower(username)` comparison pattern.)

- [ ] **Step 4: Run test, confirm 3/3 pass**

- [ ] **Step 5: Wire into the session**

`src/repositories/users.ts`: add `adminedGames?: string[];` to the `User` interface next to `moderatedGames`.

`src/session/get-session.ts`: import `deriveGameLists, getGameRoleRowsForUser`. Add a fifth entry to the existing `promises` array: `getGameRoleRowsForUser(username).catch((e) => { console.error("Failed to load game roles:", e); return []; })`. Destructure it (`gameRoleRows`) alongside `[user, roles]` (mind the tuple typing — extend the `as` cast). After `user.roles?.push(...)`:

```typescript
  const gameLists = deriveGameLists(gameRoleRows as { role: string; gameName: string | null }[]);
  user.moderatedGames = [
    ...new Set([...(user.moderatedGames ?? []), ...gameLists.moderatedGames]),
  ];
  user.adminedGames = gameLists.adminedGames;
```

The `.catch → []` matters: a Postgres blip must not kill session lookup (the rest of `promises` follows the same defensive convention).

- [ ] **Step 6: Typecheck gate + commit**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head
git add src/services/game-roles-for-user.ts src/repositories/users.ts src/session/get-session.ts test/automated/unit/rbac/derive-game-lists.test.ts
git commit -m "feat(session): derive moderatedGames/adminedGames from role_assignments"
```

---

### Task 3: Board-claims service (TDD for mapping/validation)

**Files:**
- Create: `/home/joey/therun/therun/src/leaderboards/claims/claim-mapping.ts` (pure)
- Test: `/home/joey/therun/therun/test/automated/unit/claims/claim-mapping.test.ts`
- Create: `/home/joey/therun/therun/src/services/board-claims-service.ts`

**Interfaces:**
- Pure module produces: `validateMotivation(raw: unknown): { ok: true; motivation: string } | { ok: false; message: string }` (string, trimmed, 10–2000 chars); `validateClaimRole(raw: unknown): raw is "game-admin" | "game-mod"`; `toClaimStatus(dbStatus: string): "pending" | "approved" | "denied"` (`rejected` → `denied`, passthrough otherwise); `mapClaimRow(row, signals, board): BoardClaimResponse` building the contract JSON shape (`gameSlug` = `games_pg.name`).
- Service produces: `submitBoardClaim({ userId, gameId, motivation })` → `{ id }`, throws `ConflictError` (exported class) on an existing pending row and reuses `submitModRequest`'s restriction + 30-day-rejection checks; `getMyBoardClaim({ userId, gameId })` → mapped row or null (most recent); `listBoardClaims({ gameId? })` → mapped rows with signals + board activity — when `gameId` is omitted (global queue) EXCLUDE games that already have any `role_assignments` row with role ∈ (game-admin, game-mod) (contract: join-team requests never reach the global queue); `approveBoardClaim({ requestId, role, reviewerUserId })` → validates pending, calls the existing `assignRole` service from `src/services/role-mgmt-service.ts` (NOT a direct insert — assignRole invalidates the Redis `role:{userId}:*` cache, writes audit, queues pageData rebuild), updates the row (`status='approved'`, `reviewedBy`, `reviewedAt`, `grantedRole`), then `emitNotification(request.userId, "board_claim_approved", { gameId, gameSlug, gameDisplay, role })`; `denyBoardClaim({ requestId, reviewerUserId, reason? })` → `status='rejected'`, `denyReason`, notification `"board_claim_denied"` with `{ gameId, gameSlug, gameDisplay, reason }`.
- Signals queries (per listed row): `runsOnGame` = `count(*)` from `finished_runs` where `userId`+`gameId`, `excluded = false`, `verificationStatus != 'rejected'`; `totalRuns` = same without gameId; `accountCreatedAt` = `users.createdAt`; `priorApprovals`/`priorDenials` = counts of that user's `moderator_requests` with status `approved`/`rejected`. Board activity: `game_stats.uniqueRunners` and `game_stats.totalFinishedAttemptCount` (as `totalFinishedRuns`), defaulting 0 when no row.

- [ ] **Step 1: Write failing unit tests for the pure module** — cover: motivation trim + bounds (9 chars fails, 10 passes, 2001 fails, non-string fails); role guard accepts exactly the two values; `toClaimStatus('rejected') === 'denied'`; `mapClaimRow` assembles the contract shape (assert `gameSlug`, `status: 'denied'` mapping, `signals`, optional `board`, `denyReason` passthrough).

Write the test file with concrete fixtures (a full row object with `id: 1, userId: 42, gameId: 123, message: 'let me mod this'`, users fields, games fields `name: 'supermario64', display: 'Super Mario 64'`) and exact expected output per the contract doc. No hand-waving — the expected object literal appears in the test.

- [ ] **Step 2: Run, confirm module-not-found failure**

```bash
npx jest test/automated/unit/claims/claim-mapping.test.ts
```

- [ ] **Step 3: Implement the pure module** to make the tests pass exactly. Keep it dependency-free (no db imports).

- [ ] **Step 4: Run, confirm all pass**

- [ ] **Step 5: Implement the service** per the Interfaces block. Reuse `submitModRequest` for insert-side checks by calling it after your own pending-dup check:

```typescript
export class ConflictError extends Error {}

export async function submitBoardClaim(params: {
    userId: number;
    gameId: number;
    motivation: string;
}): Promise<{ id: number }> {
    const db = await getDb();
    const [openRow] = await db
        .select({ id: moderatorRequests.id })
        .from(moderatorRequests)
        .where(
            and(
                eq(moderatorRequests.userId, params.userId),
                eq(moderatorRequests.gameId, params.gameId),
                eq(moderatorRequests.status, "pending"),
            ),
        )
        .limit(1);
    if (openRow) {
        throw new ConflictError("You already have an open application here.");
    }
    return submitModRequest({
        userId: params.userId,
        gameId: params.gameId,
        message: params.motivation,
    });
}
```

For `listBoardClaims`, batch the signals efficiently: one query for the pending rows (join users + games), then grouped count queries keyed by the involved userIds/gameIds (avoid N+1 where a `GROUP BY` does it — e.g. `select userId, gameId, count(*) from finished_runs where userId in (...) group by 1,2`). If the drizzle idiom fights you, per-row queries are acceptable at queue scale (tens of rows) — prefer clarity; note the choice in your report.

- [ ] **Step 6: Typecheck gate + commit**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head
git add src/leaderboards/claims/ src/services/board-claims-service.ts test/automated/unit/claims/
git commit -m "feat(claims): board-claims service over moderator_requests with signals"
```

---

### Task 4: /v1/board-claims handler + routing

**Files:**
- Create: `/home/joey/therun/therun/src/api/board-claims/handler.ts`
- Modify: `/home/joey/therun/therun/src/api/api-entry.ts` (add prefix branch before the `/v1/games` branch at ~line 160)
- Create: `/home/joey/therun/therun/test/manual/integration/board-claims/handler.test.ts` (committed unrun)

**Interfaces:**
- Consumes: Task 3's service + pure module; `getAuthenticatedUserFromEvent`; `checkGameMgmtPermission` from `src/rbac/check-game-mgmt-permission`; the roles handler's `getUserPgId` pattern (`src/api/roles/handler.ts:31` — replicate locally, don't import a non-exported helper).
- Produces routes (all under `/v1/board-claims`):
  - `POST /v1/board-claims` (auth): body `{ gameId, motivation }` → validateMotivation → `submitBoardClaim` → `ok({ result: { id } })`; `ConflictError` → local `conflict(...)` 409; `ValidationError` → `yourFault`.
  - `GET /v1/board-claims/mine?gameId=` (auth): → `ok({ result: <mapped row or null> })`.
  - `GET /v1/board-claims?status=pending[&gameId=]` (auth): without `gameId` → `checkGameMgmtPermission(pgId, "assign-game-admin", {})` (global-admin only — same action the approve of a game-admin needs at global scope); with `gameId` → `checkGameMgmtPermission(pgId, "review-mod-request", { gameId })` (that game's admins or global). → `ok({ result: rows })`.
  - `POST /v1/board-claims/{id}/approve` (auth): body `{ role }` → `validateClaimRole` else `yourFault("Invalid role")` → load request (404 if missing, `yourFault` if not pending) → `checkGameMgmtPermission(pgId, role === "game-admin" ? "assign-game-admin" : "assign-game-mod", { gameId: request.gameId })` → `approveBoardClaim` → `ok({ result: { approved: true } })`.
  - `POST /v1/board-claims/{id}/deny` (auth): body `{ reason? }` → load request → `checkGameMgmtPermission(pgId, "review-mod-request", { gameId: request.gameId })` → `denyBoardClaim` → `ok({ result: { denied: true } })`.
- Handler skeleton mirrors `src/api/roles/handler.ts`: try/catch wrapping, `ValidationError` → `yourFault`, `"Permission denied"` message prefix → `forbidden`, method fallthrough → `methodNotAllowed`, unknown path → `notFound`.

- [ ] **Step 1: Write the handler** following the roles-handler skeleton exactly (read it first). All five arms; auth for every arm (no public arms here).

- [ ] **Step 2: Wire api-entry** — add before the `/v1/games` branch:

```typescript
    if (path.startsWith("/v1/board-claims")) {
        return handleBoardClaims(event);
    }
```

(match the surrounding style; import at top.)

- [ ] **Step 3: Integration smoke test (committed, NOT run)** — mirror `test/manual/integration/me/submission.test.ts`: an event with no Authorization header against `POST /v1/board-claims` expects a thrown auth error / non-200 (assert whatever that reference test asserts — read it and copy its structure).

- [ ] **Step 4: Typecheck gate + unit suite + commit**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head
npx jest test/automated/unit
git add src/api/board-claims/ src/api/api-entry.ts test/manual/integration/board-claims/
git commit -m "feat(claims): /v1/board-claims endpoints (submit, mine, queue, approve, deny)"
```

---

### Task 5: GET /v1/games/{gameId}/moderators (public)

**Files:**
- Modify: `/home/joey/therun/therun/src/api/game-mgmt/handler.ts`

**Interfaces:**
- Produces: public route `GET /v1/games/{gameId}/moderators` → `ok(JSON.stringify({ result: rows }))` where rows = `{ assignmentId, userId, username, role, createdAt }[]` for that game's `role_assignments` with role ∈ ('game-admin','game-mod'), joined to `users` for username.

- [ ] **Step 1: Add the arm.** Place it in the PUBLIC section (before the auth gate at ~line 239) and BEFORE the generic `GET /v1/games/:id` arm at ~line 131 — or extend that arm's guard to exclude `/moderators` (read the existing guard style: it already excludes other subpaths; match it). Query (mirror the username join `rebuildGamePageData` uses at `src/services/game-mgmt-service.ts:344-352`):

```typescript
        const moderatorsMatch = path.match(/\/v1\/games\/(\d+)\/moderators$/);
        if (event.httpMethod === "GET" && moderatorsMatch) {
            const gameId = parseInt(moderatorsMatch[1]);
            const db = await getDb();
            const rows = await db
                .select({
                    assignmentId: roleAssignments.id,
                    userId: roleAssignments.userId,
                    username: users.username,
                    role: roleAssignments.role,
                    createdAt: roleAssignments.createdAt,
                })
                .from(roleAssignments)
                .leftJoin(users, eq(roleAssignments.userId, users.id))
                .where(
                    and(
                        eq(roleAssignments.gameId, gameId),
                        inArray(roleAssignments.role, ["game-admin", "game-mod"]),
                    ),
                );
            return ok(JSON.stringify({ result: rows }));
        }
```

(Adjust imports — `inArray` from drizzle-orm; `roleAssignments`, `users` from schema — reusing what the file already imports where possible.)

- [ ] **Step 2: Typecheck gate + commit**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head
git add src/api/game-mgmt/handler.ts
git commit -m "feat(games): public per-game moderators endpoint"
```

---

### Task 6: Game metadata + configured flag through PUT/GET

**Files:**
- Modify: `/home/joey/therun/therun/src/api/game-mgmt/handler.ts` (PUT arm ~line 299)
- Modify: `/home/joey/therun/therun/src/services/game-mgmt-service.ts` (`updateGame` params + updates mapping ~lines 103-186; `rebuildGamePageData`'s `pageData.game` literal ~lines 459-478)

**Interfaces:**
- Produces: `PUT /v1/games/{gameId}` additionally accepts `coverUrl?: string|null`, `platforms?: string[]`, `releaseYear?: number|null`, `discordUrl?: string|null`, `configured?: boolean`; `GET /v1/games/{gameId}`'s `pageData.game` carries the same five fields. Validation inside `updateGame` (throw `ValidationError`): `discordUrl` must match `^https:\/\/(www\.)?discord\.(gg|com)\//` when non-null; `releaseYear` integer 1950–2100 when non-null; `platforms` an array of non-empty strings (trimmed) when provided; `coverUrl` when non-null must start `https://`.

- [ ] **Step 1: Extend `updateGame`** — add the five optional params to the signature and, following the file's existing per-field `if (params.x !== undefined)` mapping pattern, add validations + `updates.coverUrl = ...` etc. Keep the existing behavior for all current fields untouched.

- [ ] **Step 2: Extend the PUT arm body mapping** — add the five `body.*` passthroughs alongside the existing ones.

- [ ] **Step 3: Extend `pageData.game`** — add the five fields to the object literal in `rebuildGamePageData` (sourced from the game row). Confirm `updateGame` already ends by queueing a pageData rebuild (the explorer report says assignRole does; VERIFY updateGame does too — if it doesn't, add `await queuePageDataRebuild(params.gameId)` matching the file's own idiom, and say so in your report).

- [ ] **Step 4: Typecheck gate + unit suite + commit**

```bash
npx tsc --noEmit 2>&1 | grep -v node_modules | head
npx jest test/automated/unit
git add src/services/game-mgmt-service.ts src/api/game-mgmt/handler.ts
git commit -m "feat(games): metadata fields and configured flag on game update/page-data"
```

---

### Task 7: Frontend CASL wiring + docs + pushes

**Files:**
- Modify: `/home/joey/therun/therun-fr/types/session.types.ts` (User type)
- Modify: `/home/joey/therun/therun-fr/src/rbac/ability.ts` (defaultPermissions)
- Modify: `/home/joey/therun/therun-fr/docs/frontend-guide-board-claims-and-setup.md` (status header)

**Interfaces:**
- Consumes: session now returns `adminedGames: string[]` (Task 2).
- Produces: frontend `User.adminedGames?: string[]`; per-game `can('edit', 'moderators', { game })` for admined games — un-gating the wizard mod-team section and console join-team approvals for real per-game admins.

- [ ] **Step 1 (frontend repo, branch game-setup-wizard):** add `adminedGames?: string[];` to the `User` type in `types/session.types.ts` (next to `moderatedGames` — read the file for the exact shape). In `src/rbac/ability.ts` `defaultPermissions`, after the existing `moderatedGames` blocks add:

```typescript
    // Per-game admins manage their board's mod team.
    (user.adminedGames || []).forEach((game) => {
        can('edit', 'moderators', { game });
    });
```

- [ ] **Step 2:** Update the handoff doc header: `**Status:** contract proposal — frontend is built against these shapes; endpoints return 404 until implemented.` → `**Status:** implemented backend-side on branch game-setup-wizard (../therun) — pending migration 0071 + deploy. DB stores status 'rejected'; the API maps it to 'denied'. Global queue excludes already-moderated boards.`

- [ ] **Step 3: Frontend gates + commit**

```bash
cd /home/joey/therun/therun-fr && npm run typecheck 2>&1 | grep -E 'ability|session' | head
npx vitest run
git add types/session.types.ts src/rbac/ability.ts docs/frontend-guide-board-claims-and-setup.md
git commit -m "feat(rbac): per-game edit-moderators from session adminedGames"
```

- [ ] **Step 4: Push both branches** (after the final review verdict — the controller sequences this)

```bash
cd /home/joey/therun/therun && git push -u origin game-setup-wizard
cd /home/joey/therun/therun-fr && git push origin game-setup-wizard
```

---

## Plan Self-Review (completed)

- **Contract coverage:** claims CRUD incl. 409 + signals + board activity + global-queue exclusion (T3/T4), notifications on approve/deny (T3), per-game moderators endpoint (T5), metadata + configured (T1/T6), session moderatedGames/adminedGames (T2), role whitelist + per-game authz scoping via `checkGameMgmtPermission` with assign-actions (T4), frontend CASL consumption (T7).
- **Known deviations recorded in the doc update (T7):** DB status `rejected` mapped to API `denied`; global queue excludes moderated boards (was a contract follow-up note).
- **Type consistency:** `ConflictError` defined T3, consumed T4; `deriveGameLists`/`getGameRoleRowsForUser` defined T2, session-wired T2; contract shape built only in `mapClaimRow` (T3) and returned by T4 arms.
- **Env safety:** no `npm run migrate`, no integration-test runs, tsc gate filtered to non-node_modules — all per repo CLAUDE.md and prior-session findings.
