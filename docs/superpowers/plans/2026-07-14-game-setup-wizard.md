# Game Setup Wizard + Board Claim Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Runner-facing board-claim flow with an admin approval queue, plus a guided 8-step setup wizard at `games-v2/[game]/setup` that writes through the existing management server actions and flips a backend `configured` flag.

**Architecture:** Approach A from the spec (`docs/superpowers/specs/2026-07-14-game-setup-wizard-design.md`): dedicated wizard route with purpose-built plain-language step UIs; the console stays the power-user surface. Pure modules (`setup-completeness`, `setup-suggestions`, claim grouping) are unit-tested with vitest; UI writes reuse existing server actions. Backend-dependent surfaces (claims, mod list, metadata fields, `configured`) are built against typed lib functions whose endpoints are documented in a handoff doc — the UI compiles and is reviewable before the backend lands.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CASL, vitest, Biome (4-space indent, single quotes, trailing commas, semicolons).

## Global Constraints

- Branch: `game-setup-wizard` (already exists, stacked on `profile-leaderboard-pbs`). Never create PRs; push the branch only.
- `getSession()` returns the `User` directly (`session.id` is the bearer token). Pass `session` straight to permission helpers.
- Server actions follow the house pattern exactly: `getSession()` → `confirmPermission(...)` or `canModerateGame(...)` or admin-roles check → lib call → `revalidateTag(tag, profile)`. `revalidateTag` ALWAYS takes 2 args and the profile must match the `cacheLife()` of the cached fn that set the tag.
- Cached fetchers use `'use cache'` + `cacheLife(...)` + `cacheTag(...)`. Functions with `'use cache'` must not call `cookies()`/`headers()`/`getSession()` — take `sessionId`/params as arguments.
- `'use server'` files may only export async functions (plus types, which erase). Pure sync helpers go in normal modules (no directive).
- min_time policy values use `{ minTimeMs, minGameTimeMs }` keys — NOT `rtMs`/`gtMs` — or the backend 400s.
- Path aliases: `~src/*` → `src/*`, `~app/*` → `app/*`. Types in `types/` are imported by relative path (house style).
- Unused variables prefixed with `_`. Biome formats on commit via husky.
- Do not add Claude as co-author in commits.
- Verification per task: `npm run typecheck` && `npm run lint`; `npm run test` where the task adds tests. There is no component-test infra — UI tasks verify by typecheck + lint only; Joey does the browser pass at the end.
- Game slugs in URLs/actions are `ResolvedGame.name` (normalized). `ResolvedGame.id` is the numeric id the API needs.

---

### Task 1: Backend handoff document

The claim flow, mod list, metadata fields, and `configured` flag need backend work we do NOT build (frontend-lane rule). Document the exact contract first so every later task codes against agreed shapes.

**Files:**
- Create: `docs/frontend-guide-board-claims-and-setup.md`

**Interfaces:**
- Produces: the endpoint contract that Tasks 2–4 encode as lib functions. No code.

- [ ] **Step 1: Write the handoff doc**

```markdown
# Frontend guide: board claims, per-game moderators, game metadata, configured flag

**Status:** contract proposal — frontend is built against these shapes; endpoints return 404 until implemented.
**Consumers:** claim CTA on `games-v2/[game]`, admin queue at `/admin/board-claims`, console attention pane, setup wizard at `games-v2/[game]/setup`.

## 1. Board claim requests

A claim request = a user asking to moderate a game's board. One open (`pending`) request per (userId, gameId) — reject duplicates with 409.

### POST /v1/board-claims  (auth: any logged-in user)
Body: `{ "gameId": number, "motivation": string }`  → `{ "result": { "id": number } }`
No eligibility requirements (decision 2026-07-14): signals are surfaced, not gated.

### GET /v1/board-claims?status=pending  (auth: global admin)
### GET /v1/board-claims?status=pending&gameId={id}  (auth: that game's game-admin OR global admin)
### GET /v1/board-claims/mine?gameId={id}  (auth: any; returns caller's request for that game or null)

All return `BoardClaimRequest`:

```json
{
    "id": 1, "gameId": 123, "gameSlug": "supermario64", "gameDisplay": "Super Mario 64",
    "userId": 42, "username": "runner1", "motivation": "…",
    "status": "pending",              // pending | approved | denied
    "signals": {
        "runsOnGame": 17,             // finished ingested runs by this user on this game
        "totalRuns": 220,             // finished ingested runs by this user overall
        "accountCreatedAt": "2024-01-01T00:00:00Z",
        "priorApprovals": 0, "priorDenials": 1
    },
    "createdAt": "…", "decidedBy": null, "decidedAt": null, "denyReason": null
}
```
The list endpoints also inline board activity so the admin can judge stakes:
`"board": { "uniqueRunners": number, "totalFinishedRuns": number }` per request.

### POST /v1/board-claims/{id}/approve  (auth: global admin; for gameId-scoped requests on already-moderated boards: that game's game-admin too)
Body: `{ "role": "game-admin" | "game-mod" }`
Effect: create the role assignment for (userId, gameId), make `canModerateGame`/`moderatedGames` reflect it, mark request approved, send a bell notification to the requester linking to `/games-v2/{gameSlug}/setup`.

### POST /v1/board-claims/{id}/deny  (same auth as approve)
Body: `{ "reason"?: string }` → notification to requester.

## 2. Per-game moderators

`POST /roles/assign` already accepts `{ userId, role: 'game-admin'|'game-mod', gameId }` and
`DELETE /roles/{assignmentId}` exists. **Please confirm** these assignments feed
`user.moderatedGames` / `canModerateGame` on session load — the frontend assumes they do.

### NEW: GET /v1/games/{gameId}/moderators  (public, no auth)
→ `{ "result": [ { "assignmentId": 1, "userId": 42, "username": "runner1", "role": "game-admin", "createdAt": "…" } ] }`
Public because the claim CTA needs "does this board have mods?" for logged-out render too.

## 3. Game metadata

Extend `PUT /v1/games/{gameId}` (existing, already takes `slug`/`abbreviation`) with:
`coverUrl?: string|null`, `platforms?: string[]`, `releaseYear?: number|null`, `discordUrl?: string|null`.
Extend `GET /v1/games/{gameId}` response's `game` object with the same fields.
Nice-to-have (not blocking): a presigned-URL upload endpoint for game cover images —
the existing NEXT_PUBLIC_UPLOAD_URL path is splits-specific; v1 wizard uses a URL field.

## 4. Configured flag

Board-level `configured: boolean` (default false) on the game.
Settable via the same `PUT /v1/games/{gameId}` body (`configured?: boolean`) by that game's mods
(same authz as category settings). Returned on `GET /v1/games/{gameId}`.
Purpose: "unconfigured board" badges + discovery ranking later; the wizard's Finish step sets it true.
```

- [ ] **Step 2: Commit**

```bash
git add docs/frontend-guide-board-claims-and-setup.md
git commit -m "docs: backend contract for board claims, game mods, metadata, configured flag"
```

---

### Task 2: Board-claim types, lib, and claim grouping (TDD for grouping)

**Files:**
- Create: `types/board-claims.types.ts`
- Create: `src/lib/board-claims.ts`
- Create: `src/lib/setup/group-claims.ts`
- Test: `src/lib/setup/__tests__/group-claims.test.ts`

**Interfaces:**
- Produces: `BoardClaimRequest`, `BoardClaimSignals`, `BoardClaimStatus`, `BoardModRole`, `GameModerator` (types); `submitBoardClaim(sessionId, gameId, motivation)`, `getMyBoardClaim(sessionId, gameId)`, `listPendingBoardClaims(sessionId)`, `listGameBoardClaims(sessionId, gameId)`, `approveBoardClaim(sessionId, id, role)`, `denyBoardClaim(sessionId, id, reason?)`; `groupClaimsByBoard(claims): BoardClaimGroup[]`.

- [ ] **Step 1: Write the types file**

```typescript
// types/board-claims.types.ts
export type BoardClaimStatus = 'pending' | 'approved' | 'denied';

/** Per-game moderator roles as the /roles API knows them. */
export type BoardModRole = 'game-admin' | 'game-mod';

export interface BoardClaimSignals {
    runsOnGame: number;
    totalRuns: number;
    accountCreatedAt: string | null;
    priorApprovals: number;
    priorDenials: number;
}

export interface BoardClaimBoardActivity {
    uniqueRunners: number;
    totalFinishedRuns: number;
}

export interface BoardClaimRequest {
    id: number;
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    userId: number;
    username: string;
    motivation: string;
    status: BoardClaimStatus;
    signals: BoardClaimSignals;
    board?: BoardClaimBoardActivity;
    createdAt: string;
    decidedBy: number | null;
    decidedAt: string | null;
    denyReason: string | null;
}

export interface GameModerator {
    assignmentId: number;
    userId: number;
    username: string;
    role: BoardModRole;
    createdAt: string;
}
```

- [ ] **Step 2: Write the failing grouping test**

```typescript
// src/lib/setup/__tests__/group-claims.test.ts
import { describe, expect, it } from 'vitest';
import type { BoardClaimRequest } from '../../../../types/board-claims.types';
import { groupClaimsByBoard } from '../group-claims';

function claim(over: Partial<BoardClaimRequest>): BoardClaimRequest {
    return {
        id: 1,
        gameId: 10,
        gameSlug: 'gamea',
        gameDisplay: 'Game A',
        userId: 1,
        username: 'u1',
        motivation: 'please',
        status: 'pending',
        signals: {
            runsOnGame: 0,
            totalRuns: 0,
            accountCreatedAt: null,
            priorApprovals: 0,
            priorDenials: 0,
        },
        board: { uniqueRunners: 5, totalFinishedRuns: 50 },
        createdAt: '2026-07-01T00:00:00Z',
        decidedBy: null,
        decidedAt: null,
        denyReason: null,
        ...over,
    };
}

describe('groupClaimsByBoard', () => {
    it('groups rival requests for the same game onto one card', () => {
        const groups = groupClaimsByBoard([
            claim({ id: 1, gameId: 10, userId: 1 }),
            claim({ id: 2, gameId: 10, userId: 2 }),
            claim({ id: 3, gameId: 20, gameSlug: 'gameb', userId: 3 }),
        ]);
        expect(groups).toHaveLength(2);
        const a = groups.find((g) => g.gameId === 10);
        expect(a?.requests.map((r) => r.id)).toEqual([1, 2]);
    });

    it('sorts groups by oldest pending request first (stalest board first)', () => {
        const groups = groupClaimsByBoard([
            claim({ id: 1, gameId: 10, createdAt: '2026-07-10T00:00:00Z' }),
            claim({ id: 2, gameId: 20, createdAt: '2026-07-01T00:00:00Z' }),
        ]);
        expect(groups[0].gameId).toBe(20);
    });

    it('sorts requests within a group oldest first', () => {
        const groups = groupClaimsByBoard([
            claim({ id: 1, gameId: 10, createdAt: '2026-07-10T00:00:00Z' }),
            claim({ id: 2, gameId: 10, createdAt: '2026-07-01T00:00:00Z' }),
        ]);
        expect(groups[0].requests.map((r) => r.id)).toEqual([2, 1]);
    });

    it('returns empty array for no claims', () => {
        expect(groupClaimsByBoard([])).toEqual([]);
    });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/setup/__tests__/group-claims.test.ts`
Expected: FAIL — cannot resolve `../group-claims`.

- [ ] **Step 4: Implement the grouping module**

```typescript
// src/lib/setup/group-claims.ts
// Pure module (no 'use server') so it can export sync helpers and be unit-tested.
import type {
    BoardClaimBoardActivity,
    BoardClaimRequest,
} from '../../../types/board-claims.types';

export interface BoardClaimGroup {
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    board: BoardClaimBoardActivity | null;
    requests: BoardClaimRequest[];
}

export function groupClaimsByBoard(
    claims: BoardClaimRequest[],
): BoardClaimGroup[] {
    const byGame = new Map<number, BoardClaimGroup>();
    for (const c of claims) {
        let group = byGame.get(c.gameId);
        if (!group) {
            group = {
                gameId: c.gameId,
                gameSlug: c.gameSlug,
                gameDisplay: c.gameDisplay,
                board: c.board ?? null,
                requests: [],
            };
            byGame.set(c.gameId, group);
        }
        group.requests.push(c);
    }
    const groups = [...byGame.values()];
    for (const g of groups) {
        g.requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    groups.sort((a, b) =>
        a.requests[0].createdAt.localeCompare(b.requests[0].createdAt),
    );
    return groups;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/setup/__tests__/group-claims.test.ts`
Expected: 4 passed.

- [ ] **Step 6: Write the claims lib**

```typescript
// src/lib/board-claims.ts
'use server';

import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../types/board-claims.types';
import { ApiError, apiFetch } from './api-client';

export async function submitBoardClaim(
    sessionId: string,
    gameId: number,
    motivation: string,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>('/v1/board-claims', {
        method: 'POST',
        sessionId,
        body: { gameId, motivation },
    });
}

export async function getMyBoardClaim(
    sessionId: string,
    gameId: number,
): Promise<BoardClaimRequest | null> {
    try {
        const result = await apiFetch<BoardClaimRequest | null>(
            `/v1/board-claims/mine?gameId=${gameId}`,
            { sessionId },
        );
        return result ?? null;
    } catch (e) {
        // Endpoint not deployed yet (404) must not break the game page.
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
    }
}

export async function listPendingBoardClaims(
    sessionId: string,
): Promise<BoardClaimRequest[]> {
    try {
        const result = await apiFetch<BoardClaimRequest[]>(
            '/v1/board-claims?status=pending',
            { sessionId },
        );
        return result ?? [];
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
    }
}

export async function listGameBoardClaims(
    sessionId: string,
    gameId: number,
): Promise<BoardClaimRequest[]> {
    try {
        const result = await apiFetch<BoardClaimRequest[]>(
            `/v1/board-claims?status=pending&gameId=${gameId}`,
            { sessionId },
        );
        return result ?? [];
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
    }
}

export async function approveBoardClaim(
    sessionId: string,
    claimId: number,
    role: BoardModRole,
): Promise<{ approved: boolean }> {
    return apiFetch<{ approved: boolean }>(
        `/v1/board-claims/${claimId}/approve`,
        { method: 'POST', sessionId, body: { role } },
    );
}

export async function denyBoardClaim(
    sessionId: string,
    claimId: number,
    reason?: string,
): Promise<{ denied: boolean }> {
    return apiFetch<{ denied: boolean }>(`/v1/board-claims/${claimId}/deny`, {
        method: 'POST',
        sessionId,
        body: { reason: reason ?? null },
    });
}
```

- [ ] **Step 7: Typecheck, lint, commit**

Run: `npm run typecheck && npm run lint`
Expected: clean (pre-existing warnings unrelated to these files are fine).

```bash
git add types/board-claims.types.ts src/lib/board-claims.ts src/lib/setup/
git commit -m "feat(claims): board-claim types, api lib, queue grouping"
```

---

### Task 3: Game moderators lib + game-mgmt metadata extensions

**Files:**
- Create: `src/lib/game-moderators.ts`
- Modify: `src/lib/game-mgmt.ts` (extend `UpdateGameBody`, add `GameMetadata` + `getGameMetadata`)

**Interfaces:**
- Consumes: `GameModerator` from `types/board-claims.types.ts` (Task 2).
- Produces: `listGameModerators(gameId): Promise<GameModerator[]>` (cached, tag `game-mods:{gameId}`, profile `minutes`); `GameMetadata { coverUrl, platforms, releaseYear, discordUrl, configured }`; `getGameMetadata(gameId): Promise<GameMetadata>` (cached, tag `game-meta:{gameId}`, profile `minutes`); `UpdateGameBody` gains `coverUrl?`, `platforms?`, `releaseYear?`, `discordUrl?`, `configured?`.

- [ ] **Step 1: Write the moderators lib**

```typescript
// src/lib/game-moderators.ts
'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type { GameModerator } from '../../types/board-claims.types';
import { ApiError, apiFetch } from './api-client';

export async function listGameModerators(
    gameId: number,
): Promise<GameModerator[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-mods:${gameId}`);

    try {
        const result = await apiFetch<GameModerator[]>(
            `/v1/games/${gameId}/moderators`,
        );
        return result ?? [];
    } catch (e) {
        // Endpoint is part of the backend handoff; 404 = not deployed yet.
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
    }
}
```

- [ ] **Step 2: Extend game-mgmt.ts**

Add to `src/lib/game-mgmt.ts` (keep existing exports untouched; extend `UpdateGameBody` in place):

```typescript
// Replaces the existing UpdateGameBody interface:
export interface UpdateGameBody {
    slug?: string | null;
    abbreviation?: string | null;
    coverUrl?: string | null;
    platforms?: string[];
    releaseYear?: number | null;
    discordUrl?: string | null;
    configured?: boolean;
}

export interface GameMetadata {
    coverUrl: string | null;
    platforms: string[];
    releaseYear: number | null;
    discordUrl: string | null;
    configured: boolean;
}

interface GameMetadataPageData {
    game?: {
        coverUrl?: string | null;
        platforms?: string[] | null;
        releaseYear?: number | null;
        discordUrl?: string | null;
        configured?: boolean | null;
    };
}

export async function getGameMetadata(gameId: number): Promise<GameMetadata> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`game-meta:${gameId}`);

    const data = await apiFetch<GameMetadataPageData | undefined>(
        `/v1/games/${gameId}`,
    );
    return {
        coverUrl: data?.game?.coverUrl ?? null,
        platforms: data?.game?.platforms ?? [],
        releaseYear: data?.game?.releaseYear ?? null,
        discordUrl: data?.game?.discordUrl ?? null,
        configured: data?.game?.configured ?? false,
    };
}
```

Note: `game-mgmt.ts` is a `'use server'` file — `cacheLife`/`cacheTag` imports go at the top alongside the existing imports: `import { cacheLife, cacheTag } from 'next/cache';`.

- [ ] **Step 3: Typecheck, lint, commit**

Run: `npm run typecheck && npm run lint`
Expected: clean.

```bash
git add src/lib/game-moderators.ts src/lib/game-mgmt.ts
git commit -m "feat(setup): game moderators lib, game metadata + configured fields"
```

---

### Task 4: Setup completeness module (TDD)

The single source of truth for "is this board set up": consumed by wizard resume, the console checklist card, and (later) the health score.

**Files:**
- Create: `src/lib/setup/completeness.ts`
- Test: `src/lib/setup/__tests__/completeness.test.ts`

**Interfaces:**
- Consumes: `ResolvedCategory` from `types/leaderboards.types.ts` (adapter only).
- Produces:
  - `SetupStepId = 'welcome'|'details'|'categories'|'timing'|'variables'|'rules'|'standards'|'finish'`
  - `SetupStepStatus = 'done'|'todo'|'warning'|'blocker'`
  - `SetupStepState { step: SetupStepId; status: SetupStepStatus; summary: string }`
  - `CategoryFacts { id, display, active, isMain, hasRules }`
  - `CompletenessInput { categories: CategoryFacts[]; variableCount; policyCount; requireVideoAnywhere; slug; abbreviation; moderatorCount; configured }`
  - `BoardCompleteness { steps: SetupStepState[]; firstIncomplete: SetupStepId|null; doneCount; totalCount; blockers: string[]; warnings: string[] }`
  - `computeCompleteness(input): BoardCompleteness`
  - `categoryFactsFromResolved(categories: ResolvedCategory[]): CategoryFacts[]`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/setup/__tests__/completeness.test.ts
import { describe, expect, it } from 'vitest';
import {
    type CompletenessInput,
    computeCompleteness,
} from '../completeness';

function input(over: Partial<CompletenessInput>): CompletenessInput {
    return {
        categories: [
            {
                id: 1,
                display: 'Any%',
                active: true,
                isMain: true,
                hasRules: true,
            },
            {
                id: 2,
                display: '100%',
                active: true,
                isMain: false,
                hasRules: true,
            },
        ],
        variableCount: 0,
        policyCount: 1,
        requireVideoAnywhere: false,
        slug: 'mygame',
        abbreviation: 'mg',
        moderatorCount: 1,
        configured: true,
        ...over,
    };
}

describe('computeCompleteness', () => {
    it('reports a fully set-up board as all done', () => {
        const c = computeCompleteness(input({}));
        expect(c.firstIncomplete).toBeNull();
        expect(c.blockers).toEqual([]);
        expect(c.doneCount).toBe(c.totalCount);
    });

    it('flags no-active-categories as a blocker', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: false,
                        isMain: false,
                        hasRules: false,
                    },
                ],
            }),
        );
        const cats = c.steps.find((s) => s.step === 'categories');
        expect(cats?.status).toBe('blocker');
        expect(c.blockers.length).toBeGreaterThan(0);
        expect(c.firstIncomplete).toBe('categories');
    });

    it('flags active-but-no-main as a blocker', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: false,
                        hasRules: true,
                    },
                ],
            }),
        );
        expect(
            c.steps.find((s) => s.step === 'categories')?.status,
        ).toBe('blocker');
    });

    it('treats an ingestion-empty board as completable (no category blocker)', () => {
        const c = computeCompleteness(input({ categories: [] }));
        expect(
            c.steps.find((s) => s.step === 'categories')?.status,
        ).toBe('done');
        expect(c.blockers).toEqual([]);
    });

    it('warns when active categories lack rules', () => {
        const c = computeCompleteness(
            input({
                categories: [
                    {
                        id: 1,
                        display: 'Any%',
                        active: true,
                        isMain: true,
                        hasRules: false,
                    },
                ],
            }),
        );
        const rules = c.steps.find((s) => s.step === 'rules');
        expect(rules?.status).toBe('warning');
        expect(rules?.summary).toContain('1');
    });

    it('warns when there are no standards at all', () => {
        const c = computeCompleteness(
            input({ policyCount: 0, requireVideoAnywhere: false }),
        );
        expect(
            c.steps.find((s) => s.step === 'standards')?.status,
        ).toBe('warning');
    });

    it('counts require-video as a standard', () => {
        const c = computeCompleteness(
            input({ policyCount: 0, requireVideoAnywhere: true }),
        );
        expect(
            c.steps.find((s) => s.step === 'standards')?.status,
        ).toBe('done');
    });

    it('marks details todo when slug missing, and finish todo when unconfigured', () => {
        const c = computeCompleteness(
            input({ slug: null, configured: false }),
        );
        expect(c.steps.find((s) => s.step === 'details')?.status).toBe('todo');
        expect(c.steps.find((s) => s.step === 'finish')?.status).toBe('todo');
        expect(c.firstIncomplete).toBe('details');
    });

    it('always marks welcome, timing, and variables done', () => {
        const c = computeCompleteness(
            input({ variableCount: 0, configured: false }),
        );
        for (const id of ['welcome', 'timing', 'variables'] as const) {
            expect(c.steps.find((s) => s.step === id)?.status).toBe('done');
        }
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/setup/__tests__/completeness.test.ts`
Expected: FAIL — cannot resolve `../completeness`.

- [ ] **Step 3: Implement**

```typescript
// src/lib/setup/completeness.ts
// Pure module — the single source of truth for "is this board set up".
// Consumed by the wizard (resume + review step), the console checklist card,
// and later the board health score.
import type { ResolvedCategory } from '../../../types/leaderboards.types';

export type SetupStepId =
    | 'welcome'
    | 'details'
    | 'categories'
    | 'timing'
    | 'variables'
    | 'rules'
    | 'standards'
    | 'finish';

export type SetupStepStatus = 'done' | 'todo' | 'warning' | 'blocker';

export interface SetupStepState {
    step: SetupStepId;
    status: SetupStepStatus;
    summary: string;
}

export interface CategoryFacts {
    id: number;
    display: string;
    active: boolean;
    isMain: boolean;
    hasRules: boolean;
}

export interface CompletenessInput {
    categories: CategoryFacts[];
    variableCount: number;
    policyCount: number;
    requireVideoAnywhere: boolean;
    slug: string | null;
    abbreviation: string | null;
    moderatorCount: number;
    configured: boolean;
}

export interface BoardCompleteness {
    steps: SetupStepState[];
    firstIncomplete: SetupStepId | null;
    doneCount: number;
    totalCount: number;
    blockers: string[];
    warnings: string[];
}

export const SETUP_STEP_ORDER: SetupStepId[] = [
    'welcome',
    'details',
    'categories',
    'timing',
    'variables',
    'rules',
    'standards',
    'finish',
];

export function categoryFactsFromResolved(
    categories: ResolvedCategory[],
): CategoryFacts[] {
    return categories.map((c) => ({
        id: c.id,
        display: c.display,
        active: c.active,
        isMain: c.isMain,
        hasRules: (c.rules ?? '').trim().length > 0,
    }));
}

export function computeCompleteness(
    input: CompletenessInput,
): BoardCompleteness {
    const active = input.categories.filter((c) => c.active);
    const steps: SetupStepState[] = [];

    steps.push({ step: 'welcome', status: 'done', summary: 'Board snapshot' });

    steps.push(
        input.slug && input.abbreviation
            ? {
                  step: 'details',
                  status: 'done',
                  summary: `Slug ${input.slug} · abbreviation ${input.abbreviation}`,
              }
            : {
                  step: 'details',
                  status: 'todo',
                  summary: 'Slug or abbreviation missing',
              },
    );

    if (input.categories.length === 0) {
        // Ingestion-empty board: categories appear when runs arrive; the
        // wizard is completable without them (spec: empty-board exception).
        steps.push({
            step: 'categories',
            status: 'done',
            summary: 'No ingested categories yet — they appear as runs arrive',
        });
    } else if (active.length === 0) {
        steps.push({
            step: 'categories',
            status: 'blocker',
            summary: 'No categories are shown on the board',
        });
    } else if (!active.some((c) => c.isMain)) {
        steps.push({
            step: 'categories',
            status: 'blocker',
            summary: 'No main category selected',
        });
    } else {
        steps.push({
            step: 'categories',
            status: 'done',
            summary: `${active.length} shown / ${
                input.categories.length - active.length
            } hidden`,
        });
    }

    steps.push({
        step: 'timing',
        status: 'done',
        summary: 'Timing follows ingested defaults unless changed',
    });

    steps.push({
        step: 'variables',
        status: 'done',
        summary:
            input.variableCount > 0
                ? `${input.variableCount} variable${
                      input.variableCount === 1 ? '' : 's'
                  }`
                : 'None configured (optional)',
    });

    const activeWithoutRules = active.filter((c) => !c.hasRules);
    if (input.categories.length === 0 || activeWithoutRules.length === 0) {
        steps.push({ step: 'rules', status: 'done', summary: 'Rules set' });
    } else {
        steps.push({
            step: 'rules',
            status: 'warning',
            summary: `${activeWithoutRules.length} categor${
                activeWithoutRules.length === 1 ? 'y has' : 'ies have'
            } no rules`,
        });
    }

    steps.push(
        input.policyCount > 0 || input.requireVideoAnywhere
            ? {
                  step: 'standards',
                  status: 'done',
                  summary: 'Verification standards set',
              }
            : {
                  step: 'standards',
                  status: 'warning',
                  summary: 'No video requirement or minimum time',
              },
    );

    steps.push(
        input.configured
            ? { step: 'finish', status: 'done', summary: 'Setup complete' }
            : {
                  step: 'finish',
                  status: 'todo',
                  summary: 'Setup not marked complete',
              },
    );

    const firstIncomplete =
        steps.find((s) => s.status !== 'done')?.step ?? null;
    return {
        steps,
        firstIncomplete,
        doneCount: steps.filter((s) => s.status === 'done').length,
        totalCount: steps.length,
        blockers: steps
            .filter((s) => s.status === 'blocker')
            .map((s) => s.summary),
        warnings: steps
            .filter((s) => s.status === 'warning')
            .map((s) => s.summary),
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/setup/__tests__/completeness.test.ts`
Expected: 9 passed.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/lib/setup/completeness.ts src/lib/setup/__tests__/completeness.test.ts
git commit -m "feat(setup): board completeness module"
```

---

### Task 5: Setup suggestions module (TDD)

**Files:**
- Create: `src/lib/setup/suggestions.ts`
- Test: `src/lib/setup/__tests__/suggestions.test.ts`

**Interfaces:**
- Produces: `roundToCleanTimeMs(ms): number`; `suggestMinTimeMs(fastestVerifiedMs: number|null, finishedRunCount: number): number|null`; `activityShare(categories: { totalFinishedAttemptCount: number; active: boolean }[]): number`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/setup/__tests__/suggestions.test.ts
import { describe, expect, it } from 'vitest';
import {
    activityShare,
    roundToCleanTimeMs,
    suggestMinTimeMs,
} from '../suggestions';

const MIN = 60_000;

describe('roundToCleanTimeMs', () => {
    it('rounds ≥10min down to a whole minute', () => {
        expect(roundToCleanTimeMs(14 * MIN + 32_000)).toBe(14 * MIN);
    });
    it('rounds 1–10min down to 15s', () => {
        expect(roundToCleanTimeMs(4 * MIN + 44_000)).toBe(4 * MIN + 30_000);
    });
    it('rounds <1min down to 5s', () => {
        expect(roundToCleanTimeMs(47_300)).toBe(45_000);
    });
});

describe('suggestMinTimeMs', () => {
    it('suggests ~70% of the fastest verified time, rounded clean', () => {
        // 20:00 WR → 70% = 14:00 → clean = 14:00
        expect(suggestMinTimeMs(20 * MIN, 50)).toBe(14 * MIN);
    });
    it('returns null with fewer than 10 finished runs', () => {
        expect(suggestMinTimeMs(20 * MIN, 9)).toBeNull();
    });
    it('returns null without a fastest time', () => {
        expect(suggestMinTimeMs(null, 50)).toBeNull();
    });
});

describe('activityShare', () => {
    it('returns the percentage of finished runs in active categories', () => {
        expect(
            activityShare([
                { totalFinishedAttemptCount: 96, active: true },
                { totalFinishedAttemptCount: 4, active: false },
            ]),
        ).toBe(96);
    });
    it('returns 0 when there are no finished runs', () => {
        expect(activityShare([])).toBe(0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/setup/__tests__/suggestions.test.ts`
Expected: FAIL — cannot resolve `../suggestions`.

- [ ] **Step 3: Implement**

```typescript
// src/lib/setup/suggestions.ts
// Pure suggestion math for wizard steps. Kept separate from completeness so
// each stays independently testable.

const MINUTE_MS = 60_000;

/** Round a duration down to a "clean" value a human would pick. */
export function roundToCleanTimeMs(ms: number): number {
    if (ms >= 10 * MINUTE_MS) return Math.floor(ms / MINUTE_MS) * MINUTE_MS;
    if (ms >= MINUTE_MS) return Math.floor(ms / 15_000) * 15_000;
    return Math.floor(ms / 5_000) * 5_000;
}

/**
 * Suggested minimum time: ~70% of the fastest verified run, rounded clean.
 * Only offered when the board has enough data to trust (≥10 finished runs).
 */
export function suggestMinTimeMs(
    fastestVerifiedMs: number | null,
    finishedRunCount: number,
): number | null {
    if (fastestVerifiedMs === null || fastestVerifiedMs <= 0) return null;
    if (finishedRunCount < 10) return null;
    return roundToCleanTimeMs(fastestVerifiedMs * 0.7);
}

/** Percentage (0–100, rounded) of finished runs that live in active categories. */
export function activityShare(
    categories: { totalFinishedAttemptCount: number; active: boolean }[],
): number {
    const total = categories.reduce(
        (sum, c) => sum + c.totalFinishedAttemptCount,
        0,
    );
    if (total === 0) return 0;
    const activeTotal = categories
        .filter((c) => c.active)
        .reduce((sum, c) => sum + c.totalFinishedAttemptCount, 0);
    return Math.round((activeTotal / total) * 100);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/setup/__tests__/suggestions.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/lib/setup/suggestions.ts src/lib/setup/__tests__/suggestions.test.ts
git commit -m "feat(setup): suggestion math for min-time and category activity"
```

---

### Task 6: Claim CTA + modal on the public game page

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/claim/claim-cta.tsx`
- Create: `app/(new-layout)/games-v2/[game]/claim/actions/submit-claim.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/page.tsx` (load mods + my claim, thread prop)
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx` (pass-through prop)
- Modify: `app/(new-layout)/games-v2/[game]/header/game-header.tsx` (render CTA)

**Interfaces:**
- Consumes: `submitBoardClaim`, `getMyBoardClaim` (Task 2), `listGameModerators` (Task 3).
- Produces: `ClaimCtaState = { gameId: number; hasModerators: boolean; myClaimPending: boolean }`; `submitBoardClaimAction(input: { gameId: number; motivation: string }): Promise<{ ok: true } | { error: string }>`; `GameHeader` gains optional prop `claim?: ClaimCtaState | null`; `GamePage` gains and passes through the same prop.

- [ ] **Step 1: Write the server action**

```typescript
// app/(new-layout)/games-v2/[game]/claim/actions/submit-claim.action.ts
'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { submitBoardClaim } from '~src/lib/board-claims';

interface Input {
    gameId: number;
    motivation: string;
}

export async function submitBoardClaimAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    if (!user?.username || !user.id) {
        return { error: 'Sign in to apply.' };
    }

    const motivation = input.motivation.trim();
    if (motivation.length < 10) {
        return {
            error: 'Tell the admins a little more (at least 10 characters).',
        };
    }
    if (motivation.length > 2000) {
        return { error: 'Keep your application under 2000 characters.' };
    }

    try {
        await submitBoardClaim(user.id, input.gameId, motivation);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
            return { error: 'You already have an open application here.' };
        }
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to submit application.' };
    }
}
```

- [ ] **Step 2: Write the CTA component**

```tsx
// app/(new-layout)/games-v2/[game]/claim/claim-cta.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { submitBoardClaimAction } from './actions/submit-claim.action';

export interface ClaimCtaState {
    gameId: number;
    hasModerators: boolean;
    myClaimPending: boolean;
}

interface Props {
    claim: ClaimCtaState;
    gameDisplay: string;
}

export function ClaimCta({ claim, gameDisplay }: Props) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(claim.myClaimPending);
    const [motivation, setMotivation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();

    if (pending) {
        return (
            <span className="btn btn-sm btn-outline-secondary disabled">
                Application pending
            </span>
        );
    }

    const label = claim.hasModerators
        ? 'Apply to join the mod team'
        : 'Apply to moderate';

    const submit = () => {
        startSubmitting(async () => {
            setError(null);
            const res = await submitBoardClaimAction({
                gameId: claim.gameId,
                motivation,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Application submitted.');
            setPending(true);
            setOpen(false);
        });
    };

    return (
        <>
            <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => setOpen(true)}
            >
                {label}
            </button>
            {open && (
                <div
                    className="modal d-block"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    role="dialog"
                    aria-modal
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {claim.hasModerators
                                        ? `Join the ${gameDisplay} mod team`
                                        : `Moderate ${gameDisplay}`}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    aria-label="Close"
                                    onClick={() => setOpen(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <p className="text-muted small">
                                    {claim.hasModerators
                                        ? 'Your application goes to this board’s moderators.'
                                        : 'This board has no moderators yet. Tell the site admins why you’re a good fit — your run history here is attached automatically.'}
                                </p>
                                <textarea
                                    className="form-control"
                                    rows={5}
                                    value={motivation}
                                    onChange={(e) =>
                                        setMotivation(e.target.value)
                                    }
                                    placeholder="Why do you want to moderate this board?"
                                />
                                {error && (
                                    <div className="alert alert-danger mt-2 mb-0 py-2">
                                        {error}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={
                                        isSubmitting ||
                                        motivation.trim().length < 10
                                    }
                                    onClick={submit}
                                >
                                    {isSubmitting
                                        ? 'Submitting…'
                                        : 'Submit application'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
```

- [ ] **Step 3: Load claim state in page.tsx and thread it**

In `app/(new-layout)/games-v2/[game]/page.tsx`, after `canManage`/`canManageRuns` are computed, add:

```typescript
import { getMyBoardClaim } from '~src/lib/board-claims';
import { listGameModerators } from '~src/lib/game-moderators';
import type { ClaimCtaState } from './claim/claim-cta';

// …inside GameV2Page, after canManage/canManageRuns:
let claim: ClaimCtaState | null = null;
if (sessionUsername && !canManage && !canManageRuns) {
    const [mods, myClaim] = await Promise.all([
        listGameModerators(data.game.id),
        getMyBoardClaim(session.id, data.game.id),
    ]);
    claim = {
        gameId: data.game.id,
        hasModerators: mods.length > 0,
        myClaimPending: myClaim?.status === 'pending',
    };
}
```

Pass `claim={claim}` to `<GamePage>`. In `game-page.tsx`, add `claim?: ClaimCtaState | null` to its props interface and pass it through to `<GameHeader claim={claim} …>` where the header is rendered (find the `GameHeader` usage in that file; add the prop).

- [ ] **Step 4: Render the CTA in game-header.tsx**

In `app/(new-layout)/games-v2/[game]/header/game-header.tsx`:

```tsx
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';

// Props gains:
//     claim?: ClaimCtaState | null;
// In the right-hand button group, before the Submit-a-run link:
{claim && sessionUsername && (
    <ClaimCta claim={claim} gameDisplay={game.display} />
)}
```

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/claim" "app/(new-layout)/games-v2/[game]/page.tsx" "app/(new-layout)/games-v2/[game]/game-page.tsx" "app/(new-layout)/games-v2/[game]/header/game-header.tsx"
git commit -m "feat(claims): apply-to-moderate CTA and application modal on game page"
```

---

### Task 7: Admin claim queue at /admin/board-claims

**Files:**
- Create: `app/(new-layout)/admin/board-claims/page.tsx`
- Create: `app/(new-layout)/admin/board-claims/board-claims-client.tsx`
- Create: `app/(new-layout)/admin/board-claims/actions/decide-claim.action.ts`

**Interfaces:**
- Consumes: `listPendingBoardClaims`, `approveBoardClaim`, `denyBoardClaim` (Task 2); `groupClaimsByBoard` (Task 2); `BoardModRole`.
- Produces: `approveClaimAction(claimId: number, role: BoardModRole): Promise<{ ok: true } | { error: string }>`; `denyClaimAction(claimId: number, reason: string): Promise<{ ok: true } | { error: string }>`.

- [ ] **Step 1: Write the actions**

```typescript
// app/(new-layout)/admin/board-claims/actions/decide-claim.action.ts
'use server';

import { revalidatePath } from 'next/cache';
import type { BoardModRole } from '../../../../../types/board-claims.types';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { approveBoardClaim, denyBoardClaim } from '~src/lib/board-claims';

const PAGE_PATH = '/admin/board-claims';

function isAdmin(roles: string[] | undefined): boolean {
    return roles?.includes('admin') ?? false;
}

export async function approveClaimAction(
    claimId: number,
    role: BoardModRole,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    if (!isAdmin(user?.roles)) return { error: 'Admin role required.' };
    try {
        await approveBoardClaim(user.id, claimId, role);
        revalidatePath(PAGE_PATH);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to approve application.' };
    }
}

export async function denyClaimAction(
    claimId: number,
    reason: string,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    if (!isAdmin(user?.roles)) return { error: 'Admin role required.' };
    try {
        await denyBoardClaim(user.id, claimId, reason.trim() || undefined);
        revalidatePath(PAGE_PATH);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to deny application.' };
    }
}
```

- [ ] **Step 2: Write the page**

```tsx
// app/(new-layout)/admin/board-claims/page.tsx
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { listPendingBoardClaims } from '~src/lib/board-claims';
import { groupClaimsByBoard } from '~src/lib/setup/group-claims';
import { BoardClaimsClient } from './board-claims-client';

export default async function BoardClaimsPage() {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        notFound();
    }

    const claims = await listPendingBoardClaims(session.id);
    const groups = groupClaimsByBoard(claims);

    return <BoardClaimsClient groups={groups} />;
}
```

- [ ] **Step 3: Write the client**

```tsx
// app/(new-layout)/admin/board-claims/board-claims-client.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../../../types/board-claims.types';
import type { BoardClaimGroup } from '~src/lib/setup/group-claims';
import { approveClaimAction, denyClaimAction } from './actions/decide-claim.action';

const STALE_DAYS = 7;

function isStale(createdAt: string): boolean {
    return (
        Date.now() - new Date(createdAt).getTime() >
        STALE_DAYS * 24 * 60 * 60 * 1000
    );
}

interface Props {
    groups: BoardClaimGroup[];
}

export function BoardClaimsClient({ groups }: Props) {
    const [isPending, startPending] = useTransition();

    const decide = (
        action: () => Promise<{ ok: true } | { error: string }>,
        successMsg: string,
    ) => {
        startPending(async () => {
            const res = await action();
            if ('error' in res) toast.error(res.error);
            else toast.success(successMsg);
        });
    };

    if (groups.length === 0) {
        return (
            <div className="container py-4">
                <h1>Board applications</h1>
                <p className="text-muted">No pending applications.</p>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <h1>Board applications</h1>
            <p className="text-muted">
                Approving grants a per-game moderator role and notifies the
                applicant with a link to the setup wizard.
            </p>
            {groups.map((g) => (
                <div key={g.gameId} className="card mb-3">
                    <div className="card-header d-flex align-items-center gap-2">
                        <Link href={`/games-v2/${g.gameSlug}`}>
                            <strong>{g.gameDisplay}</strong>
                        </Link>
                        {g.board && (
                            <span className="text-muted small">
                                {g.board.uniqueRunners} runners ·{' '}
                                {g.board.totalFinishedRuns} runs
                            </span>
                        )}
                        {g.requests.length > 1 && (
                            <span className="badge bg-info ms-auto">
                                {g.requests.length} rival applications
                            </span>
                        )}
                    </div>
                    <div className="card-body">
                        {g.requests.map((r) => (
                            <ClaimRow
                                key={r.id}
                                request={r}
                                disabled={isPending}
                                onDecide={decide}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ClaimRow({
    request,
    disabled,
    onDecide,
}: {
    request: BoardClaimRequest;
    disabled: boolean;
    onDecide: (
        action: () => Promise<{ ok: true } | { error: string }>,
        successMsg: string,
    ) => void;
}) {
    const [role, setRole] = useState<BoardModRole>('game-admin');
    const s = request.signals;

    return (
        <div className="border rounded p-3 mb-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
                <Link href={`/${request.username}`}>
                    <strong>{request.username}</strong>
                </Link>
                <span className="text-muted small">
                    {s.runsOnGame} runs on this game · {s.totalRuns} total ·
                    account since{' '}
                    {s.accountCreatedAt
                        ? new Date(s.accountCreatedAt).toLocaleDateString()
                        : 'unknown'}{' '}
                    · {s.priorApprovals} prior approvals · {s.priorDenials}{' '}
                    prior denials
                </span>
                {isStale(request.createdAt) && (
                    <span className="badge bg-warning text-dark">stale</span>
                )}
            </div>
            <p className="mb-2 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                {request.motivation}
            </p>
            <div className="d-flex align-items-center gap-2">
                <select
                    className="form-select form-select-sm w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-admin">
                        Board admin (full control)
                    </option>
                    <option value="game-mod">
                        Board moderator (verify + configure)
                    </option>
                </select>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={disabled}
                    onClick={() =>
                        onDecide(
                            () => approveClaimAction(request.id, role),
                            `Approved ${request.username}`,
                        )
                    }
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={disabled}
                    onClick={() => {
                        const reason =
                            window.prompt('Reason (optional):') ?? '';
                        onDecide(
                            () => denyClaimAction(request.id, reason),
                            `Denied ${request.username}`,
                        );
                    }}
                >
                    Deny
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/admin/board-claims"
git commit -m "feat(claims): admin approval queue with grouped rival applications"
```

---

### Task 8: Join-team applications card in the console attention pane

Requests against already-moderated boards route to that board's mods, not the global queue (spec decision). The card is standalone — it does NOT merge into the `AttentionItem` stream.

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/attention/mod-applications-card.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/moderation/attention/actions/decide-application.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx` (load game claims when viewer can edit moderators; pass down)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx` + `content-router.tsx` (thread `modApplications` prop; render card above the attention pane content)

**Interfaces:**
- Consumes: `listGameBoardClaims`, `approveBoardClaim`, `denyBoardClaim` (Task 2); `confirmPermission(user, 'edit', 'moderators', { game })`.
- Produces: `approveApplicationAction(input: { gameSlug: string; claimId: number; role: BoardModRole }): Promise<{ ok: true } | { error: string }>`; `denyApplicationAction(input: { gameSlug: string; claimId: number; reason: string }): Promise<{ ok: true } | { error: string }>`; `ModApplicationsCard` component with props `{ gameSlug: string; applications: BoardClaimRequest[] }`.

- [ ] **Step 1: Write the actions**

```typescript
// app/(new-layout)/games-v2/[game]/manage/moderation/attention/actions/decide-application.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import type { BoardModRole } from '../../../../../../../../types/board-claims.types';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { approveBoardClaim, denyBoardClaim } from '~src/lib/board-claims';
import { resolveGame } from '~src/lib/games-v1';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface ApproveInput {
    gameSlug: string;
    claimId: number;
    role: BoardModRole;
}

export async function approveApplicationAction(
    input: ApproveInput,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    try {
        await approveBoardClaim(user.id, input.claimId, input.role);
        const game = await resolveGame(input.gameSlug);
        if (game) revalidateTag(`game-mods:${game.id}`, 'minutes');
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to approve application.' };
    }
}

interface DenyInput {
    gameSlug: string;
    claimId: number;
    reason: string;
}

export async function denyApplicationAction(
    input: DenyInput,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    try {
        await denyBoardClaim(
            user.id,
            input.claimId,
            input.reason.trim() || undefined,
        );
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to deny application.' };
    }
}
```

Note: the CASL rule `board-admin → can('edit','moderators')` has no game-conditioned variant today (the role is global-ish). `confirmPermission(user, 'edit', 'moderators', { game })` passes for `admin` and `board-admin` role holders. The backend additionally authorizes per-game on the approve/deny endpoints (contract §1), so a board-admin of game X calling for game Y is rejected server-side.

- [ ] **Step 2: Write the card**

```tsx
// app/(new-layout)/games-v2/[game]/manage/moderation/attention/mod-applications-card.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import type {
    BoardClaimRequest,
    BoardModRole,
} from '../../../../../../../types/board-claims.types';
import {
    approveApplicationAction,
    denyApplicationAction,
} from './actions/decide-application.action';

interface Props {
    gameSlug: string;
    applications: BoardClaimRequest[];
}

export function ModApplicationsCard({ gameSlug, applications }: Props) {
    const router = useRouter();
    const [decided, setDecided] = useState<Set<number>>(new Set());
    const [isPending, startPending] = useTransition();

    const remaining = applications.filter((a) => !decided.has(a.id));
    if (remaining.length === 0) return null;

    const decide = (
        id: number,
        action: () => Promise<{ ok: true } | { error: string }>,
        msg: string,
    ) => {
        startPending(async () => {
            const res = await action();
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(msg);
            setDecided((prev) => new Set(prev).add(id));
            router.refresh();
        });
    };

    return (
        <div className="card mb-3 border-info">
            <div className="card-header">
                <strong>Moderator applications</strong>{' '}
                <span className="text-muted small">
                    {remaining.length} pending
                </span>
            </div>
            <div className="card-body">
                {remaining.map((r) => (
                    <ApplicationRow
                        key={r.id}
                        request={r}
                        disabled={isPending}
                        onApprove={(role) =>
                            decide(
                                r.id,
                                () =>
                                    approveApplicationAction({
                                        gameSlug,
                                        claimId: r.id,
                                        role,
                                    }),
                                `Added ${r.username} to the mod team`,
                            )
                        }
                        onDeny={(reason) =>
                            decide(
                                r.id,
                                () =>
                                    denyApplicationAction({
                                        gameSlug,
                                        claimId: r.id,
                                        reason,
                                    }),
                                `Denied ${r.username}`,
                            )
                        }
                    />
                ))}
            </div>
        </div>
    );
}

function ApplicationRow({
    request,
    disabled,
    onApprove,
    onDeny,
}: {
    request: BoardClaimRequest;
    disabled: boolean;
    onApprove: (role: BoardModRole) => void;
    onDeny: (reason: string) => void;
}) {
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const s = request.signals;
    return (
        <div className="border rounded p-2 mb-2">
            <div className="d-flex gap-2 align-items-center flex-wrap">
                <strong>{request.username}</strong>
                <span className="text-muted small">
                    {s.runsOnGame} runs on this game · {s.totalRuns} total
                </span>
            </div>
            <p className="mb-2 mt-1 small" style={{ whiteSpace: 'pre-wrap' }}>
                {request.motivation}
            </p>
            <div className="d-flex gap-2 align-items-center">
                <select
                    className="form-select form-select-sm w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    disabled={disabled}
                    onClick={() => onApprove(role)}
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={disabled}
                    onClick={() =>
                        onDeny(window.prompt('Reason (optional):') ?? '')
                    }
                >
                    Deny
                </button>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Load and thread the applications**

In `manage/page.tsx`: after the existing inbox loads, when the viewer can edit moderators, load claims:

```typescript
import { listGameBoardClaims } from '~src/lib/board-claims';
import type { BoardClaimRequest } from '../../../../../types/board-claims.types';

// after ability/nav-flag computation (viewer = session):
let modApplications: BoardClaimRequest[] = [];
const canEditMods = ability.can(
    'edit',
    caslSubject('moderators', { game: resolvedGame.name }),
);
if (canEditMods) {
    modApplications = await listGameBoardClaims(session.id, resolvedGame.id);
}
```

(Adapt local variable names to what `manage/page.tsx` actually calls its resolved game and ability — it already computes NavFlags; reuse those bindings.) Pass `modApplications` into `<ConsoleShell>`. In `console-shell.tsx`, accept `modApplications?: BoardClaimRequest[]` and pass to `<ContentRouter>`; in `content-router.tsx`, in the `attention` case, render above the existing pane:

```tsx
{modApplications && modApplications.length > 0 && (
    <ModApplicationsCard
        gameSlug={gameSlug}
        applications={modApplications}
    />
)}
```

(`gameSlug` is already available in the router's props; match the existing prop name.)

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(claims): join-team applications surface in console attention pane"
```

---

### Task 9: Wizard route, shell, stepper, and welcome step

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/page.tsx`
- Create: `app/(new-layout)/games-v2/[game]/setup/types.ts`
- Create: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx`
- Create: `app/(new-layout)/games-v2/[game]/setup/setup.module.scss`
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-welcome.tsx`

**Interfaces:**
- Consumes: `resolveGame`, `resolveCategory`, `getQuickStats` (games-v1); `listGameVariables` (leaderboard-variables); `listPolicies(sessionId, gameId)` (moderation/policies); `listGameModerators` (Task 3); `getGameIdentifiers`, `getGameMetadata` (game-mgmt); `computeCompleteness`, `categoryFactsFromResolved`, `SETUP_STEP_ORDER`, `SetupStepId` (Task 4); `getLeaderboard` (leaderboards-v1).
- Produces:
  - `WizardData` (in `setup/types.ts`): `{ game: ResolvedGame; stats: QuickStats; categories: ResolvedCategory[]; groups: ResolvedGroup[]; variables: VariableRow[]; policies: BoardPolicyRow[]; moderators: GameModerator[]; identifiers: GameIdentifiers; metadata: GameMetadata; completeness: BoardCompleteness; wrTimes: Record<number, number | null> }`
  - `StepProps` (in `setup/types.ts`): `{ data: WizardData; onAdvance: () => void; onBack: () => void }` — every step component in Tasks 11–17 uses exactly this signature.
  - `WizardShell` client component with props `{ data: WizardData; initialStep: SetupStepId }`.

- [ ] **Step 1: Write setup/types.ts**

```typescript
// app/(new-layout)/games-v2/[game]/setup/types.ts
import type { GameModerator } from '../../../../../types/board-claims.types';
import type {
    QuickStats,
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../types/moderation.types';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';
import type { BoardCompleteness } from '~src/lib/setup/completeness';

export interface WizardData {
    game: ResolvedGame;
    stats: QuickStats;
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    moderators: GameModerator[];
    identifiers: GameIdentifiers;
    metadata: GameMetadata;
    completeness: BoardCompleteness;
    /** categoryId → fastest verified time (ms) in its primary timing, or null. */
    wrTimes: Record<number, number | null>;
}

export interface StepProps {
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}
```

- [ ] **Step 2: Write the server page**

```tsx
// app/(new-layout)/games-v2/[game]/setup/page.tsx
import { subject as caslSubject } from '@casl/ability';
import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getGameIdentifiers, getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { getQuickStats, resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getLeaderboard } from '~src/lib/leaderboards-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { listPolicies } from '~src/lib/moderation/policies';
import {
    categoryFactsFromResolved,
    computeCompleteness,
    SETUP_STEP_ORDER,
    type SetupStepId,
} from '~src/lib/setup/completeness';
import { defineAbilityFor } from '~src/rbac/ability';
import { safeDecodeURI } from '~src/utils/uri';
import type { WizardData } from './types';
import { WizardShell } from './wizard-shell';

export const maxDuration = 60;

interface PageProps {
    params: Promise<{ game: string }>;
    searchParams: Promise<{ step?: string }>;
}

const WR_FETCH_CAP = 10;

export default async function SetupPage({ params, searchParams }: PageProps) {
    const { game: gameParam } = await params;
    const { step } = await searchParams;
    if (!gameParam) notFound();

    const session = await getSession();
    const game = await resolveGame(safeDecodeURI(gameParam));
    if (!game) notFound();

    const ability = defineAbilityFor(session);
    const canConfigure = ability.can(
        'edit',
        caslSubject('category-settings', { game: game.name }),
    );
    if (!canConfigure) notFound();

    const [stats, catData, variables, policies, moderators, identifiers, metadata] =
        await Promise.all([
            getQuickStats(game.id),
            resolveCategory(game.id),
            listGameVariables(game.id),
            listPolicies(session.id, game.id),
            listGameModerators(game.id),
            getGameIdentifiers(game.id),
            getGameMetadata(game.id),
        ]);

    // Fastest verified time per active category (for min-time suggestions).
    const activeCats = catData.categories
        .filter((c) => c.active)
        .slice(0, WR_FETCH_CAP);
    const wrTimes: Record<number, number | null> = {};
    await Promise.all(
        activeCats.map(async (c) => {
            try {
                const lb = await getLeaderboard({
                    gameSlug: game.name,
                    categorySlug: c.name,
                    timing: c.primaryTiming,
                    verified: true,
                    pageSize: 1,
                });
                wrTimes[c.id] =
                    'entries' in lb ? (lb.entries[0]?.time ?? null) : null;
            } catch {
                wrTimes[c.id] = null;
            }
        }),
    );

    const completeness = computeCompleteness({
        categories: categoryFactsFromResolved(catData.categories),
        variableCount: variables.length,
        policyCount: policies.length,
        requireVideoAnywhere: catData.categories.some(
            (c) => c.active && c.requireVideo,
        ),
        slug: identifiers.slug,
        abbreviation: identifiers.abbreviation,
        moderatorCount: moderators.length,
        configured: metadata.configured,
    });

    const data: WizardData = {
        game,
        stats,
        categories: catData.categories,
        groups: catData.groups,
        variables,
        policies,
        moderators,
        identifiers,
        metadata,
        completeness,
        wrTimes,
    };

    const initialStep: SetupStepId =
        step && SETUP_STEP_ORDER.includes(step as SetupStepId)
            ? (step as SetupStepId)
            : (completeness.firstIncomplete ?? 'welcome');

    return <WizardShell data={data} initialStep={initialStep} />;
}
```

Note: verify `getLeaderboard`'s ok-result shape at implementation time — it returns `LeaderboardResultOk | LeaderboardResultInvalidCombination`; the ok variant carries `entries` (see `src/lib/leaderboards-v1.ts:75-101`). Adjust the `'entries' in lb` narrowing to the actual discriminant if it differs.

- [ ] **Step 3: Write setup.module.scss**

```scss
// app/(new-layout)/games-v2/[game]/setup/setup.module.scss
.page {
    max-width: 64rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
}

.stepper {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin: 1rem 0 1.5rem;
}

.stepDot {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--bs-secondary-color, #888);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
}

.stepNum {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 1px solid currentColor;
    font-size: 0.75rem;
}

.stepCurrent {
    color: var(--bs-primary, #0d6efd);
    font-weight: 600;
}

.stepDone {
    color: var(--bs-success, #198754);
}

.layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 16rem;
    gap: 1.5rem;
}

@media (max-width: 900px) {
    .layout {
        grid-template-columns: minmax(0, 1fr);
    }
}

.rail {
    font-size: 0.85rem;
}

.railCard {
    position: sticky;
    top: 1rem;
    border: 1px solid var(--bs-border-color, #dee2e6);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
}

.navBar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--bs-border-color, #dee2e6);
}

.spacer {
    flex: 1;
}
```

- [ ] **Step 4: Write the shell**

```tsx
// app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SetupStepId } from '~src/lib/setup/completeness';
import type { WizardData } from './types';
import styles from './setup.module.scss';
import { StepWelcome } from './steps/step-welcome';

const STEPS: { id: SetupStepId; label: string; skippable: boolean }[] = [
    { id: 'welcome', label: 'Welcome', skippable: false },
    { id: 'details', label: 'Details', skippable: true },
    { id: 'categories', label: 'Categories', skippable: true },
    { id: 'timing', label: 'Timing', skippable: true },
    { id: 'variables', label: 'Variables', skippable: true },
    { id: 'rules', label: 'Rules', skippable: true },
    { id: 'standards', label: 'Standards', skippable: true },
    { id: 'finish', label: 'Mods & finish', skippable: false },
];

interface Props {
    data: WizardData;
    initialStep: SetupStepId;
}

export function WizardShell({ data, initialStep }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<SetupStepId>(initialStep);
    const stepIndex = STEPS.findIndex((s) => s.id === step);

    const goTo = (id: SetupStepId) => {
        setStep(id);
        // Keep the URL shareable/resumable and re-read server state so a step
        // always sees writes committed by previous steps (or by co-mods).
        router.replace(`/games-v2/${data.game.name}/setup?step=${id}`, {
            scroll: true,
        });
        router.refresh();
    };

    const onAdvance = () => {
        const next = STEPS[stepIndex + 1];
        if (next) goTo(next.id);
    };
    const onBack = () => {
        const prev = STEPS[stepIndex - 1];
        if (prev) goTo(prev.id);
    };

    const statusFor = (id: SetupStepId) =>
        data.completeness.steps.find((s) => s.step === id);

    return (
        <div className={styles.page}>
            <header className="d-flex align-items-center gap-3">
                {data.game.image && (
                    <img
                        src={data.game.image}
                        alt={data.game.display}
                        width={36}
                        height={48}
                        className="rounded"
                        style={{ aspectRatio: '3 / 4' }}
                    />
                )}
                <div>
                    <h1 className="mb-0 h3">Set up {data.game.display}</h1>
                    <small className="text-muted">
                        Every step saves as you go — you can leave and come
                        back anytime.
                    </small>
                </div>
            </header>

            <nav className={styles.stepper} aria-label="Setup steps">
                {STEPS.map((s, i) => (
                    <button
                        type="button"
                        key={s.id}
                        className={`${styles.stepDot} ${
                            i === stepIndex
                                ? styles.stepCurrent
                                : statusFor(s.id)?.status === 'done'
                                  ? styles.stepDone
                                  : ''
                        }`}
                        onClick={() => goTo(s.id)}
                    >
                        <span className={styles.stepNum}>{i + 1}</span>
                        {s.label}
                    </button>
                ))}
            </nav>

            <div className={styles.layout}>
                <main>
                    <CurrentStep
                        step={step}
                        data={data}
                        onAdvance={onAdvance}
                        onBack={onBack}
                    />
                    <div className={styles.navBar}>
                        {stepIndex > 0 && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={onBack}
                            >
                                Back
                            </button>
                        )}
                        <span className={styles.spacer} />
                        {STEPS[stepIndex].skippable && (
                            <button
                                type="button"
                                className="btn btn-link btn-sm"
                                onClick={onAdvance}
                            >
                                Skip this step
                            </button>
                        )}
                    </div>
                </main>
                <aside className={styles.rail}>
                    <div className={styles.railCard}>
                        <strong>Your board so far</strong>
                        <ul className="list-unstyled mb-0 mt-2">
                            {data.completeness.steps.map((s) => (
                                <li key={s.step} className="mb-1">
                                    {s.status === 'done' ? '✓ ' : '· '}
                                    <span className="text-muted">
                                        {s.summary}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function CurrentStep({
    step,
    data,
    onAdvance,
    onBack,
}: {
    step: SetupStepId;
    data: WizardData;
    onAdvance: () => void;
    onBack: () => void;
}) {
    switch (step) {
        case 'welcome':
            return (
                <StepWelcome
                    data={data}
                    onAdvance={onAdvance}
                    onBack={onBack}
                />
            );
        default:
            // Placeholder until each step's task lands; replaced task-by-task.
            return (
                <p className="text-muted">
                    This step is under construction. Use Skip to continue.
                </p>
            );
    }
}
```

(The `default` branch shrinks as Tasks 11–17 each add their `case`.)

- [ ] **Step 5: Write the welcome step**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-welcome.tsx
'use client';

import type { StepProps } from '../types';

export function StepWelcome({ data, onAdvance }: StepProps) {
    const empty = data.categories.length === 0;
    return (
        <section>
            <h2 className="h4">Welcome, moderator</h2>
            {empty ? (
                <p>
                    No runs have been ingested for this board yet — you’ll be
                    setting it up from scratch. Categories appear automatically
                    as runs are submitted or ingested from timers.
                </p>
            ) : (
                <>
                    <p>
                        Your board already exists — runners have been racing on
                        it. Your job is to curate it, not build it from
                        nothing.
                    </p>
                    <div className="d-flex gap-3 flex-wrap my-3">
                        <StatTile
                            value={data.categories.length}
                            label="categories discovered"
                        />
                        <StatTile
                            value={data.stats.uniqueRunners}
                            label="unique runners"
                        />
                        <StatTile
                            value={data.stats.totalFinishedAttemptCount}
                            label="finished runs"
                        />
                    </div>
                </>
            )}
            <p className="mb-1">The next steps walk you through:</p>
            <ol>
                <li>Game details — cover, platforms, links</li>
                <li>Categories — choose what shows on the board</li>
                <li>Timing — how times display and rank</li>
                <li>Variables — subcategories and filters</li>
                <li>Rules — per-category rules text</li>
                <li>Standards — video proof and minimum times</li>
                <li>Mod team — invite co-moderators, then go live</li>
            </ol>
            <p className="text-muted small">
                These numbers come from runs auto-ingested from timers like
                LiveSplit — nothing was submitted manually.
            </p>
            <button
                type="button"
                className="btn btn-primary"
                onClick={onAdvance}
            >
                Let’s set it up
            </button>
        </section>
    );
}

function StatTile({ value, label }: { value: number; label: string }) {
    return (
        <div className="border rounded p-3 text-center" style={{ minWidth: '9rem' }}>
            <div className="h3 mb-0">{value.toLocaleString()}</div>
            <small className="text-muted">{label}</small>
        </div>
    );
}
```

- [ ] **Step 6: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): wizard route, stepper shell, welcome step"
```

---

### Task 10: Setup checklist card in the console

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/console/setup-checklist-card.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/page.tsx` (compute completeness, pass down)
- Modify: `app/(new-layout)/games-v2/[game]/manage/console/console-shell.tsx` (render card above routed content)

**Interfaces:**
- Consumes: `computeCompleteness`, `categoryFactsFromResolved`, `BoardCompleteness` (Task 4); `getGameMetadata` (Task 3); `listGameVariables`, `listPolicies`, `listGameModerators`, `getGameIdentifiers` (existing/Task 3); `resolveCategory`.
- Produces: `SetupChecklistCard` with props `{ gameSlug: string; completeness: BoardCompleteness }`; `ConsoleShell` gains optional prop `setupCompleteness?: BoardCompleteness | null`.

- [ ] **Step 1: Write the card**

```tsx
// app/(new-layout)/games-v2/[game]/manage/console/setup-checklist-card.tsx
import Link from '~src/components/link';
import type { BoardCompleteness } from '~src/lib/setup/completeness';

interface Props {
    gameSlug: string;
    completeness: BoardCompleteness;
}

export function SetupChecklistCard({ gameSlug, completeness }: Props) {
    const open = completeness.steps.filter((s) => s.status !== 'done');
    if (open.length === 0) return null;

    return (
        <div className="card mb-3 border-primary">
            <div className="card-body d-flex align-items-center gap-3 flex-wrap">
                <div>
                    <strong>
                        Finish setup — {completeness.doneCount} of{' '}
                        {completeness.totalCount} done
                    </strong>
                    <div className="text-muted small">
                        {open.map((s) => s.summary).join(' · ')}
                    </div>
                </div>
                <Link
                    href={`/games-v2/${gameSlug}/setup${
                        completeness.firstIncomplete
                            ? `?step=${completeness.firstIncomplete}`
                            : ''
                    }`}
                    className="btn btn-sm btn-primary ms-auto"
                >
                    {completeness.doneCount <= 1
                        ? 'Set up this board'
                        : 'Finish setup'}
                </Link>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Compute completeness in manage/page.tsx**

`manage/page.tsx` already loads categories/identifiers. Add the missing inputs in its existing `Promise.all` (or a new one alongside):

```typescript
import { getGameMetadata } from '~src/lib/game-mgmt';
import { listGameModerators } from '~src/lib/game-moderators';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { listPolicies } from '~src/lib/moderation/policies';
import {
    categoryFactsFromResolved,
    computeCompleteness,
} from '~src/lib/setup/completeness';

// alongside the page's existing loads (reuse its resolved game + categories):
const [variables, policies, moderators, metadata] = await Promise.all([
    listGameVariables(game.id),
    listPolicies(session.id, game.id),
    listGameModerators(game.id),
    getGameMetadata(game.id),
]);
const setupCompleteness = computeCompleteness({
    categories: categoryFactsFromResolved(categories),
    variableCount: variables.length,
    policyCount: policies.length,
    requireVideoAnywhere: categories.some((c) => c.active && c.requireVideo),
    slug: identifiers.slug,
    abbreviation: identifiers.abbreviation,
    moderatorCount: moderators.length,
    configured: metadata.configured,
});
```

(Bind to the page's actual local names for game/categories/identifiers/session.) Pass `setupCompleteness={setupCompleteness}` to `<ConsoleShell>`. Only compute/pass when the viewer `canConfigure` (the card links to the wizard, which is configure-gated).

- [ ] **Step 3: Render in console-shell.tsx**

Add `setupCompleteness?: BoardCompleteness | null` to ConsoleShell's props; render immediately above the routed pane content (inside the main content area, before `<ContentRouter …>`):

```tsx
{setupCompleteness && (
    <SetupChecklistCard
        gameSlug={gameSlug}
        completeness={setupCompleteness}
    />
)}
```

(`gameSlug` — reuse the shell's existing game identifier prop.)

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/manage"
git commit -m "feat(setup): finish-setup checklist card in console"
```

---

### Task 11: Step 2 — Game details

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'details'`)

**Interfaces:**
- Consumes: `StepProps` (Task 9); `updateIdentifiersAction` (existing, `manage/identifiers/actions/update-identifiers.action.ts`); `updateGame`, `UpdateGameBody` (Task 3).
- Produces: `updateGameMetadataAction(input: { gameSlug: string; gameId: number; coverUrl?: string | null; platforms?: string[]; releaseYear?: number | null; discordUrl?: string | null }): Promise<{ result: { updated: boolean } } | { error: string }>`.

- [ ] **Step 1: Write the metadata action**

```typescript
// app/(new-layout)/games-v2/[game]/setup/actions/update-game-metadata.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { type UpdateGameBody, updateGame } from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    coverUrl?: string | null;
    platforms?: string[];
    releaseYear?: number | null;
    discordUrl?: string | null;
}

export async function updateGameMetadataAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit game details.' };
    }

    if (
        input.discordUrl &&
        !/^https:\/\/(www\.)?discord\.(gg|com)\//.test(input.discordUrl)
    ) {
        return { error: 'Discord link must be a discord.gg invite URL.' };
    }
    if (
        input.releaseYear !== undefined &&
        input.releaseYear !== null &&
        (!Number.isInteger(input.releaseYear) ||
            input.releaseYear < 1950 ||
            input.releaseYear > 2100)
    ) {
        return { error: 'Release year must be a valid year.' };
    }

    const body: UpdateGameBody = {};
    if (input.coverUrl !== undefined) body.coverUrl = input.coverUrl;
    if (input.platforms !== undefined) body.platforms = input.platforms;
    if (input.releaseYear !== undefined) body.releaseYear = input.releaseYear;
    if (input.discordUrl !== undefined) body.discordUrl = input.discordUrl;

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateGame(user.id, input.gameId, body);
        revalidateTag(`game-meta:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update game details.' };
    }
}
```

- [ ] **Step 2: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-details.tsx
'use client';

import { useState, useTransition } from 'react';
import { updateIdentifiersAction } from '../../manage/identifiers/actions/update-identifiers.action';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import type { StepProps } from '../types';

export function StepDetails({ data, onAdvance }: StepProps) {
    const [slug, setSlug] = useState(data.identifiers.slug ?? '');
    const [abbreviation, setAbbreviation] = useState(
        data.identifiers.abbreviation ?? '',
    );
    const [coverUrl, setCoverUrl] = useState(data.metadata.coverUrl ?? '');
    const [platformsText, setPlatformsText] = useState(
        data.metadata.platforms.join(', '),
    );
    const [releaseYear, setReleaseYear] = useState(
        data.metadata.releaseYear?.toString() ?? '',
    );
    const [discordUrl, setDiscordUrl] = useState(
        data.metadata.discordUrl ?? '',
    );
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const save = () => {
        startSaving(async () => {
            setError(null);
            const identRes = await updateIdentifiersAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                slug: slug.trim() || null,
                abbreviation: abbreviation.trim() || null,
            });
            if ('error' in identRes) {
                setError(identRes.error);
                return;
            }
            const metaRes = await updateGameMetadataAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                coverUrl: coverUrl.trim() || null,
                platforms: platformsText
                    .split(',')
                    .map((p) => p.trim())
                    .filter(Boolean),
                releaseYear: releaseYear ? Number(releaseYear) : null,
                discordUrl: discordUrl.trim() || null,
            });
            if ('error' in metaRes) {
                setError(metaRes.error);
                return;
            }
            onAdvance();
        });
    };

    const preview = coverUrl.trim() || data.game.image;

    return (
        <section>
            <h2 className="h4">Game details</h2>
            <p className="text-muted">
                Everything here is pre-filled from IGDB where we have it — fix
                what’s wrong, skip what’s fine.
            </p>
            <div className="row g-4">
                <div className="col-md-6">
                    <label className="form-label" htmlFor="cover-url">
                        Cover image URL
                    </label>
                    <div className="d-flex gap-3">
                        {preview && (
                            <img
                                src={preview}
                                alt="Cover preview"
                                width={72}
                                height={96}
                                className="rounded"
                                style={{ aspectRatio: '3 / 4' }}
                            />
                        )}
                        <input
                            id="cover-url"
                            className="form-control"
                            value={coverUrl}
                            onChange={(e) => setCoverUrl(e.target.value)}
                            placeholder="https://… (leave empty for IGDB art)"
                        />
                    </div>
                    <label className="form-label mt-3" htmlFor="release-year">
                        Release year
                    </label>
                    <input
                        id="release-year"
                        className="form-control"
                        inputMode="numeric"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value)}
                    />
                    <label className="form-label mt-3" htmlFor="platforms">
                        Platforms (comma-separated)
                    </label>
                    <input
                        id="platforms"
                        className="form-control"
                        value={platformsText}
                        onChange={(e) => setPlatformsText(e.target.value)}
                        placeholder="PC, Switch, PS5"
                    />
                </div>
                <div className="col-md-6">
                    <label className="form-label" htmlFor="slug">
                        URL slug
                    </label>
                    <input
                        id="slug"
                        className="form-control"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                    />
                    <label className="form-label mt-3" htmlFor="abbreviation">
                        Abbreviation
                    </label>
                    <input
                        id="abbreviation"
                        className="form-control"
                        value={abbreviation}
                        onChange={(e) => setAbbreviation(e.target.value)}
                        placeholder="sm64"
                    />
                    <label className="form-label mt-3" htmlFor="discord">
                        Discord invite
                    </label>
                    <input
                        id="discord"
                        className="form-control"
                        value={discordUrl}
                        onChange={(e) => setDiscordUrl(e.target.value)}
                        placeholder="https://discord.gg/…"
                    />
                </div>
            </div>
            {error && <div className="alert alert-danger mt-3">{error}</div>}
            <button
                type="button"
                className="btn btn-primary mt-3"
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
```

- [ ] **Step 3: Register in the shell**

In `wizard-shell.tsx`, import `StepDetails` and add before `default`:

```tsx
case 'details':
    return (
        <StepDetails data={data} onAdvance={onAdvance} onBack={onBack} />
    );
```

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): game details step"
```

---

### Task 12: Step 3 — Categories (flagship)

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/actions/curate-category.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/setup/actions/create-group.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'categories'`)

**Interfaces:**
- Consumes: `StepProps`; `updateCategory`, `createGroup` from `~src/lib/category-mgmt`; `activityShare` (Task 5).
- Produces: `curateCategoryAction(input: { gameSlug: string; gameId: number; categoryId: number; active?: boolean; isMain?: boolean; groupId?: number | null }): Promise<{ result: { updated: boolean } } | { error: string }>`; `createGroupAction(input: { gameSlug: string; gameId: number; name: string }): Promise<{ result: { id: number } } | { error: string }>`.

- [ ] **Step 1: Write the curate action**

```typescript
// app/(new-layout)/games-v2/[game]/setup/actions/curate-category.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type UpdateCategoryBody,
    updateCategory,
} from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    active?: boolean;
    isMain?: boolean;
    groupId?: number | null;
}

export async function curateCategoryAction(
    input: Input,
): Promise<{ result: { updated: boolean } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit categories.' };
    }

    const body: UpdateCategoryBody = {};
    if (input.active !== undefined) body.active = input.active;
    if (input.isMain !== undefined) body.isMain = input.isMain;
    if (input.groupId !== undefined) body.groupId = input.groupId;

    if (Object.keys(body).length === 0) {
        return { result: { updated: false } };
    }

    try {
        const result = await updateCategory(
            user.id,
            input.gameId,
            input.categoryId,
            body,
        );
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update category.' };
    }
}
```

- [ ] **Step 2: Write the group action**

```typescript
// app/(new-layout)/games-v2/[game]/setup/actions/create-group.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { createGroup } from '~src/lib/category-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    name: string;
}

export async function createGroupAction(
    input: Input,
): Promise<{ result: { id: number } } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit categories.' };
    }

    const name = input.name.trim();
    if (!name) return { error: 'Group name is required.' };

    try {
        const result = await createGroup(user.id, input.gameId, { name });
        revalidateTag(`game-cats:${input.gameId}`, 'minutes');
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create group.' };
    }
}
```

- [ ] **Step 3: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-categories.tsx
'use client';

import { useState, useTransition } from 'react';
import Link from '~src/components/link';
import { activityShare } from '~src/lib/setup/suggestions';
import { createGroupAction } from '../actions/create-group.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import type { StepProps } from '../types';

interface RowState {
    id: number;
    display: string;
    active: boolean;
    isMain: boolean;
    groupId: number | null;
    uniqueRunners: number;
    totalFinishedAttemptCount: number;
    error: string | null;
}

export function StepCategories({ data, onAdvance }: StepProps) {
    // Pre-check: resolveCategory already filters low-activity categories, so
    // everything we see is worth showing; keep current flags as the baseline
    // and default the top category to main when none is set.
    const anyMain = data.categories.some((c) => c.isMain && c.active);
    const [rows, setRows] = useState<RowState[]>(
        data.categories.map((c, i) => ({
            id: c.id,
            display: c.display,
            active: c.active,
            isMain: c.isMain || (!anyMain && i === 0),
            groupId: c.groupId,
            uniqueRunners: c.uniqueRunners,
            totalFinishedAttemptCount: c.totalFinishedAttemptCount,
            error: null,
        })),
    );
    const [groups, setGroups] = useState(data.groups);
    const [groupName, setGroupName] = useState('');
    const [showGroups, setShowGroups] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    if (data.categories.length === 0) {
        return (
            <section>
                <h2 className="h4">Categories</h2>
                <p>
                    Categories appear automatically when runs are submitted or
                    ingested from timers — there’s nothing to curate yet. Once
                    the first runs arrive, come back here (or use the console)
                    to choose what shows on the board.
                </p>
                <Link href={`/games-v2/${data.game.name}/submit`}>
                    Point runners at the submission form →
                </Link>
                <div>
                    <button
                        type="button"
                        className="btn btn-primary mt-3"
                        onClick={onAdvance}
                    >
                        Continue
                    </button>
                </div>
            </section>
        );
    }

    const activeCount = rows.filter((r) => r.active).length;
    const share = activityShare(rows);
    const mainOk = rows.some((r) => r.active && r.isMain);

    const setActive = (id: number, active: boolean) =>
        setRows((rs) =>
            rs.map((r) =>
                r.id === id
                    ? { ...r, active, isMain: active ? r.isMain : false }
                    : r,
            ),
        );

    const setMain = (id: number) =>
        setRows((rs) => rs.map((r) => ({ ...r, isMain: r.id === id })));

    const setGroup = (id: number, groupId: number | null) =>
        setRows((rs) =>
            rs.map((r) => (r.id === id ? { ...r, groupId } : r)),
        );

    const addGroup = () => {
        startSaving(async () => {
            const res = await createGroupAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                name: groupName,
            });
            if ('error' in res) return;
            setGroups((gs) => [
                ...gs,
                { id: res.result.id, name: groupName.trim(), sortOrder: 99 },
            ]);
            setGroupName('');
        });
    };

    const save = () => {
        startSaving(async () => {
            // Sequential batch: report per-row failures, retry just those.
            const changed = rows.filter((r) => {
                const orig = data.categories.find((c) => c.id === r.id);
                return (
                    orig &&
                    (orig.active !== r.active ||
                        orig.isMain !== r.isMain ||
                        orig.groupId !== r.groupId)
                );
            });
            let failures = 0;
            for (let i = 0; i < changed.length; i++) {
                const r = changed[i];
                setProgress(`Saving ${i + 1} / ${changed.length}…`);
                const res = await curateCategoryAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    active: r.active,
                    isMain: r.isMain,
                    groupId: r.groupId,
                });
                if ('error' in res) {
                    failures++;
                    setRows((rs) =>
                        rs.map((row) =>
                            row.id === r.id
                                ? { ...row, error: res.error }
                                : row,
                        ),
                    );
                }
            }
            setProgress(null);
            if (failures === 0) onAdvance();
        });
    };

    return (
        <section>
            <h2 className="h4">Categories</h2>
            <div className="alert alert-info py-2">
                These categories were discovered from ingested runs. The ones
                checked below hold {share}% of this board’s finished runs.
            </div>
            <table className="table align-middle">
                <thead>
                    <tr>
                        <th>Show</th>
                        <th>Category</th>
                        <th className="text-end">Runners</th>
                        <th className="text-end">Runs</th>
                        <th>Main</th>
                        {showGroups && <th>Group</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr
                            key={r.id}
                            className={r.active ? '' : 'text-muted'}
                        >
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={r.active}
                                    onChange={(e) =>
                                        setActive(r.id, e.target.checked)
                                    }
                                />
                            </td>
                            <td>
                                {r.display}
                                {r.error && (
                                    <div className="text-danger small">
                                        {r.error}
                                    </div>
                                )}
                            </td>
                            <td className="text-end">
                                {r.uniqueRunners.toLocaleString()}
                            </td>
                            <td className="text-end">
                                {r.totalFinishedAttemptCount.toLocaleString()}
                            </td>
                            <td>
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    name="main-category"
                                    checked={r.isMain}
                                    disabled={!r.active}
                                    onChange={() => setMain(r.id)}
                                />
                            </td>
                            {showGroups && (
                                <td>
                                    <select
                                        className="form-select form-select-sm"
                                        value={r.groupId ?? ''}
                                        onChange={(e) =>
                                            setGroup(
                                                r.id,
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            )
                                        }
                                    >
                                        <option value="">Ungrouped</option>
                                        {groups.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="text-muted small mb-2">
                {activeCount} shown / {rows.length - activeCount} hidden
            </div>

            <button
                type="button"
                className="btn btn-link btn-sm px-0"
                onClick={() => setShowGroups((v) => !v)}
            >
                {showGroups ? 'Hide groups' : 'Organize into groups (optional)'}
            </button>
            {showGroups && (
                <div className="d-flex gap-2 my-2">
                    <input
                        className="form-control form-control-sm w-auto"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="New group name (e.g. Category Extensions)"
                    />
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={isSaving || !groupName.trim()}
                        onClick={addGroup}
                    >
                        Add group
                    </button>
                </div>
            )}

            {!mainOk && (
                <div className="alert alert-warning py-2 mt-2">
                    Pick a main category — it’s the board visitors land on.
                </div>
            )}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className="btn btn-primary mt-2"
                disabled={isSaving || activeCount === 0 || !mainOk}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
```

- [ ] **Step 4: Register in the shell** (add `case 'categories':` like Task 11 Step 3, importing `StepCategories`)

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): categories curation step"
```

---

### Task 13: Step 4 — Timing

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-timing.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'timing'`)

**Interfaces:**
- Consumes: `StepProps`; `updateTimingSettingsAction` (existing: input `{ gameSlug, gameId, categoryId, primaryTiming?, hideRealTime?, hideGameTime? }`); `updateCategorySettingsAction` (existing; used for `showMilliseconds`). Note `ResolvedCategory.primaryTiming` is `'rt' | 'gt'` but the action takes `'realtime' | 'gametime'` — map explicitly.

- [ ] **Step 1: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-timing.tsx
'use client';

import { useState, useTransition } from 'react';
import type { PrimaryTiming } from '~src/lib/category-mgmt';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { updateTimingSettingsAction } from '../../manage/timing/actions/update-timing-settings.action';
import type { StepProps } from '../types';

interface RowState {
    id: number;
    display: string;
    primaryTiming: PrimaryTiming;
    hideRealTime: boolean;
    hideGameTime: boolean;
    showMilliseconds: boolean;
    error: string | null;
}

function toPrimaryTiming(short: 'rt' | 'gt'): PrimaryTiming {
    return short === 'gt' ? 'gametime' : 'realtime';
}

export function StepTiming({ data, onAdvance }: StepProps) {
    const activeCategories = data.categories.filter((c) => c.active);
    const [rows, setRows] = useState<RowState[]>(
        activeCategories.map((c) => ({
            id: c.id,
            display: c.display,
            primaryTiming: toPrimaryTiming(c.primaryTiming),
            hideRealTime: c.hideRealTime,
            hideGameTime: c.hideGameTime,
            showMilliseconds: c.showMilliseconds,
            error: null,
        })),
    );
    const [isSaving, startSaving] = useTransition();
    const [progress, setProgress] = useState<string | null>(null);

    const rtCount = activeCategories.filter(
        (c) => c.primaryTiming === 'rt',
    ).length;

    const setAll = (patch: Partial<Omit<RowState, 'id' | 'display'>>) =>
        setRows((rs) => rs.map((r) => ({ ...r, ...patch })));

    const setRow = (
        id: number,
        patch: Partial<Omit<RowState, 'id' | 'display'>>,
    ) =>
        setRows((rs) =>
            rs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );

    const invalid = rows.filter((r) => r.hideRealTime && r.hideGameTime);

    const save = () => {
        startSaving(async () => {
            const changed = rows.filter((r) => {
                const orig = activeCategories.find((c) => c.id === r.id);
                return (
                    orig &&
                    (toPrimaryTiming(orig.primaryTiming) !== r.primaryTiming ||
                        orig.hideRealTime !== r.hideRealTime ||
                        orig.hideGameTime !== r.hideGameTime ||
                        orig.showMilliseconds !== r.showMilliseconds)
                );
            });
            let failures = 0;
            for (let i = 0; i < changed.length; i++) {
                const r = changed[i];
                setProgress(`Saving ${i + 1} / ${changed.length}…`);
                const timingRes = await updateTimingSettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    primaryTiming: r.primaryTiming,
                    hideRealTime: r.hideRealTime,
                    hideGameTime: r.hideGameTime,
                });
                const msRes = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: r.id,
                    showMilliseconds: r.showMilliseconds,
                });
                if ('error' in timingRes || 'error' in msRes) {
                    failures++;
                    const msg =
                        ('error' in timingRes && timingRes.error) ||
                        ('error' in msRes && msRes.error) ||
                        'Save failed';
                    setRow(r.id, { error: msg });
                }
            }
            setProgress(null);
            if (failures === 0) onAdvance();
        });
    };

    return (
        <section>
            <h2 className="h4">Timing</h2>
            <div className="alert alert-info py-2">
                {rtCount} of {activeCategories.length} active categories
                default to real time from ingestion. Change only what your
                community actually ranks differently.
            </div>
            <table className="table align-middle">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th>
                            Primary
                            <select
                                className="form-select form-select-sm mt-1"
                                onChange={(e) =>
                                    setAll({
                                        primaryTiming: e.target
                                            .value as PrimaryTiming,
                                    })
                                }
                                defaultValue=""
                            >
                                <option value="" disabled>
                                    set all…
                                </option>
                                <option value="realtime">RTA</option>
                                <option value="gametime">IGT</option>
                            </select>
                        </th>
                        <th>Show RT</th>
                        <th>Show IGT</th>
                        <th>Milliseconds</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <td>
                                {r.display}
                                {r.error && (
                                    <div className="text-danger small">
                                        {r.error}
                                    </div>
                                )}
                            </td>
                            <td>
                                <select
                                    className="form-select form-select-sm"
                                    value={r.primaryTiming}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            primaryTiming: e.target
                                                .value as PrimaryTiming,
                                        })
                                    }
                                >
                                    <option value="realtime">RTA</option>
                                    <option value="gametime">IGT</option>
                                </select>
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={!r.hideRealTime}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            hideRealTime: !e.target.checked,
                                        })
                                    }
                                />
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={!r.hideGameTime}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            hideGameTime: !e.target.checked,
                                        })
                                    }
                                />
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={r.showMilliseconds}
                                    onChange={(e) =>
                                        setRow(r.id, {
                                            showMilliseconds:
                                                e.target.checked,
                                        })
                                    }
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {invalid.length > 0 && (
                <div className="alert alert-danger py-2">
                    A category can’t hide both RT and IGT:{' '}
                    {invalid.map((r) => r.display).join(', ')}
                </div>
            )}
            <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving || invalid.length > 0}
                onClick={save}
            >
                {isSaving ? (progress ?? 'Saving…') : 'Save & continue'}
            </button>
        </section>
    );
}
```

- [ ] **Step 2: Register in the shell** (add `case 'timing':`, import `StepTiming`)

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): timing step"
```

---

### Task 14: Step 5 — Variables

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-variables.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'variables'`)

**Interfaces:**
- Consumes: `StepProps`; `createVariableAction` (existing: input `{ gameSlug, gameId, body: UpsertVariableInput }`, returns `{ result: VariableRow } | { error: string }`); `deleteVariableAction` (existing, same folder — check its input shape at implementation: it takes `{ gameSlug, gameId, body: DeleteVariableInput }` following the create action); `UpsertVariableInput` from `~src/lib/leaderboard-variables` (`values: string[][]` — each value is a bucket of aliases; a plain value is `[['PC'], ['Switch']]`).

- [ ] **Step 1: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-variables.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import type { VariableRow } from '../../../../../../types/leaderboards.types';
import { createVariableAction } from '../../manage/variables/actions/create-variable.action';
import { deleteVariableAction } from '../../manage/variables/actions/delete-variable.action';
import type { StepProps } from '../types';

interface Template {
    name: string;
    role: 'subcategory' | 'filter';
    values: string[];
    blurb: string;
}

const TEMPLATES: Template[] = [
    {
        name: 'Platform',
        role: 'filter',
        values: ['PC', 'Switch', 'PS5', 'Xbox'],
        blurb: 'One board, viewers can narrow by platform',
    },
    {
        name: 'Version',
        role: 'filter',
        values: ['1.0', 'Latest'],
        blurb: 'Filter by game version or patch',
    },
    {
        name: 'Difficulty',
        role: 'subcategory',
        values: ['Easy', 'Normal', 'Hard'],
        blurb: 'Each difficulty gets its own rankings',
    },
    {
        name: 'Character',
        role: 'subcategory',
        values: ['Character 1', 'Character 2'],
        blurb: 'Each character gets its own rankings',
    },
];

interface EditorState {
    name: string;
    role: 'subcategory' | 'filter';
    valuesText: string;
}

export function StepVariables({ data, onAdvance }: StepProps) {
    const router = useRouter();
    const [variables, setVariables] = useState<VariableRow[]>(data.variables);
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const openTemplate = (t: Template) =>
        setEditor({
            name: t.name,
            role: t.role,
            valuesText: t.values.join(', '),
        });

    const saveVariable = () => {
        if (!editor) return;
        startSaving(async () => {
            setError(null);
            const values = editor.valuesText
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v) => [v]);
            if (values.length < 2) {
                setError('A variable needs at least two values.');
                return;
            }
            const res = await createVariableAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                body: {
                    categoryId: null, // game-wide; scope per-category later in the console
                    name: editor.name.trim(),
                    role: editor.role,
                    values,
                },
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setVariables((vs) => [...vs, res.result]);
            setEditor(null);
            toast.success(`Variable "${res.result.name}" created`);
            router.refresh();
        });
    };

    const removeVariable = (v: VariableRow) => {
        startSaving(async () => {
            const res = await deleteVariableAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                body: {
                    categoryId: v.categoryId,
                    nameNormalized: v.nameNormalized,
                },
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setVariables((vs) => vs.filter((x) => x.id !== v.id));
            router.refresh();
        });
    };

    return (
        <section>
            <h2 className="h4">Variables</h2>
            <div className="row g-3 mb-3">
                <div className="col-md-6">
                    <div className="border rounded p-3 h-100">
                        <strong>Subcategory</strong>
                        <p className="mb-0 small text-muted">
                            Splits your leaderboard into separate boards —
                            e.g. Difficulty: Easy and Hard each get their own
                            rankings.
                        </p>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="border rounded p-3 h-100">
                        <strong>Filter</strong>
                        <p className="mb-0 small text-muted">
                            One board, viewers can narrow it — e.g. Platform.
                            Everyone still competes together.
                        </p>
                    </div>
                </div>
            </div>

            <p className="mb-1">Start from a template:</p>
            <div className="d-flex gap-2 flex-wrap mb-3">
                {TEMPLATES.map((t) => (
                    <button
                        key={t.name}
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        title={t.blurb}
                        onClick={() => openTemplate(t)}
                    >
                        {t.name}
                    </button>
                ))}
                <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() =>
                        setEditor({
                            name: '',
                            role: 'filter',
                            valuesText: '',
                        })
                    }
                >
                    + Custom variable
                </button>
            </div>

            {editor && (
                <div className="border rounded p-3 mb-3">
                    <label className="form-label" htmlFor="var-name">
                        Name
                    </label>
                    <input
                        id="var-name"
                        className="form-control"
                        value={editor.name}
                        onChange={(e) =>
                            setEditor({ ...editor, name: e.target.value })
                        }
                    />
                    <div className="mt-2">
                        <label className="form-check-label me-3">
                            <input
                                type="radio"
                                className="form-check-input me-1"
                                checked={editor.role === 'subcategory'}
                                onChange={() =>
                                    setEditor({
                                        ...editor,
                                        role: 'subcategory',
                                    })
                                }
                            />
                            Subcategory — separate boards per value
                        </label>
                        <label className="form-check-label">
                            <input
                                type="radio"
                                className="form-check-input me-1"
                                checked={editor.role === 'filter'}
                                onChange={() =>
                                    setEditor({ ...editor, role: 'filter' })
                                }
                            />
                            Filter — one board, narrowable
                        </label>
                    </div>
                    <label className="form-label mt-2" htmlFor="var-values">
                        Values (comma-separated)
                    </label>
                    <input
                        id="var-values"
                        className="form-control"
                        value={editor.valuesText}
                        onChange={(e) =>
                            setEditor({
                                ...editor,
                                valuesText: e.target.value,
                            })
                        }
                        placeholder="PC, Switch, PS5"
                    />
                    {error && (
                        <div className="alert alert-danger py-2 mt-2 mb-0">
                            {error}
                        </div>
                    )}
                    <div className="d-flex gap-2 mt-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={isSaving || !editor.name.trim()}
                            onClick={saveVariable}
                        >
                            {isSaving ? 'Saving…' : 'Save variable'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setEditor(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {variables.length > 0 && (
                <ul className="list-group mb-3">
                    {variables.map((v) => (
                        <li
                            key={v.id}
                            className="list-group-item d-flex align-items-center gap-2"
                        >
                            <strong>{v.name}</strong>
                            <span className="badge bg-secondary">
                                {v.role}
                            </span>
                            <span className="text-muted small">
                                {v.values.map((bucket) => bucket[0]).join(', ')}
                            </span>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-danger ms-auto"
                                disabled={isSaving}
                                onClick={() => removeVariable(v)}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <p className="text-muted small">
                Fine-tune which value combinations are valid later in Manage →
                Combinations.
            </p>
            <button
                type="button"
                className="btn btn-primary"
                onClick={onAdvance}
            >
                Continue
            </button>
        </section>
    );
}
```

- [ ] **Step 2: Register in the shell** (add `case 'variables':`, import `StepVariables`)

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): variables step with templates and plain-language explainer"
```

---

### Task 15: Step 6 — Rules

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-rules.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'rules'`)

**Interfaces:**
- Consumes: `StepProps`; `updateCategorySettingsAction` (existing; `{ gameSlug, gameId, categoryId, rules }`).

- [ ] **Step 1: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-rules.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import type { StepProps } from '../types';

const STARTER_TEMPLATE = `Timing starts on [first input / cutscene end].
Timing ends on [final hit / last input].

- Video proof is [required / recommended] for all submissions.
- Allowed platforms and versions: [list them].
- No cheating, game modifications, or macros. Emulator: [allowed / banned].
`;

export function StepRules({ data, onAdvance }: StepProps) {
    const activeCategories = data.categories.filter((c) => c.active);
    const [rulesById, setRulesById] = useState<Record<number, string>>(
        Object.fromEntries(
            activeCategories.map((c) => [
                c.id,
                c.rules?.trim() ? c.rules : STARTER_TEMPLATE,
            ]),
        ),
    );
    const [savedIds, setSavedIds] = useState<Set<number>>(
        new Set(
            activeCategories
                .filter((c) => (c.rules ?? '').trim().length > 0)
                .map((c) => c.id),
        ),
    );
    const [selectedId, setSelectedId] = useState<number | null>(
        activeCategories[0]?.id ?? null,
    );
    const [isSaving, startSaving] = useTransition();

    if (activeCategories.length === 0) {
        return (
            <section>
                <h2 className="h4">Rules</h2>
                <p className="text-muted">
                    No active categories yet — set rules after choosing
                    categories.
                </p>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onAdvance}
                >
                    Continue
                </button>
            </section>
        );
    }

    const selected = activeCategories.find((c) => c.id === selectedId);

    const saveOne = (categoryId: number, then?: () => void) => {
        startSaving(async () => {
            const res = await updateCategorySettingsAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                categoryId,
                rules: rulesById[categoryId] ?? '',
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setSavedIds((s) => new Set(s).add(categoryId));
            then?.();
        });
    };

    const copyToAll = () => {
        if (selectedId === null) return;
        const text = rulesById[selectedId];
        setRulesById((r) => {
            const next = { ...r };
            for (const c of activeCategories) next[c.id] = text;
            return next;
        });
        toast.info('Copied to all categories — save each to apply.');
    };

    const saveAllAndContinue = () => {
        startSaving(async () => {
            let failed = false;
            for (const c of activeCategories) {
                const res = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: c.id,
                    rules: rulesById[c.id] ?? '',
                });
                if ('error' in res) {
                    toast.error(`${c.display}: ${res.error}`);
                    failed = true;
                } else {
                    setSavedIds((s) => new Set(s).add(c.id));
                }
            }
            if (!failed) onAdvance();
        });
    };

    return (
        <section>
            <h2 className="h4">Rules</h2>
            <p className="text-muted">
                Every category needs rules — we pre-filled a skeleton so you
                edit instead of writing from scratch. Replace the [bracketed]
                parts.
            </p>
            <div className="row g-3">
                <div className="col-md-4">
                    <ul className="list-group">
                        {activeCategories.map((c) => (
                            <li
                                key={c.id}
                                className={`list-group-item d-flex justify-content-between ${
                                    c.id === selectedId ? 'active' : ''
                                }`}
                                role="button"
                                onClick={() => setSelectedId(c.id)}
                            >
                                {c.display}
                                {savedIds.has(c.id) && <span>✓</span>}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="col-md-8">
                    {selected && (
                        <>
                            <textarea
                                className="form-control font-monospace"
                                rows={12}
                                value={rulesById[selected.id] ?? ''}
                                onChange={(e) =>
                                    setRulesById((r) => ({
                                        ...r,
                                        [selected.id]: e.target.value,
                                    }))
                                }
                            />
                            <div className="d-flex gap-2 mt-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    disabled={isSaving}
                                    onClick={() => saveOne(selected.id)}
                                >
                                    Save {selected.display}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={copyToAll}
                                >
                                    Copy these rules to all categories
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <button
                type="button"
                className="btn btn-primary mt-3"
                disabled={isSaving}
                onClick={saveAllAndContinue}
            >
                {isSaving ? 'Saving…' : 'Save all & continue'}
            </button>
        </section>
    );
}
```

- [ ] **Step 2: Register in the shell** (add `case 'rules':`, import `StepRules`)

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): rules step with starter template"
```

---

### Task 16: Step 7 — Standards

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-standards.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'standards'`)

**Interfaces:**
- Consumes: `StepProps`; `createPolicyAction(gameSlug, input: CreatePolicyInput)` / `updatePolicyAction(gameSlug, id, value)` (existing, `manage/moderation/policies/actions/policies-actions.action.ts`); `updateCategorySettingsAction` (requireVideo fields); `suggestMinTimeMs` (Task 5); `MinTimePolicyValue` uses keys `{ minTimeMs, minGameTimeMs }`; `PctPolicyValue` `{ pct }` for the two auto-flag policy types.
- Note: time input parsing — reuse `parseTimeInput` from `~src/lib/time-input` (used by the submit form; verify exact export name there at implementation).

- [ ] **Step 1: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-standards.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { parseTimeInput } from '~src/lib/time-input';
import { suggestMinTimeMs } from '~src/lib/setup/suggestions';
import { updateCategorySettingsAction } from '../../manage/category-tab/actions/update-category-settings.action';
import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import type { StepProps } from '../types';

function formatMs(ms: number): string {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`;
}

export function StepStandards({ data, onAdvance }: StepProps) {
    const activeCategories = data.categories.filter((c) => c.active);
    const mainCat =
        activeCategories.find((c) => c.isMain) ?? activeCategories[0];

    // Scope: null = all categories (game-wide policy).
    const [scopeCategoryId, setScopeCategoryId] = useState<number | null>(
        null,
    );
    const [requireVideo, setRequireVideo] = useState(
        activeCategories.length > 0 &&
            activeCategories.every((c) => c.requireVideo),
    );
    const [topNOnly, setTopNOnly] = useState(false);
    const [topN, setTopN] = useState('5');
    const [minTimeEnabled, setMinTimeEnabled] = useState(false);
    const [minTimeText, setMinTimeText] = useState('');
    const [flagWrPct, setFlagWrPct] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const scopedCat =
        scopeCategoryId === null
            ? mainCat
            : activeCategories.find((c) => c.id === scopeCategoryId);
    const wr = scopedCat ? (data.wrTimes[scopedCat.id] ?? null) : null;
    const suggestion = scopedCat
        ? suggestMinTimeMs(wr, scopedCat.totalFinishedAttemptCount)
        : null;

    const save = () => {
        startSaving(async () => {
            setError(null);

            // Video requirement → category settings.
            const videoTargets =
                scopeCategoryId === null
                    ? activeCategories
                    : activeCategories.filter(
                          (c) => c.id === scopeCategoryId,
                      );
            for (const c of videoTargets) {
                const res = await updateCategorySettingsAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: c.id,
                    requireVideo,
                    requireVideoTopN:
                        requireVideo && topNOnly ? Number(topN) : null,
                });
                if ('error' in res) {
                    setError(`${c.display}: ${res.error}`);
                    return;
                }
            }

            // Minimum time → min_time policy ({ minTimeMs, minGameTimeMs }).
            if (minTimeEnabled) {
                const ms = parseTimeInput(minTimeText);
                if (!ms || ms <= 0) {
                    setError(
                        'Enter the minimum time as h:mm:ss, m:ss, or seconds.',
                    );
                    return;
                }
                const res = await createPolicyAction(data.game.name, {
                    policyType: 'min_time',
                    value: { minTimeMs: ms },
                    categoryId: scopeCategoryId,
                });
                if ('error' in res) {
                    setError(res.error);
                    return;
                }
            }

            // Auto-flag: hold suspiciously fast runs for manual review.
            if (flagWrPct) {
                const res = await createPolicyAction(data.game.name, {
                    policyType: 'auto_flag_faster_than_wr_pct',
                    value: { pct: 5 },
                    categoryId: scopeCategoryId,
                });
                if ('error' in res) {
                    setError(res.error);
                    return;
                }
            }

            toast.success('Standards saved');
            onAdvance();
        });
    };

    return (
        <section>
            <h2 className="h4">Standards</h2>
            <p className="text-muted">
                Guardrails that keep your verification queue manageable. All
                of this can be tuned later in Manage → Standards.
            </p>

            <label className="form-label" htmlFor="scope">
                Apply to
            </label>
            <select
                id="scope"
                className="form-select w-auto mb-3"
                value={scopeCategoryId ?? ''}
                onChange={(e) =>
                    setScopeCategoryId(
                        e.target.value ? Number(e.target.value) : null,
                    )
                }
            >
                <option value="">All categories</option>
                {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.display}
                    </option>
                ))}
            </select>

            <div className="card mb-3">
                <div className="card-body">
                    <label className="form-check-label">
                        <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={requireVideo}
                            onChange={(e) =>
                                setRequireVideo(e.target.checked)
                            }
                        />
                        <strong>Require video proof</strong>
                    </label>
                    {requireVideo && (
                        <div className="mt-2 ms-4">
                            <label className="form-check-label">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-2"
                                    checked={topNOnly}
                                    onChange={(e) =>
                                        setTopNOnly(e.target.checked)
                                    }
                                />
                                Only for top
                            </label>{' '}
                            <input
                                className="form-control form-control-sm d-inline-block"
                                style={{ width: '4rem' }}
                                inputMode="numeric"
                                value={topN}
                                disabled={!topNOnly}
                                onChange={(e) => setTopN(e.target.value)}
                            />{' '}
                            places
                        </div>
                    )}
                </div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <label className="form-check-label">
                        <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={minTimeEnabled}
                            onChange={(e) =>
                                setMinTimeEnabled(e.target.checked)
                            }
                        />
                        <strong>Minimum time</strong>{' '}
                        <span className="text-muted small">
                            auto-flags impossibly fast submissions
                        </span>
                    </label>
                    {minTimeEnabled && (
                        <div className="mt-2 ms-4">
                            <input
                                className="form-control w-auto d-inline-block"
                                value={minTimeText}
                                onChange={(e) =>
                                    setMinTimeText(e.target.value)
                                }
                                placeholder="e.g. 10:00"
                            />
                            {suggestion !== null && wr !== null && (
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm"
                                    onClick={() =>
                                        setMinTimeText(formatMs(suggestion))
                                    }
                                >
                                    Fastest verified run is {formatMs(wr)} —
                                    suggest {formatMs(suggestion)}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <label className="form-check-label">
                        <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={flagWrPct}
                            onChange={(e) => setFlagWrPct(e.target.checked)}
                        />
                        <strong>
                            Hold runs that beat the world record by 5%+ for
                            manual review
                        </strong>
                    </label>
                </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
```

Note: if a `min_time`/`auto_flag_faster_than_wr_pct` policy already exists for the chosen scope, the backend may reject the duplicate create — surface the error inline (already handled); the mod can adjust in Manage → Standards. Do not silently `updatePolicyAction` (editing existing policies is console territory).

- [ ] **Step 2: Register in the shell** (add `case 'standards':`, import `StepStandards`)

- [ ] **Step 3: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): standards step with data-derived min-time suggestion"
```

---

### Task 17: Step 8 — Moderators & finish

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/setup/actions/manage-moderators.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/setup/actions/set-configured.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/setup/wizard-shell.tsx` (add `case 'finish'`)

**Interfaces:**
- Consumes: `StepProps`; `assignRole`, `revokeRoleAssignment` (`~src/lib/role-assignments`); `getPaginatedUsers` (`~src/lib/users` — signature `(page, pageSize, search, ?, sessionId)`, see `assign-global-admin.action.ts:25`); `updateGame` (Task 3); `BoardModRole`, `GameModerator`; `SETUP_STEP_ORDER` + completeness steps for the review checklist.
- Produces: `addGameModeratorAction(input: { gameSlug: string; gameId: number; username: string; role: BoardModRole }): Promise<{ result: { userId: number; username: string; assignmentId: number } } | { error: string }>`; `removeGameModeratorAction(input: { gameSlug: string; gameId: number; assignmentId: number }): Promise<{ ok: true } | { error: string }>`; `setGameConfiguredAction(input: { gameSlug: string; gameId: number }): Promise<{ ok: true } | { error: string }>`.

- [ ] **Step 1: Write the moderator actions**

```typescript
// app/(new-layout)/games-v2/[game]/setup/actions/manage-moderators.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import type { BoardModRole } from '../../../../../../types/board-claims.types';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { assignRole, revokeRoleAssignment } from '~src/lib/role-assignments';
import { getPaginatedUsers } from '~src/lib/users';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface AddInput {
    gameSlug: string;
    gameId: number;
    username: string;
    role: BoardModRole;
}

export async function addGameModeratorAction(
    input: AddInput,
): Promise<
    | { result: { userId: number; username: string; assignmentId: number } }
    | { error: string }
> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    const trimmed = input.username.trim();
    if (!trimmed) return { error: 'Username is required.' };

    try {
        const search = await getPaginatedUsers(1, 10, trimmed, '', user.id);
        const match = search.items.find(
            (u) => u.username.toLowerCase() === trimmed.toLowerCase(),
        );
        if (!match) return { error: `User "${trimmed}" not found.` };

        const res = await assignRole(
            { userId: match.id, role: input.role, gameId: input.gameId },
            user.id,
        );
        revalidateTag(`game-mods:${input.gameId}`, 'minutes');
        return {
            result: {
                userId: match.id,
                username: match.username,
                assignmentId: res.id,
            },
        };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to add moderator.' };
    }
}

interface RemoveInput {
    gameSlug: string;
    gameId: number;
    assignmentId: number;
}

export async function removeGameModeratorAction(
    input: RemoveInput,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'moderators', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Only board admins can manage the mod team.' };
    }

    try {
        await revokeRoleAssignment(input.assignmentId, user.id);
        revalidateTag(`game-mods:${input.gameId}`, 'minutes');
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to remove moderator.' };
    }
}
```

- [ ] **Step 2: Write the configured action**

```typescript
// app/(new-layout)/games-v2/[game]/setup/actions/set-configured.action.ts
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { updateGame } from '~src/lib/game-mgmt';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
}

export async function setGameConfiguredAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to finish setup.' };
    }

    try {
        await updateGame(user.id, input.gameId, { configured: true });
        revalidateTag(`game-meta:${input.gameId}`, 'minutes');
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to mark setup complete.' };
    }
}
```

- [ ] **Step 3: Write the step component**

```tsx
// app/(new-layout)/games-v2/[game]/setup/steps/step-finish.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import Link from '~src/components/link';
import type {
    BoardModRole,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import type { SetupStepId } from '~src/lib/setup/completeness';
import {
    addGameModeratorAction,
    removeGameModeratorAction,
} from '../actions/manage-moderators.action';
import { setGameConfiguredAction } from '../actions/set-configured.action';
import type { StepProps } from '../types';

const STEP_LABELS: Record<SetupStepId, string> = {
    welcome: 'Welcome',
    details: 'Game details',
    categories: 'Categories',
    timing: 'Timing',
    variables: 'Variables',
    rules: 'Rules',
    standards: 'Standards',
    finish: 'Finish',
};

export function StepFinish({ data }: StepProps) {
    const [mods, setMods] = useState<GameModerator[]>(data.moderators);
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<BoardModRole>('game-mod');
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startPending] = useTransition();

    const reviewSteps = data.completeness.steps.filter(
        (s) => s.step !== 'welcome' && s.step !== 'finish',
    );
    const blockers = reviewSteps.filter((s) => s.status === 'blocker');
    const warnings = reviewSteps.filter((s) => s.status === 'warning');

    const addMod = () => {
        startPending(async () => {
            setError(null);
            const res = await addGameModeratorAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                username,
                role,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setMods((ms) => [
                ...ms,
                {
                    assignmentId: res.result.assignmentId,
                    userId: res.result.userId,
                    username: res.result.username,
                    role,
                    createdAt: new Date().toISOString(),
                },
            ]);
            setUsername('');
            toast.success(`Added ${res.result.username}`);
        });
    };

    const removeMod = (m: GameModerator) => {
        const admins = mods.filter((x) => x.role === 'game-admin');
        if (m.role === 'game-admin' && admins.length <= 1) {
            toast.error('A board needs at least one board admin.');
            return;
        }
        startPending(async () => {
            const res = await removeGameModeratorAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                assignmentId: m.assignmentId,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setMods((ms) =>
                ms.filter((x) => x.assignmentId !== m.assignmentId),
            );
        });
    };

    const finish = () => {
        startPending(async () => {
            setError(null);
            const res = await setGameConfiguredAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDone(true);
        });
    };

    if (done) {
        return (
            <section className="text-center py-5">
                <h2>Your board is live</h2>
                <p className="text-muted">
                    Nice work. Runs are on the board and your standards are
                    active — moderation curates instead of gatekeeping.
                </p>
                <div className="d-flex gap-2 justify-content-center">
                    <Link
                        href={`/games-v2/${data.game.name}`}
                        className="btn btn-primary"
                    >
                        View your board
                    </Link>
                    <Link
                        href={`/games-v2/${data.game.name}/manage`}
                        className="btn btn-outline-secondary"
                    >
                        Open the management console
                    </Link>
                </div>
            </section>
        );
    }

    return (
        <section>
            <h2 className="h4">Mod team</h2>
            <p className="text-muted">
                Don’t moderate alone — a second pair of eyes keeps the queue
                moving.
            </p>
            <ul className="list-group mb-2">
                {mods.map((m) => (
                    <li
                        key={m.assignmentId}
                        className="list-group-item d-flex align-items-center gap-2"
                    >
                        <strong>{m.username}</strong>
                        <span className="badge bg-secondary">
                            {m.role === 'game-admin'
                                ? 'board admin'
                                : 'moderator'}
                        </span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger ms-auto"
                            disabled={isPending}
                            onClick={() => removeMod(m)}
                        >
                            Remove
                        </button>
                    </li>
                ))}
                {mods.length === 0 && (
                    <li className="list-group-item text-muted">
                        No moderators listed yet (the backend mod list may not
                        be deployed — you can still finish setup).
                    </li>
                )}
            </ul>
            <div className="d-flex gap-2 mb-4">
                <input
                    className="form-control w-auto"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Twitch username"
                />
                <select
                    className="form-select w-auto"
                    value={role}
                    onChange={(e) => setRole(e.target.value as BoardModRole)}
                >
                    <option value="game-mod">Moderator</option>
                    <option value="game-admin">Board admin</option>
                </select>
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    disabled={isPending || !username.trim()}
                    onClick={addMod}
                >
                    Add
                </button>
            </div>

            <h2 className="h4">Review & finish</h2>
            <ul className="list-group mb-3">
                {reviewSteps.map((s) => (
                    <li
                        key={s.step}
                        className="list-group-item d-flex align-items-center gap-2"
                    >
                        <span
                            className={
                                s.status === 'blocker'
                                    ? 'text-danger'
                                    : s.status === 'warning'
                                      ? 'text-warning'
                                      : s.status === 'done'
                                        ? 'text-success'
                                        : 'text-muted'
                            }
                        >
                            {s.status === 'done' ? '✓' : '•'}
                        </span>
                        <strong>{STEP_LABELS[s.step]}</strong>
                        <span className="text-muted small">{s.summary}</span>
                        <Link
                            href={`/games-v2/${data.game.name}/setup?step=${s.step}`}
                            className="ms-auto small"
                        >
                            edit
                        </Link>
                    </li>
                ))}
            </ul>
            {blockers.length > 0 && (
                <div className="alert alert-danger py-2">
                    Fix before finishing: {blockers
                        .map((b) => b.summary)
                        .join(' · ')}
                </div>
            )}
            {warnings.length > 0 && blockers.length === 0 && (
                <div className="alert alert-warning py-2">
                    Worth a look (won’t block you): {warnings
                        .map((w) => w.summary)
                        .join(' · ')}
                </div>
            )}
            {error && <div className="alert alert-danger">{error}</div>}
            <button
                type="button"
                className="btn btn-success"
                disabled={isPending || blockers.length > 0}
                onClick={finish}
            >
                {isPending ? 'Finishing…' : 'Finish setup'}
            </button>
        </section>
    );
}
```

Note: the review checklist reads `data.completeness`, which reflects server state as of the last `router.refresh()` — the shell refreshes on every step change, so by the time the mod reaches Finish, earlier steps' writes are reflected.

- [ ] **Step 4: Register in the shell** (add `case 'finish':`, import `StepFinish`; the `default` placeholder branch can now be removed — all eight steps have cases; keep the switch exhaustive over `SetupStepId`)

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add "app/(new-layout)/games-v2/[game]/setup"
git commit -m "feat(setup): mod team and review-finish step with configured flag"
```

---

### Task 18: Full verification + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-07-14-game-setup-wizard-design.md` (status line)

- [ ] **Step 1: Run the full suite**

```bash
npm run typecheck && npm run lint && npm run test
```
Expected: all clean/green. Fix anything that isn't before proceeding.

- [ ] **Step 2: Clear build cache** (per CLAUDE.md, after significant changes)

```bash
rm -rf .next
```

- [ ] **Step 3: Mark the spec implemented**

In `docs/superpowers/specs/2026-07-14-game-setup-wizard-design.md`, change
`**Status:** Approved design, not yet implemented` to
`**Status:** Implemented (frontend; backend contract in docs/frontend-guide-board-claims-and-setup.md pending)`.

- [ ] **Step 4: Commit and push the branch**

```bash
git add docs/superpowers/specs/2026-07-14-game-setup-wizard-design.md
git commit -m "docs: mark game setup wizard spec implemented"
git push -u origin game-setup-wizard
```

(Push only — never open a PR.)

---

## Plan Self-Review (completed)

- **Spec coverage:** claim CTA/modal (T6), admin queue with grouped rivals + role selector + stale badge (T7), join-team routing to board mods (T8), wizard route/shell/resume (T9), checklist card (T10), all 8 steps (T9, T11–T17), completeness module (T4), suggestion math (T5), configured flag (T17), backend handoff (T1). Deviations from spec, both deliberate: cover image is a URL field (existing upload path is splits-specific; presigned image upload noted as backend nice-to-have in T1), and the timing recommendation derives from category primary-timing defaults rather than per-run RT/GT presence (run-level data would need N leaderboard fetches).
- **Placeholder scan:** the T9 shell `default` branch is an explicit interim that Tasks 11–17 remove — intentional, not a TBD. Where a neighboring file's exact local bindings are unknowable from this plan (manage/page.tsx variable names, deleteVariableAction input), the plan says exactly what to verify and what shape to expect.
- **Type consistency:** `StepProps`/`WizardData` (T9) used by T11–T17; `BoardModRole`/`GameModerator`/`BoardClaimRequest` (T2) used by T3, T6–T8, T17; `SetupStepId`/`BoardCompleteness` (T4) used by T9, T10, T17; `PrimaryTiming` mapping `'rt'|'gt'` → `'realtime'|'gametime'` handled in T13.
