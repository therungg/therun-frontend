# Leaderboard Variables Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the frontend off the legacy SHA-256 `subcategoryHash` + `var_*` query + flat `values: string[]` variable contract, onto the new plain-text `subcategoryKey` + per-variable query + bucketed `values: string[][]` contract documented in `docs/frontend-guide-leaderboard-variables.md`. Rebuild the admin variables UI around the bucket model and add the recommended combinations grid.

**Architecture:** The backend now provides plain-text `subcategoryKey` (e.g. `"platform=n64|region=us"`) and per-variable values as buckets — each bucket is a list of accepted aliases where index 0 is the canonical display. Subcategory variables use `defaultValueIndex` instead of free-text `defaultValue`; filter variables stop carrying a `required` flag. The frontend no longer hashes anything — it passes each subcategory variable as its own query param and lets the server build the key. Admin upsert is by `(gameId, categoryId, nameNormalized)` (no per-id `PUT`); delete carries the same identity in its body.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, biome + eslint. No formal test framework — verification is `npm run typecheck`, `npm run lint`, `npm run build`, and manual UI checks in `npm run dev`.

## Key UX choices

The user asked for "as user-friendly as possible." These are the choices baked into the plan; flag any to revisit before execution.

1. **Bucket editor (variable form):** simple list of one input per bucket — each row holds the canonical display value. A `+ aliases` link per row expands to a comma-separated alias input. Common case (one alias per bucket) reads as a plain text list; alias support is discoverable but not in the way.

2. **Role selector:** radio with explainer copy. *Subcategory — splits into separate boards (e.g. PC vs N64)* / *Filter — refines within a board (e.g. show only US runs)*. Disabled on edit (matches the existing scope-lock pattern).

3. **Default bucket:** dropdown rendering each bucket's canonical alias. Required for `subcategory`; hidden for `filter`. Auto-selects bucket 0 on create.

4. **Variables list grouping:** keep the existing Game-wide / Category tabs. Within each tab, split into two visible sections — *Subcategory Variables* and *Filter Variables* — with clear empty states. Avoids a Role column and makes the semantics obvious at a glance.

5. **Reserved-name guardrail:** the variable form fetches `reservedParams` once via the public `/variables` endpoint for one category of the game (any will do), shows the list inline, and blocks submit on a normalized-name collision before the backend round-trip.

6. **Description field:** optional textarea on the form. Surfaced as a hover-tooltip (`title=`) on the variables list row name.

7. **Combinations management (Phase 5):** new sibling section in the manage page. Cartesian-product grid with per-combo checkboxes plus per-row/per-column bulk toggle for ergonomics with many variables. Mode badge (`open` / `managed`) at the top. Phase 5 is optional — the rest of the plan is fully self-contained without it.

8. **Minimums form structured picker (Phase 4):** replace the free-text *Subcategory hash* input with per-variable dropdowns that build the plain-text key. Key is now decodable, so existing rows render readable labels via `subcategory-label.ts`. The free-text input was the worst part of the old UI; this is the largest UX win in the migration.

9. **Invalid-combination 404:** when the leaderboard endpoint returns 404 with `validCombinations`, `data.ts` catches it and `game-page.tsx` renders a friendly empty state with the listed alternatives as clickable suggestion buttons. No crash, no blank page.

10. **`subcategoryHash` → `subcategoryKey` rename** propagates everywhere — type names, prop names, query helpers, cache tag fragments, action inputs. A single semantic name across the codebase prevents the half-renamed limbo that's the easiest way to get this wrong.

## Coordination notes

- **Minimums backend rename.** The variables doc doesn't say whether `/v1/games/:gameId/categories/:categoryId/minimums` body/response fields renamed from `subcategoryHash` → `subcategoryKey`. Phase 4 frontend tasks assume yes (conceptually the same identifier). Confirm with backend before merging Phase 4. If the backend kept `subcategoryHash` on the wire, the change is wire-mapping only — frontend types still rename, but the lib serializer maps `subcategoryKey` → `subcategoryHash` in the body.

- **No submit form in `(new-layout)`.** The new `warnings[]` array on `POST /leaderboards/submit` has no consuming UI in this app — the legacy submit flow lives elsewhere. Out of scope for this plan; flag if a submit UI is added.

- **`defaultSubcategoryHash` drop.** The doc notes the server fills subcategory defaults itself when params are omitted. Phase 1 drops the field on the client rather than renaming, simplifying `data.ts`.

- **Per-task verification.** Every task ends with `npm run typecheck` (must succeed for that task's files in isolation, even if other unmigrated files still fail — those are addressed in their own task). After the last task in each phase, the full typecheck must pass.

- **Commit cadence.** One commit per task. Format: `<type>(<scope>): <subject>`, matching the recent log style (`feat(leaderboard): …`, `fix(leaderboard): …`).

---

## Phase 1 — Foundation: types, lib, delete legacy hash

The new contract changes types throughout the codebase. Phase 1 lands the type/lib changes in one logical run. After Phase 1, the lib code is correct; UI consumers will have typecheck errors that the following phases resolve area-by-area.

**Mid-phase typecheck:** intentionally broken. Don't try to fix UI errors inside Phase 1 — that's what Phases 2–4 are for.

### Task 1: Rewrite `types/leaderboards.types.ts`

**Files:**
- Modify: `types/leaderboards.types.ts`

**Rationale:** Single source of truth for all variable, subcategory key, and run-detail shapes. Every other task in the plan consumes from here, so getting it correct in one shot avoids ripple-rewrites.

- [ ] **Step 1: Replace the file with the new contract.**

```typescript
export interface ResolvedGame {
    id: number;
    name: string;
    display: string;
    image?: string | null;
    defaultVerified?: boolean;
    primaryTiming?: 'rt' | 'gt';
}

export interface ResolvedCategory {
    id: number;
    name: string;
    display: string;
    primaryTiming: 'rt' | 'gt';
    sortAscending?: boolean;
    isMain?: boolean;
    active?: boolean;
}

export interface QuickStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    uniqueRunners: number;
}

export interface RecentPb {
    id: number;
    username: string;
    game: string;
    category: string;
    time: number;
    gameTime?: number | null;
    endedAt: string;
    isPb: boolean;
}

// Variable definition shared between the admin CRUD endpoint and the public
// /variables endpoint. They now return the same shape; the public endpoint
// just excludes unpublished versions and applies the merge rule.
//
// `values` is a list of buckets. Each bucket is a list of accepted aliases;
// index 0 is the canonical display form. `nameNormalized` is the URL filter
// key (lowercase, whitespace + `=`/`|` stripped from `name`).
export interface VariableRow {
    id: number;
    gameId: number;
    categoryId: number | null; // null = game-wide
    name: string;
    nameNormalized: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
    version: number;
    published: boolean;
}

// VariableDef is the merged/public-read flattening. Identical shape to
// VariableRow plus a derived `scope` for UI labeling (which scope the row
// came from after the merge).
export type VariableDef = VariableRow & {
    scope: 'game' | 'category';
};

export interface ValidCombinationsOpen {
    mode: 'open';
}
export interface ValidCombinationsManaged {
    mode: 'managed';
    keys: string[];
}
export type ValidCombinations =
    | ValidCombinationsOpen
    | ValidCombinationsManaged;

// Wire shape of the public /variables response. `getVariables` in
// leaderboards-v1.ts enriches each row to `VariableDef` (adds `scope`).
export interface VariablesResponse {
    variables: VariableRow[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
}

export interface LeaderboardEntry {
    runId?: number | null;
    rank: number;
    runnerName: string;
    userId?: number | null;
    isGuest: boolean;
    time: number | null;
    realTime: number | null;
    gameTime: number | null;
    runDate: string | null;
    vodUrl?: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    // Keyed by nameNormalized; values are canonical bucket values.
    variables?: Record<string, string> | null;
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hideRealTime: boolean;
    hideGameTime: boolean;
}

export interface WrHistoryEntry {
    runnerName: string;
    time: number;
    timingMethod: 'rt' | 'gt';
    setAt: string;
    supersededAt?: string | null;
}

export interface UserRanking {
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
    timing: 'rt' | 'gt';
    rank: number;
    time: number;
}

// Backend: GET /v1/leaderboards/runs/{runId}
export interface RunDetail {
    runId: number;
    gameId: number;
    gameDisplay: string;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    runnerName: string;
    userId: number | null;
    isGuest: boolean;
    time: number;
    realTime: number | null;
    gameTime: number | null;
    runDate: string;
    vodUrl: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    variables: Record<string, string>;
}

// Submit warnings (no UI consumer in this app yet — see plan coordination notes).
export interface SubmitWarning {
    nameNormalized: string;
    submitted: string;
    resolved: string;
    reason:
        | 'no_match_default_used'
        | 'missing_default_used'
        | 'no_match_filter_dropped'
        | 'combination_invalid_default_used';
}
```

- [ ] **Step 2: Verify the file compiles in isolation.**

Run: `npx tsc --noEmit types/leaderboards.types.ts`
Expected: no output (success). Other files using the legacy shape will still fail; that's expected.

- [ ] **Step 3: Commit.**

```bash
git add types/leaderboards.types.ts
git commit -m "refactor(leaderboard-vars): replace VariableDef/VariableRow/RunDetail with new bucketed contract"
```

---

### Task 2: Delete `src/lib/leaderboard-hash.ts` and `src/lib/leaderboard-hash.verify.ts`

**Files:**
- Delete: `src/lib/leaderboard-hash.ts`
- Delete: `src/lib/leaderboard-hash.verify.ts`

**Rationale:** Client-side hashing is gone. Doc: "Delete the file. No more client-side hashing." Removing both files now means follow-up tasks can't accidentally re-import them.

- [ ] **Step 1: Delete both files.**

```bash
git rm src/lib/leaderboard-hash.ts src/lib/leaderboard-hash.verify.ts
```

- [ ] **Step 2: Confirm no remaining imports.**

Run: `grep -rn "leaderboard-hash" src app types --include="*.ts" --include="*.tsx"`
Expected: only matches inside doc strings, if any (no `import` lines). One reference will remain in `app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx` — that's expected; Task 9 removes it.

- [ ] **Step 3: Commit.**

```bash
git commit -m "refactor(leaderboard-vars): delete legacy client-side subcategory hash"
```

---

### Task 3: Update `src/lib/leaderboard-variables.ts`

**Files:**
- Modify: `src/lib/leaderboard-variables.ts`

**Rationale:** Admin lib needs to match the new endpoint shape: upsert by `(gameId, categoryId, nameNormalized)` for both POST and PUT (no per-id PUT), delete by body fields, and new input shapes carrying `role` + `values: string[][]` + `defaultValueIndex` + optional `description`.

- [ ] **Step 1: Replace the file.**

```typescript
import { apiFetch } from '~src/lib/api-client';
import { V1FetchError } from '~src/lib/v1-fetch';
import type { VariableRow } from '../../types/leaderboards.types';

function basePath(gameId: number) {
    return `/v1/games/${gameId}/variables`;
}

function unwrapVariableArray(body: unknown): VariableRow[] {
    if (Array.isArray(body)) return body as VariableRow[];
    if (body && typeof body === 'object' && 'result' in body) {
        const inner = (body as { result: unknown }).result;
        if (Array.isArray(inner)) return inner as VariableRow[];
    }
    return [];
}

function unwrapVariableRow(body: unknown): VariableRow | null {
    if (body && typeof body === 'object') {
        const candidate =
            'result' in body
                ? (body as { result: unknown }).result
                : body;
        if (candidate && typeof candidate === 'object' && 'id' in candidate) {
            return candidate as VariableRow;
        }
    }
    return null;
}

export interface UpsertVariableInput {
    categoryId?: number | null;
    name: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex?: number | null;
    sortOrder?: number;
    description?: string | null;
}

export interface DeleteVariableInput {
    categoryId?: number | null;
    name?: string;
    nameNormalized?: string;
}

export async function listGameVariables(
    sessionId: string,
    gameId: number,
    categoryId?: number | null,
): Promise<VariableRow[]> {
    const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;
    const qs =
        categoryId != null ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
    const url = `${BASE_URL}${basePath(gameId)}${qs}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${sessionId}` },
    });
    const text = await res.text();
    if (!res.ok) {
        const bodyExcerpt = text.length > 500 ? `${text.slice(0, 500)}…` : text;
        throw new V1FetchError(
            res.status,
            `${res.status} ${basePath(gameId)} — body: ${bodyExcerpt || '(empty)'}`,
        );
    }
    if (!text) return [];
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new V1FetchError(
            res.status,
            `Non-JSON response from ${basePath(gameId)} — body: ${text.slice(0, 500)}`,
        );
    }
    return unwrapVariableArray(parsed);
}

// POST and PUT both call the same upsert handler keyed by
// (gameId, categoryId, nameNormalized). Frontend uses POST exclusively for
// clarity; PUT is left available if a future caller wants explicit "update".
export async function upsertGameVariable(
    sessionId: string,
    gameId: number,
    body: UpsertVariableInput,
): Promise<VariableRow> {
    const raw = await apiFetch<unknown>(basePath(gameId), {
        sessionId,
        method: 'POST',
        body,
    });
    const row = unwrapVariableRow(raw);
    if (!row) throw new Error('Backend returned an unexpected upsert response.');
    return row;
}

export async function deleteGameVariable(
    sessionId: string,
    gameId: number,
    body: DeleteVariableInput,
): Promise<void> {
    if (!body.name && !body.nameNormalized) {
        throw new Error(
            'deleteGameVariable requires either `name` or `nameNormalized`.',
        );
    }
    await apiFetch<unknown>(basePath(gameId), {
        sessionId,
        method: 'DELETE',
        body,
    });
}
```

- [ ] **Step 2: Typecheck this file.**

Run: `npm run typecheck`
Expected: errors will appear in consumers (the four `manage/variables/actions/*.ts` files). The lib file itself should be free of errors.

- [ ] **Step 3: Commit.**

```bash
git add src/lib/leaderboard-variables.ts
git commit -m "refactor(leaderboard-vars): switch admin lib to upsert-by-name + body-based delete"
```

---

### Task 4: Update `src/lib/leaderboards-v1.ts`

**Files:**
- Modify: `src/lib/leaderboards-v1.ts`

**Rationale:** The query helper builds the legacy `?subcategory=<hash>&var_<name>=<value>` format. The new contract uses each variable as its own param (no `var_` prefix), drops the `subcategory` param entirely, and adds `?combined=1`. The leaderboard fetch also needs to surface the 404 `validCombinations` body so the UI can offer suggestions.

- [ ] **Step 1: Replace the file.**

```typescript
'use server';

import { cacheLife, cacheTag } from 'next/cache';
import type {
    LeaderboardResponse,
    RunDetail,
    UserRanking,
    ValidCombinations,
    VariableDef,
    VariablesResponse,
    WrHistoryEntry,
} from '../../types/leaderboards.types';
import { V1FetchError, v1Fetch } from './v1-fetch';

export interface LeaderboardQuery {
    gameSlug: string;
    categorySlug: string;
    timing: 'rt' | 'gt';
    /**
     * Plain-text canonical values keyed by `nameNormalized` for each
     * subcategory variable. Omitted entries fall back to that variable's
     * `defaultValueIndex` bucket on the server.
     */
    subcategoryValues?: Record<string, string>;
    /** When true, returns the combined-across-subcategories view (`?combined=1`). */
    combined?: boolean;
    /** Filter variables, keyed by `nameNormalized` (no `var_` prefix). */
    varFilters?: Record<string, string>;
    verified?: boolean;
    page?: number;
    pageSize?: number;
}

/**
 * Build the canonical cache-tag fragment for a query. Subcategory values are
 * sorted by key and joined with `|` so two URLs that resolve to the same key
 * share one cache entry, matching the server's normalization.
 */
function canonicalSubcategoryFragment(
    values: Record<string, string> | undefined,
    combined: boolean | undefined,
): string {
    if (combined) return 'combined';
    if (!values) return '';
    const keys = Object.keys(values).sort();
    return keys.map((k) => `${k}=${values[k]}`).join('|');
}

function buildLeaderboardQS(q: LeaderboardQuery): string {
    const sp = new URLSearchParams();
    sp.set('timing', q.timing);
    if (q.combined) sp.set('combined', '1');
    if (q.subcategoryValues && !q.combined) {
        for (const [k, v] of Object.entries(q.subcategoryValues)) {
            if (v.length > 0) sp.set(k, v);
        }
    }
    if (q.varFilters) {
        for (const [k, v] of Object.entries(q.varFilters)) {
            if (v.length > 0) sp.set(k, v);
        }
    }
    if (q.verified) sp.set('verified', 'true');
    if (q.page) sp.set('page', String(q.page));
    if (q.pageSize) sp.set('pageSize', String(q.pageSize));
    return sp.toString();
}

export interface LeaderboardResultOk {
    ok: true;
    result: LeaderboardResponse;
}
export interface LeaderboardResultInvalidCombination {
    ok: false;
    reason: 'invalid_combination';
    validCombinations: string[];
}

export async function getLeaderboard(
    q: LeaderboardQuery,
): Promise<LeaderboardResultOk | LeaderboardResultInvalidCombination> {
    'use cache';
    cacheLife('minutes');
    cacheTag(
        `lb:${q.gameSlug}:${q.categorySlug}:${canonicalSubcategoryFragment(q.subcategoryValues, q.combined)}:${q.timing}:${q.verified ? 'v' : 'a'}`,
    );

    const game = encodeURIComponent(q.gameSlug);
    const category = encodeURIComponent(q.categorySlug);
    const path = `/v1/leaderboards/${game}/${category}?${buildLeaderboardQS(q)}`;

    try {
        const raw = await v1Fetch<{
            items: LeaderboardResponse['entries'];
            totalItems: number;
            page: number;
            pageSize: number;
            totalPages: number;
            hideRealTime?: boolean;
            hideGameTime?: boolean;
        }>(path);
        return {
            ok: true,
            result: {
                entries: raw.items ?? [],
                page: raw.page,
                pageSize: raw.pageSize,
                totalItems: raw.totalItems,
                totalPages: raw.totalPages,
                hideRealTime: raw.hideRealTime ?? false,
                hideGameTime: raw.hideGameTime ?? false,
            },
        };
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) {
            const body = e.body as
                | { error?: string; validCombinations?: string[] }
                | undefined;
            if (
                body &&
                body.error === 'leaderboard does not exist' &&
                Array.isArray(body.validCombinations)
            ) {
                return {
                    ok: false,
                    reason: 'invalid_combination',
                    validCombinations: body.validCombinations,
                };
            }
        }
        throw e;
    }
}

export async function getVariables(
    gameSlug: string,
    categorySlug: string,
): Promise<{
    variables: VariableDef[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
}> {
    'use cache';
    cacheLife('hours');
    cacheTag(`game-vars:${gameSlug}:${categorySlug}`);

    const path = `/v1/leaderboards/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}/variables`;
    const body = await v1Fetch<VariablesResponse>(path);
    return {
        // Enrich each row with a derived `scope` for UI labeling. Backend
        // returns plain VariableRow shape per the contract.
        variables: (body.variables ?? []).map((v) => ({
            ...v,
            scope:
                v.categoryId == null
                    ? ('game' as const)
                    : ('category' as const),
        })),
        reservedParams: body.reservedParams ?? [],
        validCombinations: body.validCombinations ?? { mode: 'open' },
    };
}

export async function getWrHistory(
    gameSlug: string,
    categorySlug: string,
    subcategoryKey = '',
): Promise<WrHistoryEntry[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`wr-history:${gameSlug}:${categorySlug}:${subcategoryKey}`);

    // Wire param is still named `subcategory` (kept for back-compat). The
    // value is the plain-text key now, not a hash.
    const path = `/v1/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryKey)}`;
    const body = await v1Fetch<{ result: WrHistoryEntry[] }>(path);
    return body.result ?? [];
}

export async function getUserRankings(userId: number): Promise<UserRanking[]> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`user-rankings:${userId}`);

    const path = `/v1/leaderboards/user/${userId}/rankings`;
    const body = await v1Fetch<{ result: UserRanking[] }>(path);
    return body.result ?? [];
}

export async function getRunById(runId: number): Promise<RunDetail | null> {
    'use cache';
    cacheLife('minutes');
    cacheTag(`run:${runId}`);

    try {
        const body = await v1Fetch<{ result: RunDetail }>(
            `/v1/leaderboards/runs/${runId}`,
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}
```

- [ ] **Step 2: Confirm `V1FetchError` exposes `body` on 404.**

Run: `grep -n "class V1FetchError" src/lib/v1-fetch.ts`
Then read the surrounding code with `Read` to verify. If `V1FetchError` doesn't currently expose `body`, add it (constructor takes an optional `body: unknown`, default `undefined`) and have `v1Fetch` pass the parsed JSON body when it fails. This change is small but blocking — the invalid-combination case can't be detected without it.

If extension is needed, the additional task within Task 4:

```typescript
// src/lib/v1-fetch.ts — extension
export class V1FetchError extends Error {
    constructor(
        public status: number,
        message: string,
        public body?: unknown,
    ) {
        super(message);
    }
}
```

And in `v1Fetch`, on non-OK responses, attempt `JSON.parse(text)` and pass it as the third arg.

- [ ] **Step 3: Typecheck.**

Run: `npm run typecheck`
Expected: the file itself is clean. Consumers will still fail until later tasks.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/leaderboards-v1.ts src/lib/v1-fetch.ts
git commit -m "refactor(leaderboard-vars): switch query helper to per-variable params + surface invalid-combination 404"
```

---

### Task 5: Drop `defaultSubcategoryHash` from `src/lib/games-v1.ts`

**Files:**
- Modify: `src/lib/games-v1.ts`

**Rationale:** Docs note the server fills subcategory defaults itself when params are omitted. Dropping the field on the client simplifies `data.ts` (one fewer thing to thread through). The backend column still exists; we just stop reading it.

- [ ] **Step 1: Remove the field from the interface and the mapping.**

In `src/lib/games-v1.ts`:

```typescript
// In CategoriesEndpointRow — remove this line:
//     default_subcategory_hash?: string | null;

// In the .map(...) return — remove this line:
//     defaultSubcategoryHash: r.default_subcategory_hash ?? null,
```

(`ResolvedCategory` in `types/leaderboards.types.ts` already dropped the field in Task 1.)

- [ ] **Step 2: Typecheck.**

Run: `npm run typecheck`
Expected: this file is clean. Consumers that still read `defaultSubcategoryHash` (notably `data.ts`) will error — that's expected; Task 7 fixes them.

- [ ] **Step 3: Commit.**

```bash
git add src/lib/games-v1.ts
git commit -m "refactor(leaderboard-vars): drop legacy defaultSubcategoryHash from games lib"
```

---

### Task 6: Rename `subcategoryHash` → `subcategoryKey` in minimums lib + types

**Files:**
- Modify: `types/leaderboard-minimums.types.ts`
- Modify: `src/lib/leaderboard-minimums.ts`

**Rationale:** Keep the frontend terminology consistent across the codebase. See coordination notes — backend confirmation required. If backend still uses `subcategoryHash` on the wire, only the lib serializer maps; types still rename for frontend consistency.

- [ ] **Step 1: Rename in types.**

`types/leaderboard-minimums.types.ts`:

```typescript
export interface MinimumTime {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
    setBy: number | null;
    updatedAt: string;
}

export interface UpsertMinimumTimeInput {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
}

export interface UpsertMinimumTimeResult {
    updated: boolean;
    flagged: number;
    unflagged: number;
}

export interface DeleteMinimumTimeResult {
    deleted: boolean;
    unflagged: number;
}
```

- [ ] **Step 2: Rename in `src/lib/leaderboard-minimums.ts`.**

```typescript
import { apiFetch } from '~src/lib/api-client';
import type {
    DeleteMinimumTimeResult,
    MinimumTime,
    UpsertMinimumTimeInput,
    UpsertMinimumTimeResult,
} from '../../types/leaderboard-minimums.types';

function basePath(gameId: number, categoryId: number) {
    return `/v1/games/${gameId}/categories/${categoryId}/minimums`;
}

export async function listMinimumTimes(
    sessionId: string,
    gameId: number,
    categoryId: number,
): Promise<MinimumTime[]> {
    return apiFetch<MinimumTime[]>(basePath(gameId, categoryId), {
        sessionId,
    });
}

export async function upsertMinimumTime(
    sessionId: string,
    gameId: number,
    categoryId: number,
    body: UpsertMinimumTimeInput,
): Promise<UpsertMinimumTimeResult> {
    return apiFetch<UpsertMinimumTimeResult>(basePath(gameId, categoryId), {
        sessionId,
        method: 'PUT',
        body,
    });
}

export async function deleteMinimumTime(
    sessionId: string,
    gameId: number,
    categoryId: number,
    subcategoryKey: string,
): Promise<DeleteMinimumTimeResult> {
    return apiFetch<DeleteMinimumTimeResult>(basePath(gameId, categoryId), {
        sessionId,
        method: 'DELETE',
        body: { subcategoryKey },
    });
}
```

- [ ] **Step 3: Typecheck.**

Run: `npm run typecheck`
Expected: lib files are clean. The minimums UI (`manage/minimums/*`) and its actions still reference the old name — Phase 4 fixes them.

- [ ] **Step 4: Commit.**

```bash
git add types/leaderboard-minimums.types.ts src/lib/leaderboard-minimums.ts
git commit -m "refactor(leaderboard-vars): rename subcategoryHash to subcategoryKey in minimums lib"
```

---

## Phase 2 — Public leaderboard read path

The data layer is correct after Phase 1. Phase 2 wires the UI to it. After Phase 2, the public leaderboard pages compile and render correctly under the new contract; admin pages still fail typecheck until Phase 3.

### Task 7: Update `app/(new-layout)/games-v2/[game]/data.ts`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/data.ts`

**Rationale:** This loader is the single bridge between URL params and the leaderboard fetch. The new contract reads each subcategory variable's value from its own param (no `subvar_` prefix), groups filter values the same way (no `var_` prefix), routes by `nameNormalized` (lookup against the variable defs from `getVariables`), and handles the invalid-combination 404 by surfacing it through `data.activeFilters` to the page component.

- [ ] **Step 1: Replace the file.**

```typescript
import {
    getQuickStats,
    getRecentPbs,
    resolveCategory,
    resolveGame,
} from '~src/lib/games-v1';
import { getLeaderboard, getVariables } from '~src/lib/leaderboards-v1';
import type { GamePageData, GamePageSearchParams } from './types';

const DEFAULT_PAGE_SIZE = 25;
const RESERVED_LOWER = new Set([
    'category',
    'combined',
    'verified',
    'country',
    'year',
    'page',
    'pagesize',
    'timing',
    'view',
]);

export async function loadGamePageData(
    slug: string,
    sp: GamePageSearchParams,
    sessionUsername: string | null,
): Promise<GamePageData | null> {
    const game = await resolveGame(slug);
    if (!game) return null;

    const resolved = await resolveCategory(game.id, sp.category);
    const categories = resolved.categories.filter((c) => c.active !== false);
    const selected =
        resolved.selected && resolved.selected.active !== false
            ? resolved.selected
            : (categories[0] ?? null);
    if (!selected) {
        return {
            game,
            selectedCategory: {
                id: -1,
                name: '',
                display: '',
                primaryTiming: 'rt',
            },
            categories,
            variables: [],
            reservedParams: [],
            validCombinations: { mode: 'open' },
            leaderboard: emptyBoard(),
            invalidCombination: null,
            quickStats: await getQuickStats(game.id),
            recentPbs: [],
            sessionUsername,
            activeFilters: emptyFilters(),
        };
    }

    const varsResp = await getVariables(game.name, selected.name).catch(
        () => ({
            variables: [],
            reservedParams: [],
            validCombinations: { mode: 'open' as const },
        }),
    );

    const subVarNames = new Set(
        varsResp.variables
            .filter((v) => v.role === 'subcategory')
            .map((v) => v.nameNormalized),
    );
    const filterVarNames = new Set(
        varsResp.variables
            .filter((v) => v.role === 'filter')
            .map((v) => v.nameNormalized),
    );
    const reservedLower = new Set([
        ...RESERVED_LOWER,
        ...varsResp.reservedParams.map((r) => r.toLowerCase()),
    ]);

    const subcategoryValues: Record<string, string> = {};
    const varFilters: Record<string, string> = {};
    for (const [rawKey, raw] of Object.entries(sp)) {
        if (typeof raw !== 'string' || raw.length === 0) continue;
        const key = rawKey.toLowerCase();
        if (reservedLower.has(key)) continue;
        if (subVarNames.has(key)) subcategoryValues[key] = raw;
        else if (filterVarNames.has(key)) varFilters[key] = raw;
        // Unknown keys are ignored to avoid sending them to the backend.
    }

    const combined = sp.combined === '1' || sp.combined === 'true';
    const verified = sp.verified === 'true';
    const page = sp.page ? Math.max(1, parseInt(sp.page, 10) || 1) : 1;
    const pageSize = sp.pageSize
        ? Math.min(
              100,
              Math.max(1, parseInt(sp.pageSize, 10) || DEFAULT_PAGE_SIZE),
          )
        : DEFAULT_PAGE_SIZE;

    const baseQuery = {
        gameSlug: game.name,
        categorySlug: selected.name,
        subcategoryValues,
        combined,
        verified,
        page,
        pageSize,
        varFilters,
    };

    const [boardResult, quickStats, recentPbs] = await Promise.all([
        getLeaderboard({ ...baseQuery, timing: selected.primaryTiming }),
        getQuickStats(game.id).catch(() => ({
            totalRunTime: 0,
            totalAttemptCount: 0,
            totalFinishedAttemptCount: 0,
            uniqueRunners: 0,
        })),
        getRecentPbs(game.id).catch(() => []),
    ]);

    const leaderboard = boardResult.ok ? boardResult.result : emptyBoard();
    const invalidCombination = boardResult.ok
        ? null
        : { validCombinations: boardResult.validCombinations };

    return {
        game,
        selectedCategory: selected,
        categories,
        variables: varsResp.variables,
        reservedParams: varsResp.reservedParams,
        validCombinations: varsResp.validCombinations,
        leaderboard,
        invalidCombination,
        quickStats,
        recentPbs,
        sessionUsername,
        activeFilters: {
            subcategoryValues,
            varFilters,
            combined,
            verified,
            page,
            pageSize,
        },
    };
}

function emptyBoard() {
    return {
        entries: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 0,
        hideRealTime: false,
        hideGameTime: false,
    };
}

function emptyFilters() {
    return {
        subcategoryValues: {} as Record<string, string>,
        varFilters: {} as Record<string, string>,
        combined: false,
        verified: false,
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
    };
}
```

- [ ] **Step 2: Typecheck the file (consumers will follow in Tasks 8+).**

Run: `npm run typecheck`
Expected: errors in `types.ts` and `game-page.tsx` referencing missing fields like `subcategoryHash`. Those are addressed in subsequent tasks.

- [ ] **Step 3: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/data.ts
git commit -m "feat(leaderboard-vars): switch game page loader to per-variable query model"
```

---

### Task 8: Update `app/(new-layout)/games-v2/[game]/types.ts`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/types.ts`

**Rationale:** Mirror the new `activeFilters` shape from `data.ts`. Drop the `subcategoryHash` and `selectedSubcategoryValues` fields, add `subcategoryValues` + `combined` + `validCombinations` + `invalidCombination` + `reservedParams`.

- [ ] **Step 1: Replace the file.**

```typescript
import type {
    LeaderboardResponse,
    QuickStats,
    RecentPb,
    ResolvedCategory,
    ResolvedGame,
    ValidCombinations,
    VariableDef,
} from '../../../../types/leaderboards.types';

export interface GamePageSearchParams {
    category?: string;
    combined?: string;
    verified?: string;
    page?: string;
    pageSize?: string;
    [key: string]: string | undefined;
}

export interface GamePageData {
    game: ResolvedGame;
    selectedCategory: ResolvedCategory;
    categories: ResolvedCategory[];
    variables: VariableDef[];
    reservedParams: string[];
    validCombinations: ValidCombinations;
    leaderboard: LeaderboardResponse;
    invalidCombination: { validCombinations: string[] } | null;
    quickStats: QuickStats;
    recentPbs: RecentPb[];
    sessionUsername: string | null;
    activeFilters: {
        subcategoryValues: Record<string, string>;
        varFilters: Record<string, string>;
        combined: boolean;
        verified: boolean;
        page: number;
        pageSize: number;
    };
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run typecheck`
Expected: `data.ts` is now clean for the parts that consume these types. `game-page.tsx`, `filter-bar.tsx`, `subcategory-pills.tsx`, `sidebar.tsx`, etc., still error.

- [ ] **Step 3: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/types.ts
git commit -m "refactor(leaderboard-vars): align GamePageData with per-variable query model"
```

---

### Task 9: Rewrite `filters/subcategory-pills.tsx`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/filters/subcategory-pills.tsx`

**Rationale:** Drop hash computation and the `subvar_` prefix. Each subcategory variable's selected value is now a top-level query param keyed by `nameNormalized`. Buttons render bucket canonicals (`def.values[i][0]`); the active selection comes from the URL or `defaultValueIndex`.

- [ ] **Step 1: Replace the file.**

```typescript
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

function canonicalOf(def: VariableDef, idx: number): string {
    const bucket = def.values[idx];
    return bucket?.[0] ?? '';
}

export function SubcategoryPills({ defs, selected }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const subcatDefs = defs.filter((d) => d.role === 'subcategory');
    if (subcatDefs.length === 0) return null;

    const onPick = (def: VariableDef, value: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set(def.nameNormalized, value);
        sp.delete('page');
        sp.delete('combined');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    return (
        <div className="d-flex flex-column gap-2 mb-3">
            {subcatDefs.map((def) => {
                const defaultCanonical =
                    def.defaultValueIndex != null
                        ? canonicalOf(def, def.defaultValueIndex)
                        : '';
                const activeValue =
                    selected[def.nameNormalized] ?? defaultCanonical;
                return (
                    <div
                        key={def.nameNormalized}
                        className="d-flex align-items-center gap-2 flex-wrap"
                    >
                        <span className="small text-muted">{def.name}:</span>
                        {def.values.map((bucket, idx) => {
                            const canonical = bucket[0];
                            const isActive = activeValue === canonical;
                            return (
                                <button
                                    key={`${def.nameNormalized}-${idx}`}
                                    type="button"
                                    onClick={() => onPick(def, canonical)}
                                    disabled={isPending}
                                    aria-pressed={isActive}
                                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    title={
                                        bucket.length > 1
                                            ? `Aliases: ${bucket.slice(1).join(', ')}`
                                            : undefined
                                    }
                                >
                                    {canonical}
                                </button>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run typecheck`
Expected: this file clean. `filter-bar.tsx`, `variable-pill.tsx` still error.

- [ ] **Step 3: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/filters/subcategory-pills.tsx
git commit -m "feat(leaderboard-vars): drop client-side hashing in subcategory pills"
```

---

### Task 10: Update `filters/variable-pill.tsx`, `filters/variable-pills.tsx`, `filters/filter-bar.tsx`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/filters/variable-pill.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/variable-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/filter-bar.tsx`

**Rationale:** Filter pills drop the `var_` prefix and read/write directly by `nameNormalized`. Display uses `def.name`; option labels use bucket canonicals. Multi-select still serializes as comma-joined (backend accepts CSV via the canonical form).

- [ ] **Step 1: Replace `variable-pill.tsx`.**

```typescript
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';

interface Props {
    def: VariableDef;
    selectedValues: string[];
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

export function VariablePill({
    def,
    selectedValues,
    isOpen,
    onOpen,
    onClose,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    const setValues = (next: string[]) => {
        const sp = new URLSearchParams(searchParams.toString());
        if (next.length === 0) sp.delete(def.nameNormalized);
        else sp.set(def.nameNormalized, next.join(','));
        sp.delete('page');
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    const toggle = (v: string) => {
        const has = selectedValues.includes(v);
        setValues(
            has
                ? selectedValues.filter((x) => x !== v)
                : [...selectedValues, v],
        );
    };

    const label =
        selectedValues.length === 0
            ? def.name
            : `${def.name}: ${selectedValues.join(', ')}`;

    return (
        <div className="position-relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => (isOpen ? onClose() : onOpen())}
                disabled={isPending}
                className={`btn btn-sm ${selectedValues.length > 0 ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
                {label}
            </button>
            {isOpen && (
                <div
                    className="position-absolute mt-1 p-2 border rounded bg-body shadow-sm"
                    style={{ zIndex: 10, minWidth: '12rem' }}
                >
                    {def.values.map((bucket, idx) => {
                        const canonical = bucket[0];
                        return (
                            <label
                                key={`${def.nameNormalized}-${idx}`}
                                className="d-block"
                                title={
                                    bucket.length > 1
                                        ? `Aliases: ${bucket.slice(1).join(', ')}`
                                        : undefined
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValues.includes(canonical)}
                                    onChange={() => toggle(canonical)}
                                    className="me-1"
                                />
                                {canonical}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Replace `variable-pills.tsx`.**

```typescript
'use client';

import { useState } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import { VariablePill } from './variable-pill';

interface Props {
    defs: VariableDef[];
    selected: Record<string, string>;
}

export function VariablePills({ defs, selected }: Props) {
    const [openName, setOpenName] = useState<string | null>(null);

    if (defs.length === 0) return null;

    return (
        <div className="d-flex gap-2 flex-wrap mb-2">
            {defs.map((def) => (
                <VariablePill
                    key={def.nameNormalized}
                    def={def}
                    selectedValues={
                        selected[def.nameNormalized]
                            ?.split(',')
                            .filter(Boolean) ?? []
                    }
                    isOpen={openName === def.nameNormalized}
                    onOpen={() => setOpenName(def.nameNormalized)}
                    onClose={() => setOpenName(null)}
                />
            ))}
        </div>
    );
}
```

- [ ] **Step 3: Update `filter-bar.tsx`.**

```typescript
import type { VariableDef } from '../../../../../types/leaderboards.types';
import { SubcategoryPills } from './subcategory-pills';
import { VariablePills } from './variable-pills';
import { VerifiedToggle } from './verified-toggle';

interface Props {
    defs: VariableDef[];
    selectedSubcategoryValues: Record<string, string>;
    selectedVarFilters: Record<string, string>;
    verified: boolean;
}

export function FilterBar({
    defs,
    selectedSubcategoryValues,
    selectedVarFilters,
    verified,
}: Props) {
    const filterDefs = defs.filter((d) => d.role === 'filter');

    return (
        <div className="mb-3">
            <SubcategoryPills
                defs={defs}
                selected={selectedSubcategoryValues}
            />
            <VariablePills defs={filterDefs} selected={selectedVarFilters} />
            <VerifiedToggle verified={verified} />
        </div>
    );
}
```

- [ ] **Step 4: Typecheck.**

Run: `npm run typecheck`
Expected: filter components clean.

- [ ] **Step 5: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/filters/
git commit -m "feat(leaderboard-vars): switch filter pills to per-variable normalized keys"
```

---

### Task 11: Update `header/category-pills.tsx` and `filters/clear-filters-button.tsx`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/header/category-pills.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/filters/clear-filters-button.tsx`

**Rationale:** Both files clear `var_*`/`subvar_*` prefixed params today. With prefixes gone, they need the list of variable names from the loaded defs to know what to drop. Pass the defs (or a set of `nameNormalized`s) down from `game-page.tsx`.

- [ ] **Step 1: Update `category-pills.tsx` to accept and clear variable names.**

```typescript
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';

interface Props {
    categories: ResolvedCategory[];
    selectedCategoryName: string;
    variableKeys: string[];
}

const FALLBACK_VISIBLE_COUNT = 5;

export function CategoryPills({
    categories,
    selectedCategoryName,
    variableKeys,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [expanded, setExpanded] = useState(false);

    const { visible, hiddenCount } = useMemo(() => {
        const mains = categories.filter((c) => c.isMain);
        const base =
            mains.length > 0
                ? mains
                : categories.slice(0, FALLBACK_VISIBLE_COUNT);
        const baseIds = new Set(base.map((c) => c.id));

        const selected = categories.find(
            (c) => c.name === selectedCategoryName,
        );
        const withSelected =
            selected && !baseIds.has(selected.id) ? [...base, selected] : base;
        const visibleIds = new Set(withSelected.map((c) => c.id));
        const hidden = categories.filter((c) => !visibleIds.has(c.id));

        return {
            visible: expanded ? categories : withSelected,
            hiddenCount: hidden.length,
        };
    }, [categories, selectedCategoryName, expanded]);

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('category', name);
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        startTransition(() => {
            router.push(`${pathname}?${sp.toString()}`);
        });
    };

    if (categories.length <= 1) return null;

    return (
        <nav className="d-flex gap-2 flex-wrap mb-3" aria-label="Category">
            {visible.map((c) => {
                const active = c.name === selectedCategoryName;
                return (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelect(c.name)}
                        disabled={isPending}
                        aria-pressed={active}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                        {c.display}
                    </button>
                );
            })}
            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="btn btn-sm btn-link"
                >
                    {expanded
                        ? 'Show fewer'
                        : `Show ${hiddenCount} more categor${hiddenCount === 1 ? 'y' : 'ies'}`}
                </button>
            )}
        </nav>
    );
}
```

- [ ] **Step 2: Update `clear-filters-button.tsx` to accept and clear variable names.**

```typescript
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

interface Props {
    variableKeys: string[];
}

export function ClearFiltersButton({ variableKeys }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const onClick = () => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete('verified');
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        const qs = sp.toString();
        startTransition(() => {
            router.push(qs ? `${pathname}?${qs}` : pathname);
        });
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isPending}
            className="btn btn-sm btn-outline-secondary mt-2"
        >
            Clear filters
        </button>
    );
}
```

- [ ] **Step 3: Update `LeaderboardTable` to thread `variableKeys` to `ClearFiltersButton`.**

`app/(new-layout)/games-v2/[game]/leaderboard/leaderboard-table.tsx`:

```typescript
// Add to Props:
//     variableKeys: string[];
// Pass through from game-page.tsx (Task 15).
// When entries.length === 0, render: <ClearFiltersButton variableKeys={variableKeys} />
```

Replace the file:

```typescript
import type { LeaderboardResponse } from '../../../../../types/leaderboards.types';
import { ClearFiltersButton } from '../filters/clear-filters-button';
import { LeaderboardRow } from './leaderboard-row';

interface Props {
    leaderboard: LeaderboardResponse;
    sessionUsername: string | null;
    canManage: boolean;
    gameSlug: string;
    variableKeys: string[];
}

export function LeaderboardTable({
    leaderboard,
    sessionUsername,
    canManage,
    gameSlug,
    variableKeys,
}: Props) {
    if (leaderboard.entries.length === 0) {
        return (
            <div className="text-center my-4">
                <p className="text-muted">No runs match these filters.</p>
                <ClearFiltersButton variableKeys={variableKeys} />
            </div>
        );
    }

    const { hideRealTime, hideGameTime } = leaderboard;

    return (
        <table className="table table-hover">
            <thead>
                <tr>
                    <th style={{ width: '6%' }}>#</th>
                    <th>Runner</th>
                    {!hideRealTime && <th>Real Time</th>}
                    {!hideGameTime && <th>Game Time</th>}
                    <th>Date</th>
                    <th>VOD</th>
                    <th>Verified</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                {leaderboard.entries.map((entry) => (
                    <LeaderboardRow
                        key={entry.runId ?? `${entry.runnerName}-${entry.rank}`}
                        entry={entry}
                        isCurrentUser={
                            sessionUsername !== null &&
                            entry.runnerName === sessionUsername
                        }
                        canManage={canManage}
                        gameSlug={gameSlug}
                        hideRealTime={hideRealTime}
                        hideGameTime={hideGameTime}
                    />
                ))}
            </tbody>
        </table>
    );
}
```

- [ ] **Step 4: Typecheck.**

Run: `npm run typecheck`
Expected: header + filter + table files clean. `game-page.tsx` errors until Task 15 passes `variableKeys` through.

- [ ] **Step 5: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/header/category-pills.tsx app/\(new-layout\)/games-v2/\[game\]/filters/clear-filters-button.tsx app/\(new-layout\)/games-v2/\[game\]/leaderboard/leaderboard-table.tsx
git commit -m "feat(leaderboard-vars): thread variable keys through category/clear/table for selective param clearing"
```

---

### Task 12: Update `sidebar/sidebar.tsx`, `sidebar/wr-card.tsx`, `drawers/wr-history-drawer.tsx`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/sidebar.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/sidebar/wr-card.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/drawers/wr-history-drawer.tsx`

**Rationale:** All three propagate `subcategoryHash` today. The sidebar needs to build the key from `subcategoryValues` (canonical fragment) so the WR card and history drawer reference the right board. The drawer keeps the wire-side `?subcategory=…` param name (backend back-compat) but passes the plain-text key.

- [ ] **Step 1: Update `wr-history-drawer.tsx`.**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Modal, Table } from 'react-bootstrap';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { WrHistoryEntry } from '../../../../../types/leaderboards.types';

interface Props {
    show: boolean;
    onHide: () => void;
    gameSlug: string;
    categorySlug: string;
    categoryDisplay: string;
    subcategoryKey: string;
}

export function WrHistoryDrawer({
    show,
    onHide,
    gameSlug,
    categorySlug,
    categoryDisplay,
    subcategoryKey,
}: Props) {
    const [history, setHistory] = useState<WrHistoryEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!show) return;
        let cancelled = false;
        setHistory(null);
        setError(null);
        const url = `${process.env.NEXT_PUBLIC_DATA_URL}/v1/leaderboards/wr-history/${encodeURIComponent(gameSlug)}/${encodeURIComponent(categorySlug)}?subcategory=${encodeURIComponent(subcategoryKey)}`;
        fetch(url)
            .then((r) => {
                if (!r.ok) throw new Error(`${r.status}`);
                return r.json();
            })
            .then((j) => {
                if (cancelled) return;
                setHistory(j.result ?? []);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e.message ?? 'Failed to load');
            });
        return () => {
            cancelled = true;
        };
    }, [show, gameSlug, categorySlug, subcategoryKey]);

    return (
        <Modal show={show} onHide={onHide} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>
                    World record history — {categoryDisplay}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <p className="text-danger">
                        Failed to load WR history: {error}
                    </p>
                )}
                {!error && history === null && (
                    <p className="text-muted">Loading…</p>
                )}
                {history !== null && history.length === 0 && (
                    <p className="text-muted">No world record history yet.</p>
                )}
                {history !== null && history.length > 0 && (
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th>Runner</th>
                                <th>Time</th>
                                <th>Timing</th>
                                <th>Set</th>
                                <th>Superseded</th>
                                <th>Held for</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((wr) => {
                                const setAt = new Date(wr.setAt);
                                const supersededAt = wr.supersededAt
                                    ? new Date(wr.supersededAt)
                                    : null;
                                const heldMs =
                                    (supersededAt ?? new Date()).getTime() -
                                    setAt.getTime();
                                return (
                                    <tr key={`${wr.runnerName}-${wr.setAt}`}>
                                        <td>{wr.runnerName}</td>
                                        <td>
                                            <DurationToFormatted
                                                duration={wr.time}
                                            />
                                        </td>
                                        <td>{wr.timingMethod}</td>
                                        <td>{setAt.toLocaleDateString()}</td>
                                        <td>
                                            {supersededAt
                                                ? supersededAt.toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td>
                                            <DurationToFormatted
                                                duration={heldMs}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                )}
            </Modal.Body>
        </Modal>
    );
}
```

- [ ] **Step 2: Update `wr-card.tsx`.**

```typescript
'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardResponse,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';

const WrHistoryDrawer = dynamic(
    () => import('../drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);

interface Props {
    leaderboard: LeaderboardResponse;
    category: ResolvedCategory;
    gameSlug: string;
    subcategoryKey: string;
}

export function WrCard({
    leaderboard,
    category,
    gameSlug,
    subcategoryKey,
}: Props) {
    const [open, setOpen] = useState(false);
    const top = leaderboard.entries[0];
    if (!top || top.time === null) return null;

    return (
        <section className="border rounded p-3 mb-3">
            <div className="d-flex justify-content-between align-items-baseline">
                <small className="text-muted">World Record</small>
                <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => setOpen(true)}
                >
                    History
                </button>
            </div>
            <div className="fs-4 fw-bold">
                <DurationToFormatted duration={top.time} />
            </div>
            <div>
                <UserLink username={top.runnerName} url={undefined} />
            </div>
            {top.runDate && (
                <small className="text-muted">
                    Set {new Date(top.runDate).toLocaleDateString()}
                </small>
            )}
            {top.vodUrl && (
                <div className="mt-2">
                    <a href={top.vodUrl} target="_blank" rel="noreferrer">
                        Watch VOD
                    </a>
                </div>
            )}
            {open && (
                <WrHistoryDrawer
                    show={open}
                    onHide={() => setOpen(false)}
                    gameSlug={gameSlug}
                    categorySlug={category.name}
                    categoryDisplay={category.display}
                    subcategoryKey={subcategoryKey}
                />
            )}
        </section>
    );
}
```

- [ ] **Step 3: Update `sidebar.tsx` to build the subcategory key from active filters.**

Build the canonical fragment matching what the server uses. Place a small helper next to the file (or inline) so the WR card and the drawer agree on the form.

```typescript
import type { GamePageData } from '../types';
import { LivePanel } from './live-panel';
import { QuickStatsPanel } from './quick-stats-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import { WrCard } from './wr-card';

interface Props {
    data: GamePageData;
}

function buildSubcategoryKey(values: Record<string, string>): string {
    const keys = Object.keys(values).sort();
    return keys.map((k) => `${k}=${values[k]}`).join('|');
}

export function Sidebar({ data }: Props) {
    const subcategoryKey = data.activeFilters.combined
        ? ''
        : buildSubcategoryKey(data.activeFilters.subcategoryValues);
    return (
        <>
            <WrCard
                leaderboard={data.leaderboard}
                category={data.selectedCategory}
                gameSlug={data.game.name}
                subcategoryKey={subcategoryKey}
            />
            <LivePanel gameDisplay={data.game.display} />
            <RecentPbsPanel pbs={data.recentPbs} />
            <QuickStatsPanel stats={data.quickStats} />
        </>
    );
}
```

- [ ] **Step 4: Typecheck.**

Run: `npm run typecheck`
Expected: sidebar trio clean.

- [ ] **Step 5: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/sidebar/ app/\(new-layout\)/games-v2/\[game\]/drawers/wr-history-drawer.tsx
git commit -m "feat(leaderboard-vars): rename WR card/drawer hash to subcategoryKey, build key from active values"
```

---

### Task 13: Surface invalid-combination 404 in `game-page.tsx` and thread `variableKeys`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/game-page.tsx`

**Rationale:** Last piece of Phase 2. Make `game-page.tsx` pass `variableKeys` through to `CategoryPills` and `LeaderboardTable`, and render a friendly empty state when `data.invalidCombination` is set. Suggestions are clickable buttons that swap query params and navigate.

- [ ] **Step 1: Replace the file.**

```typescript
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FilterBar } from './filters/filter-bar';
import { CategoryPills } from './header/category-pills';
import { GameHeader } from './header/game-header';
import { LeaderboardTable } from './leaderboard/leaderboard-table';
import { PaginationBar } from './leaderboard/pagination-bar';
import { Sidebar } from './sidebar/sidebar';
import type { GamePageData } from './types';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    canInvalidateCache: boolean;
}

function parseSubcategoryKey(key: string): Record<string, string> {
    if (!key) return {};
    const out: Record<string, string> = {};
    for (const pair of key.split('|')) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        out[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
    return out;
}

export function GamePage({
    data,
    canManage,
    canManageRuns,
    canInvalidateCache,
}: Props) {
    const variableKeys = useMemo(
        () => data.variables.map((v) => v.nameNormalized),
        [data.variables],
    );

    if (data.categories.length === 0) {
        return (
            <div>
                <GameHeader
                    game={data.game}
                    stats={data.quickStats}
                    canManage={canManage}
                    canInvalidateCache={canInvalidateCache}
                />
                <p className="text-center text-muted my-5">
                    No runs uploaded for this game yet.
                </p>
            </div>
        );
    }

    return (
        <div>
            <GameHeader
                game={data.game}
                stats={data.quickStats}
                canManage={canManage}
                canInvalidateCache={canInvalidateCache}
            />
            <CategoryPills
                categories={data.categories}
                selectedCategoryName={data.selectedCategory.name}
                variableKeys={variableKeys}
            />
            <div className="row">
                <div className="col-lg-8">
                    <FilterBar
                        defs={data.variables}
                        selectedSubcategoryValues={
                            data.activeFilters.subcategoryValues
                        }
                        selectedVarFilters={data.activeFilters.varFilters}
                        verified={data.activeFilters.verified}
                    />
                    {data.invalidCombination ? (
                        <InvalidCombinationNotice
                            gameSlug={data.game.name}
                            categorySlug={data.selectedCategory.name}
                            suggestions={
                                data.invalidCombination.validCombinations
                            }
                        />
                    ) : (
                        <>
                            <LeaderboardTable
                                leaderboard={data.leaderboard}
                                sessionUsername={data.sessionUsername}
                                canManage={canManageRuns}
                                gameSlug={data.game.name}
                                variableKeys={variableKeys}
                            />
                            <PaginationBar
                                page={data.leaderboard.page}
                                totalPages={data.leaderboard.totalPages}
                            />
                        </>
                    )}
                </div>
                <div className="col-lg-4">
                    <Sidebar data={data} />
                </div>
            </div>
        </div>
    );
}

function InvalidCombinationNotice({
    gameSlug,
    categorySlug,
    suggestions,
}: {
    gameSlug: string;
    categorySlug: string;
    suggestions: string[];
}) {
    return (
        <div className="border rounded p-4 my-3 text-center">
            <h3 className="h5 mb-2">No leaderboard for this combination</h3>
            <p className="text-muted small">
                The variable combination you picked isn't an active board for
                this category. Try one of these instead:
            </p>
            <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                {suggestions.slice(0, 12).map((key) => {
                    const values = parseSubcategoryKey(key);
                    const sp = new URLSearchParams();
                    sp.set('category', categorySlug);
                    for (const [k, v] of Object.entries(values)) sp.set(k, v);
                    return (
                        <Link
                            key={key}
                            href={`/games-v2/${gameSlug}?${sp.toString()}`}
                            className="btn btn-sm btn-outline-secondary"
                        >
                            {key.replace(/\|/g, ' · ')}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Full project typecheck.**

Run: `npm run typecheck`
Expected: Phase 2 surfaces clean. Phase 3 (manage variables) and Phase 4 (manage run + minimums) files still error.

- [ ] **Step 3: Quick smoke test in the browser.**

Run: `npm run dev`
Manual checks:
- Open any game page that has subcategory variables. Confirm subcategory pills render canonicals and update the URL to flat `?<name>=<value>` (no `subcategory=` hash, no `subvar_` prefix).
- Confirm filter pills update URL to `?<name>=<value>` (no `var_` prefix).
- Switch category — confirm variable params are cleared.
- Hit a guaranteed-invalid combination by manually editing the URL — confirm the "No leaderboard for this combination" notice renders with clickable suggestions.

- [ ] **Step 4: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/game-page.tsx
git commit -m "feat(leaderboard-vars): surface invalid-combination empty state with suggestions"
```

---

## Phase 3 — Manage > Variables: admin UI rewrite

The biggest UX work. The form gains a bucket editor, a role selector, a default-index dropdown, a description field, and reserved-name validation. The list groups by role. The action layer switches to upsert-by-name and body-based delete.

### Task 14: Update `variable-row.tsx`

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/variable-row.tsx`

**Rationale:** The row needs to render the new shape. Replace `row.display` with `row.name` (the canonical display in the new contract), render each bucket as `canonical (alias1, alias2)`, and surface the default bucket via `row.defaultValueIndex`. Add a role badge so subcategory vs filter is obvious at a glance even though the sections also separate them.

- [ ] **Step 1: Replace the file.**

```typescript
'use client';

import type { VariableRow as VariableRowData } from '../../../../../../types/leaderboards.types';

interface Props {
    row: VariableRowData;
    isFirst: boolean;
    isLast: boolean;
    onEdit: (row: VariableRowData) => void;
    onDelete: (row: VariableRowData) => void;
    onMoveUp: (row: VariableRowData) => void;
    onMoveDown: (row: VariableRowData) => void;
    isBusy: boolean;
}

function describeBucket(bucket: string[]): string {
    if (bucket.length <= 1) return bucket[0] ?? '';
    return `${bucket[0]} (${bucket.slice(1).join(', ')})`;
}

export function VariableRow({
    row,
    isFirst,
    isLast,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    isBusy,
}: Props) {
    const defaultLabel =
        row.role === 'subcategory' && row.defaultValueIndex != null
            ? (row.values[row.defaultValueIndex]?.[0] ?? '—')
            : '—';
    const roleBadge =
        row.role === 'subcategory' ? 'text-bg-primary' : 'text-bg-secondary';

    return (
        <tr>
            <td className="text-nowrap" style={{ width: '5rem' }}>
                <div className="btn-group btn-group-sm" role="group">
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onMoveUp(row)}
                        disabled={isBusy || isFirst}
                        aria-label="Move up"
                    >
                        ↑
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onMoveDown(row)}
                        disabled={isBusy || isLast}
                        aria-label="Move down"
                    >
                        ↓
                    </button>
                </div>
            </td>
            <td title={row.description ?? undefined}>
                <strong>{row.name}</strong>{' '}
                <span className={`badge ${roleBadge} ms-2`}>{row.role}</span>
                <div>
                    <code className="small text-muted">
                        {row.nameNormalized}
                    </code>
                </div>
            </td>
            <td>
                <ul className="list-unstyled mb-0 small">
                    {row.values.map((bucket, idx) => (
                        <li
                            key={`${row.id}-${idx}`}
                            className={
                                row.defaultValueIndex === idx
                                    ? 'fw-semibold'
                                    : undefined
                            }
                        >
                            {describeBucket(bucket)}
                            {row.defaultValueIndex === idx && (
                                <span className="badge text-bg-light ms-1">
                                    default
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </td>
            <td className="text-muted small">{defaultLabel}</td>
            <td>{row.sortOrder}</td>
            <td className="text-end">
                <div className="d-flex gap-1 justify-content-end">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onEdit(row)}
                        disabled={isBusy}
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => onDelete(row)}
                        disabled={isBusy}
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run typecheck`
Expected: this file clean; `variables-section.tsx` and the actions still error.

- [ ] **Step 3: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/variables/variable-row.tsx
git commit -m "feat(leaderboard-vars): render new VariableRow shape with buckets, role, and default badge"
```

---

### Task 15: Rewrite `variable-form.tsx` with bucket editor + role + default + description

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/variable-form.tsx`

**Rationale:** The biggest UX deliverable. Bucket editor with optional aliases per row keeps the common case (one alias per bucket) as a plain text list. Role radio with explainer copy. Default dropdown rendering canonicals. Reserved-name guardrail check before submit. Description textarea.

**UX summary:**
- *Values*: one input per row. Each row has a `+ aliases` link that expands a comma-separated aliases input. Reorderable via up/down arrows (optional polish — skip if buckets-order doesn't matter beyond `defaultValueIndex`).
- *Role*: radio with descriptive copy. Disabled in edit mode.
- *Default bucket*: dropdown of canonicals. Required + visible only when role=subcategory. Auto-selects bucket 0 on create.
- *Reserved names*: if `nameNormalized` collides with the `reservedParams` list, show inline warning under the name field, block submit.
- *Description*: optional textarea, 2 rows.

- [ ] **Step 1: Replace the file.**

```typescript
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { VariableRow } from '../../../../../../types/leaderboards.types';

export interface VariableFormValues {
    name: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex: number | null;
    sortOrder: number;
    description: string | null;
}

interface Bucket {
    canonical: string;
    aliasesText: string;
    aliasesExpanded: boolean;
}

interface Props {
    mode: 'create' | 'edit';
    editing?: VariableRow | null;
    reservedParams: string[];
    onSubmit: (values: VariableFormValues) => void;
    onCancel: () => void;
    isBusy: boolean;
    error: string | null;
}

function normalizeName(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[=|]/g, '');
}

function bucketsFromRow(row: VariableRow): Bucket[] {
    return row.values.map((v) => ({
        canonical: v[0] ?? '',
        aliasesText: v.slice(1).join(', '),
        aliasesExpanded: v.length > 1,
    }));
}

function bucketsToValues(buckets: Bucket[]): string[][] {
    return buckets
        .map((b) => {
            const canonical = b.canonical.trim();
            const aliases = b.aliasesText
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean);
            return canonical ? [canonical, ...aliases] : [];
        })
        .filter((bucket) => bucket.length > 0);
}

export function VariableForm({
    mode,
    editing,
    reservedParams,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const [name, setName] = useState(editing?.name ?? '');
    const [role, setRole] = useState<'subcategory' | 'filter'>(
        editing?.role ?? 'subcategory',
    );
    const [buckets, setBuckets] = useState<Bucket[]>(
        editing
            ? bucketsFromRow(editing)
            : [
                  { canonical: '', aliasesText: '', aliasesExpanded: false },
              ],
    );
    const [defaultIdx, setDefaultIdx] = useState<number>(
        editing?.defaultValueIndex ?? 0,
    );
    const [sortOrder, setSortOrder] = useState<number>(editing?.sortOrder ?? 0);
    const [description, setDescription] = useState<string>(
        editing?.description ?? '',
    );
    const [localError, setLocalError] = useState<string | null>(null);

    // Keep defaultIdx within range when the user removes a bucket.
    useEffect(() => {
        if (defaultIdx >= buckets.length) {
            setDefaultIdx(Math.max(0, buckets.length - 1));
        }
    }, [buckets.length, defaultIdx]);

    const reservedLower = useMemo(
        () => new Set(reservedParams.map((r) => r.toLowerCase())),
        [reservedParams],
    );
    const normalizedName = useMemo(() => normalizeName(name), [name]);
    const nameCollidesReserved =
        normalizedName.length > 0 && reservedLower.has(normalizedName);

    const setBucket = (idx: number, patch: Partial<Bucket>) => {
        setBuckets((prev) =>
            prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
        );
    };

    const removeBucket = (idx: number) => {
        setBuckets((prev) => prev.filter((_, i) => i !== idx));
    };

    const addBucket = () => {
        setBuckets((prev) => [
            ...prev,
            { canonical: '', aliasesText: '', aliasesExpanded: false },
        ]);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        const cleanName = name.trim();
        if (cleanName.length === 0) {
            setLocalError('Name is required.');
            return;
        }
        if (cleanName.length > 64) {
            setLocalError('Name must be 64 characters or fewer.');
            return;
        }
        if (!/[a-z0-9]/i.test(normalizedName)) {
            setLocalError(
                'Name must contain at least one alphanumeric character.',
            );
            return;
        }
        if (nameCollidesReserved) {
            setLocalError(
                `"${normalizedName}" is reserved. Pick a different name.`,
            );
            return;
        }

        const values = bucketsToValues(buckets);
        if (values.length === 0) {
            setLocalError('Add at least one value bucket.');
            return;
        }

        // Detect aliases that collide after normalization within or across
        // buckets — friendlier than waiting for the backend 400.
        const seen = new Map<string, number>();
        for (let i = 0; i < values.length; i++) {
            for (const v of values[i]) {
                const norm = normalizeName(v);
                if (seen.has(norm)) {
                    setLocalError(
                        `Value "${v}" collides (normalized: "${norm}") with another value.`,
                    );
                    return;
                }
                seen.set(norm, i);
            }
        }

        let resolvedDefault: number | null = null;
        if (role === 'subcategory') {
            if (defaultIdx < 0 || defaultIdx >= values.length) {
                setLocalError('Pick a default value.');
                return;
            }
            resolvedDefault = defaultIdx;
        }

        onSubmit({
            name: cleanName,
            role,
            values,
            defaultValueIndex: resolvedDefault,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
            description: description.trim() || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="border rounded p-3 mb-3">
            <div className="row g-2">
                <div className="col-md-6">
                    <label
                        htmlFor="var-name"
                        className="form-label small mb-1"
                    >
                        Name
                    </label>
                    <input
                        id="var-name"
                        type="text"
                        className={`form-control form-control-sm ${nameCollidesReserved ? 'is-invalid' : ''}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Platform"
                        disabled={isBusy || mode === 'edit'}
                    />
                    <small className="text-muted d-block">
                        URL key:{' '}
                        <code>{normalizedName || '(enter a name)'}</code>
                    </small>
                    {nameCollidesReserved && (
                        <small className="text-danger d-block">
                            Reserved name. Reserved:{' '}
                            <code>{reservedParams.join(', ')}</code>
                        </small>
                    )}
                </div>
                <div className="col-md-3">
                    <label
                        htmlFor="var-sort"
                        className="form-label small mb-1"
                    >
                        Sort order
                    </label>
                    <input
                        id="var-sort"
                        type="number"
                        className="form-control form-control-sm"
                        value={sortOrder}
                        onChange={(e) =>
                            setSortOrder(
                                Number.parseInt(e.target.value, 10) || 0,
                            )
                        }
                        disabled={isBusy}
                    />
                </div>
            </div>

            <fieldset className="mt-3" disabled={isBusy || mode === 'edit'}>
                <legend className="form-label small mb-1">Role</legend>
                <div className="form-check">
                    <input
                        id="var-role-sub"
                        type="radio"
                        className="form-check-input"
                        name="var-role"
                        checked={role === 'subcategory'}
                        onChange={() => setRole('subcategory')}
                    />
                    <label className="form-check-label" htmlFor="var-role-sub">
                        <strong>Subcategory</strong> — splits the category into
                        separate boards (e.g. <code>platform</code> with PC vs
                        N64). Always has a default; missing values fall back.
                    </label>
                </div>
                <div className="form-check">
                    <input
                        id="var-role-filter"
                        type="radio"
                        className="form-check-input"
                        name="var-role"
                        checked={role === 'filter'}
                        onChange={() => setRole('filter')}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="var-role-filter"
                    >
                        <strong>Filter</strong> — refines results within a
                        board (e.g. <code>region</code> selectable as US/JP).
                        Optional per run.
                    </label>
                </div>
                {mode === 'edit' && (
                    <small className="text-muted d-block mt-1">
                        Role is locked once a variable exists. To change role,
                        delete and recreate.
                    </small>
                )}
            </fieldset>

            <div className="mt-3">
                <label className="form-label small mb-1">Values</label>
                <div className="d-flex flex-column gap-2">
                    {buckets.map((bucket, idx) => (
                        <div
                            key={idx}
                            className="border rounded p-2 d-flex flex-column gap-1"
                        >
                            <div className="d-flex gap-2 align-items-center">
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={bucket.canonical}
                                    onChange={(e) =>
                                        setBucket(idx, {
                                            canonical: e.target.value,
                                        })
                                    }
                                    placeholder="Nintendo 64"
                                    disabled={isBusy}
                                />
                                <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0 text-nowrap"
                                    onClick={() =>
                                        setBucket(idx, {
                                            aliasesExpanded:
                                                !bucket.aliasesExpanded,
                                        })
                                    }
                                    disabled={isBusy}
                                >
                                    {bucket.aliasesExpanded
                                        ? '− aliases'
                                        : '+ aliases'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeBucket(idx)}
                                    disabled={isBusy || buckets.length <= 1}
                                    aria-label="Remove value"
                                >
                                    ×
                                </button>
                            </div>
                            {bucket.aliasesExpanded && (
                                <input
                                    type="text"
                                    className="form-control form-control-sm font-monospace"
                                    value={bucket.aliasesText}
                                    onChange={(e) =>
                                        setBucket(idx, {
                                            aliasesText: e.target.value,
                                        })
                                    }
                                    placeholder="n64, nin64 (comma-separated)"
                                    disabled={isBusy}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mt-2"
                    onClick={addBucket}
                    disabled={isBusy}
                >
                    + Add value
                </button>
                <small className="text-muted d-block mt-1">
                    The first value in each row is the canonical display.
                    Aliases catch alternate spellings from run submissions.
                </small>
            </div>

            {role === 'subcategory' && (
                <div className="mt-3">
                    <label
                        htmlFor="var-default"
                        className="form-label small mb-1"
                    >
                        Default value
                    </label>
                    <select
                        id="var-default"
                        className="form-select form-select-sm"
                        value={defaultIdx}
                        onChange={(e) =>
                            setDefaultIdx(
                                Number.parseInt(e.target.value, 10) || 0,
                            )
                        }
                        disabled={isBusy}
                    >
                        {buckets.map((b, idx) => (
                            <option key={idx} value={idx}>
                                {b.canonical.trim() || `(value ${idx + 1})`}
                            </option>
                        ))}
                    </select>
                    <small className="text-muted">
                        Used when a run doesn't specify this variable.
                    </small>
                </div>
            )}

            <div className="mt-3">
                <label
                    htmlFor="var-description"
                    className="form-label small mb-1"
                >
                    Description (optional)
                </label>
                <textarea
                    id="var-description"
                    className="form-control form-control-sm"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mod-facing note. Not shown to runners."
                    disabled={isBusy}
                />
            </div>

            {(localError || error) && (
                <div className="alert alert-danger py-2 mb-2 mt-2" role="alert">
                    {localError ?? error}
                </div>
            )}

            <div className="d-flex gap-2 justify-content-end mt-3">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onCancel}
                    disabled={isBusy}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-sm btn-primary"
                    disabled={isBusy}
                >
                    {isBusy
                        ? 'Saving…'
                        : mode === 'create'
                          ? 'Create variable'
                          : 'Save changes'}
                </button>
            </div>
        </form>
    );
}
```

- [ ] **Step 2: Typecheck this file.**

Run: `npm run typecheck`
Expected: form is clean. `variables-section.tsx` still errors because the form's props changed.

- [ ] **Step 3: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/variables/variable-form.tsx
git commit -m "feat(leaderboard-vars): rebuild variable form with bucket editor, role radio, default index, description"
```

---

### Task 16: Update the four action files

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/actions/create-variable.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/actions/update-variable.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/actions/delete-variable.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/actions/load-variables.action.ts`

**Rationale:** Create and update both call the same upsert. Delete switches from id-based URL to body-based identification. Load needs to surface `reservedParams` from the public `/variables` endpoint so the form can render the guardrail.

- [ ] **Step 1: Rewrite `create-variable.action.ts`.**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import {
    type UpsertVariableInput,
    upsertGameVariable,
} from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    body: UpsertVariableInput;
}

export async function createVariableAction(
    input: Input,
): Promise<{ result: VariableRow } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await upsertGameVariable(
            user.id,
            input.gameId,
            input.body,
        );
        await invalidateVariableTags(input.gameSlug, input.gameId, result);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to create variable.' };
    }
}

async function invalidateVariableTags(
    gameSlug: string,
    _gameId: number,
    row: VariableRow,
) {
    try {
        const { categories } = await resolveCategory(_gameId);
        const targets =
            row.categoryId == null
                ? categories
                : categories.filter((c) => c.id === row.categoryId);
        for (const cat of targets) {
            revalidateTag(`game-vars:${gameSlug}:${cat.name}`, 'hours');
        }
    } catch {
        // Best-effort.
    }
}
```

- [ ] **Step 2: Rewrite `update-variable.action.ts` (same handler as create — upsert).**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import {
    type UpsertVariableInput,
    upsertGameVariable,
} from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
    body: UpsertVariableInput;
}

export async function updateVariableAction(
    input: Input,
): Promise<{ result: VariableRow } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await upsertGameVariable(
            user.id,
            input.gameId,
            input.body,
        );
        await invalidateVariableTags(input.gameSlug, input.gameId, result);
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to update variable.' };
    }
}

async function invalidateVariableTags(
    gameSlug: string,
    _gameId: number,
    row: VariableRow,
) {
    try {
        const { categories } = await resolveCategory(_gameId);
        const targets =
            row.categoryId == null
                ? categories
                : categories.filter((c) => c.id === row.categoryId);
        for (const cat of targets) {
            revalidateTag(`game-vars:${gameSlug}:${cat.name}`, 'hours');
        }
    } catch {
        // Best-effort.
    }
}
```

- [ ] **Step 3: Rewrite `delete-variable.action.ts`.**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import { deleteGameVariable } from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number | null;
    name: string;
}

export async function deleteVariableAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        await deleteGameVariable(user.id, input.gameId, {
            categoryId: input.categoryId,
            name: input.name,
        });
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to delete variable.' };
    }

    try {
        const { categories } = await resolveCategory(input.gameId);
        const targets =
            input.categoryId == null
                ? categories
                : categories.filter((c) => c.id === input.categoryId);
        for (const cat of targets) {
            revalidateTag(`game-vars:${input.gameSlug}:${cat.name}`, 'hours');
        }
    } catch {
        // Best-effort.
    }

    return { ok: true };
}
```

- [ ] **Step 4: Rewrite `load-variables.action.ts` to also surface `reservedParams` from the public endpoint.**

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import { listGameVariables } from '~src/lib/leaderboard-variables';
import { getVariables } from '~src/lib/leaderboards-v1';
import { V1FetchError } from '~src/lib/v1-fetch';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';

interface Input {
    gameSlug: string;
    gameId: number;
}

interface LoadResult {
    variables: VariableRow[];
    reservedParams: string[];
    categories: { id: number; display: string; name: string }[];
}

export async function loadVariablesAction(
    input: Input,
): Promise<{ result: LoadResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const [variables, { categories }] = await Promise.all([
            listGameVariables(user.id, input.gameId),
            resolveCategory(input.gameId),
        ]);

        // Reserved params come from the public /variables endpoint. Any
        // category works — pick the first; fall back to a hardcoded list if
        // the call fails or the game has no categories.
        let reservedParams: string[] = [
            'combined',
            'verified',
            'country',
            'year',
            'page',
            'pagesize',
            'timing',
            'view',
        ];
        const firstCategory = categories[0];
        if (firstCategory) {
            try {
                const resp = await getVariables(
                    input.gameSlug,
                    firstCategory.name,
                );
                if (resp.reservedParams.length > 0) {
                    reservedParams = resp.reservedParams;
                }
            } catch {
                // Keep the fallback.
            }
        }

        return {
            result: {
                variables,
                reservedParams,
                categories: categories.map((c) => ({
                    id: c.id,
                    display: c.display,
                    name: c.name,
                })),
            },
        };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        if (e instanceof V1FetchError) {
            return { error: `${e.status}: ${e.message}` };
        }
        return { error: 'Failed to load variables.' };
    }
}
```

- [ ] **Step 5: Typecheck the four files.**

Run: `npm run typecheck`
Expected: actions clean. `variables-section.tsx` still errors because the create/update/delete action signatures changed.

- [ ] **Step 6: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/variables/actions/
git commit -m "feat(leaderboard-vars): switch variable actions to upsert-by-name and surface reservedParams"
```

---

### Task 17: Rewrite `variables-section.tsx` for the new shape

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/variables-section.tsx`

**Rationale:** Split each scope tab into *Subcategory variables* and *Filter variables* sections. Drop the legacy `type === 'subcategory'` filter (the section split handles that). Wire to the new actions: create/update both build an `UpsertVariableInput`, delete uses `(categoryId, name)`. Pass `reservedParams` into the form. Reorder uses the existing swap-sortOrder trick but via upsert (POST with full body) instead of the now-deleted id-based PUT — fetch the row's current body and re-upsert with the new `sortOrder`.

- [ ] **Step 1: Replace the file.**

```typescript
'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type {
    ResolvedCategory,
    VariableRow as VariableRowData,
} from '../../../../../../types/leaderboards.types';
import { createVariableAction } from './actions/create-variable.action';
import { deleteVariableAction } from './actions/delete-variable.action';
import { loadVariablesAction } from './actions/load-variables.action';
import { updateVariableAction } from './actions/update-variable.action';
import { VariableForm, type VariableFormValues } from './variable-form';
import { VariableRow } from './variable-row';

type Scope = 'game' | 'category';

type FormState =
    | { open: false }
    | { open: true; mode: 'create' }
    | { open: true; mode: 'edit'; editing: VariableRowData };

interface Props {
    gameSlug: string;
    gameId: number;
    selectedCategory: ResolvedCategory | null;
}

export function VariablesSection({
    gameSlug,
    gameId,
    selectedCategory,
}: Props) {
    const [rows, setRows] = useState<VariableRowData[]>([]);
    const [reservedParams, setReservedParams] = useState<string[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [scope, setScope] = useState<Scope>('game');
    const [formState, setFormState] = useState<FormState>({ open: false });
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const busy = isLoading || isSaving;

    const refresh = async () => {
        const res = await loadVariablesAction({ gameSlug, gameId });
        if ('error' in res) {
            setLoadError(res.error);
            setRows([]);
            setReservedParams([]);
        } else {
            setLoadError(null);
            setRows(res.result.variables);
            setReservedParams(res.result.reservedParams);
        }
    };

    useEffect(() => {
        startLoadTransition(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId]);

    const visible = (Array.isArray(rows) ? rows : [])
        .filter((r) =>
            scope === 'game'
                ? r.categoryId === null
                : selectedCategory != null &&
                  r.categoryId === selectedCategory.id,
        )
        .sort(
            (a, b) =>
                a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        );

    const subcategoryRows = visible.filter((r) => r.role === 'subcategory');
    const filterRows = visible.filter((r) => r.role === 'filter');

    const closeForm = () => {
        setFormState({ open: false });
        setFormError(null);
    };

    const handleSubmit = (values: VariableFormValues) => {
        setFormError(null);

        const categoryId =
            scope === 'category' ? (selectedCategory?.id ?? null) : null;

        if (formState.open && formState.mode === 'create') {
            startSaveTransition(async () => {
                const res = await createVariableAction({
                    gameSlug,
                    gameId,
                    body: {
                        categoryId,
                        name: values.name,
                        role: values.role,
                        values: values.values,
                        defaultValueIndex: values.defaultValueIndex,
                        sortOrder: values.sortOrder,
                        description: values.description,
                    },
                });
                if ('error' in res) {
                    setFormError(res.error);
                    return;
                }
                toast.success(`Created variable "${values.name}"`);
                closeForm();
                await refresh();
            });
            return;
        }

        if (formState.open && formState.mode === 'edit') {
            const editing = formState.editing;
            startSaveTransition(async () => {
                const res = await updateVariableAction({
                    gameSlug,
                    gameId,
                    body: {
                        // Upsert key is (gameId, categoryId, nameNormalized).
                        // Use the editing row's identity, NOT the form's
                        // (the name field is locked in edit mode anyway).
                        categoryId: editing.categoryId,
                        name: editing.name,
                        role: editing.role,
                        values: values.values,
                        defaultValueIndex: values.defaultValueIndex,
                        sortOrder: values.sortOrder,
                        description: values.description,
                    },
                });
                if ('error' in res) {
                    setFormError(res.error);
                    return;
                }
                toast.success(`Updated "${editing.name}"`);
                closeForm();
                await refresh();
            });
        }
    };

    const handleDelete = (row: VariableRowData) => {
        if (
            !window.confirm(
                `Delete variable "${row.name}"? Existing finished runs keep their resolved values until a re-resolve worker runs.`,
            )
        ) {
            return;
        }
        startSaveTransition(async () => {
            const res = await deleteVariableAction({
                gameSlug,
                gameId,
                categoryId: row.categoryId,
                name: row.name,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`Deleted "${row.name}"`);
            await refresh();
        });
    };

    const swapSortOrder = async (
        a: VariableRowData,
        b: VariableRowData,
    ) => {
        const upsertSort = async (
            row: VariableRowData,
            newSort: number,
        ) =>
            updateVariableAction({
                gameSlug,
                gameId,
                body: {
                    categoryId: row.categoryId,
                    name: row.name,
                    role: row.role,
                    values: row.values,
                    defaultValueIndex: row.defaultValueIndex,
                    sortOrder: newSort,
                    description: row.description,
                },
            });

        const aRes = await upsertSort(a, b.sortOrder);
        if ('error' in aRes) {
            toast.error(aRes.error);
            return;
        }
        const bRes = await upsertSort(b, a.sortOrder);
        if ('error' in bRes) {
            toast.error(bRes.error);
        }
        await refresh();
    };

    const handleMoveUp = (row: VariableRowData) => {
        const peers = row.role === 'subcategory' ? subcategoryRows : filterRows;
        const idx = peers.findIndex((r) => r.id === row.id);
        if (idx <= 0) return;
        startSaveTransition(() => swapSortOrder(row, peers[idx - 1]));
    };

    const handleMoveDown = (row: VariableRowData) => {
        const peers = row.role === 'subcategory' ? subcategoryRows : filterRows;
        const idx = peers.findIndex((r) => r.id === row.id);
        if (idx === -1 || idx >= peers.length - 1) return;
        startSaveTransition(() => swapSortOrder(row, peers[idx + 1]));
    };

    const categorySelected = selectedCategory != null;
    const showEmptyCategoryHint =
        scope === 'category' && !categorySelected;

    return (
        <section className="border rounded p-3 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h2 className="h5 mb-1">Leaderboard variables</h2>
                    <p className="text-muted small mb-0">
                        Subcategory variables split a category into separate
                        boards (e.g. <code>platform</code> with N64 / Switch /
                        PC). Filter variables refine results within a board
                        (e.g. <code>region</code>). Game-wide rows apply to
                        every category; category-specific rows override them
                        for one category.
                    </p>
                </div>
            </div>

            <ul className="nav nav-pills mb-3">
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${scope === 'game' ? 'active' : ''}`}
                        onClick={() => {
                            setScope('game');
                            closeForm();
                        }}
                        disabled={busy}
                    >
                        Game-wide
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        type="button"
                        className={`nav-link ${scope === 'category' ? 'active' : ''}`}
                        onClick={() => {
                            setScope('category');
                            closeForm();
                        }}
                        disabled={busy}
                    >
                        Category-specific
                        {categorySelected && (
                            <span className="ms-1 text-muted small">
                                · {selectedCategory?.display}
                            </span>
                        )}
                    </button>
                </li>
            </ul>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            {showEmptyCategoryHint && (
                <p className="text-muted">
                    Pick a category above to manage its overrides.
                </p>
            )}

            <div className="d-flex justify-content-end mb-2">
                {!formState.open &&
                    (scope === 'game' || categorySelected) && (
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() =>
                                setFormState({ open: true, mode: 'create' })
                            }
                            disabled={busy}
                        >
                            + Add variable
                        </button>
                    )}
            </div>

            {formState.open && (
                <VariableForm
                    mode={formState.mode}
                    editing={
                        formState.mode === 'edit' ? formState.editing : null
                    }
                    reservedParams={reservedParams}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                    isBusy={isSaving}
                    error={formError}
                />
            )}

            {(scope === 'game' || categorySelected) && (
                <>
                    <RoleTable
                        title="Subcategory variables"
                        rows={subcategoryRows}
                        emptyLabel={
                            scope === 'game'
                                ? 'No game-wide subcategory variables yet.'
                                : 'No category-specific subcategory variables yet.'
                        }
                        onEdit={(r) =>
                            setFormState({
                                open: true,
                                mode: 'edit',
                                editing: r,
                            })
                        }
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                    />
                    <RoleTable
                        title="Filter variables"
                        rows={filterRows}
                        emptyLabel={
                            scope === 'game'
                                ? 'No game-wide filter variables yet.'
                                : 'No category-specific filter variables yet.'
                        }
                        onEdit={(r) =>
                            setFormState({
                                open: true,
                                mode: 'edit',
                                editing: r,
                            })
                        }
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        busy={busy}
                    />
                </>
            )}
        </section>
    );
}

interface RoleTableProps {
    title: string;
    rows: VariableRowData[];
    emptyLabel: string;
    onEdit: (row: VariableRowData) => void;
    onDelete: (row: VariableRowData) => void;
    onMoveUp: (row: VariableRowData) => void;
    onMoveDown: (row: VariableRowData) => void;
    busy: boolean;
}

function RoleTable({
    title,
    rows,
    emptyLabel,
    onEdit,
    onDelete,
    onMoveUp,
    onMoveDown,
    busy,
}: RoleTableProps) {
    return (
        <div className="mb-3">
            <h3 className="h6 mb-2">{title}</h3>
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead>
                        <tr>
                            <th />
                            <th>Name</th>
                            <th>Values</th>
                            <th>Default</th>
                            <th>Sort</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-muted">
                                    {emptyLabel}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, idx) => (
                                <VariableRow
                                    key={row.id}
                                    row={row}
                                    isFirst={idx === 0}
                                    isLast={idx === rows.length - 1}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onMoveUp={onMoveUp}
                                    onMoveDown={onMoveDown}
                                    isBusy={busy}
                                />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Typecheck.**

Run: `npm run typecheck`
Expected: variables admin clean. Run + minimums files still error (Phase 4).

- [ ] **Step 3: Smoke test the admin UI.**

Run: `npm run dev`
- Open `/games-v2/<game>/manage`. Click *+ Add variable*.
- Create a subcategory variable with two buckets, one with aliases.
- Confirm it appears in the *Subcategory variables* section with the default bucket marked.
- Edit the variable, change `sortOrder`, save. Confirm the row reorders.
- Create a filter variable. Confirm it appears in the *Filter variables* section.
- Try a reserved name (e.g. `verified`). Confirm the inline warning blocks submit.
- Delete a variable. Confirm the warning copy and the row disappears.

- [ ] **Step 4: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/variables/variables-section.tsx
git commit -m "feat(leaderboard-vars): split section into subcategory/filter groups and wire to upsert-by-name actions"
```

---

## Phase 4 — Manage > Run + Minimums: propagate rename and decode keys

Smaller mechanical rename plus a UX win on the minimums form. After Phase 4, the entire codebase typechecks cleanly.

### Task 18: Propagate `subcategoryKey` rename through Manage > Run

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/manage-run-page.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/run-card.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/reject-control.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/run/[runId]/actions/reject-run.action.ts`

**Rationale:** The `RunDetail` type renamed in Task 1. Every consumer here referenced `run.subcategoryHash`; the change is mechanical. The reject action also builds cache tags from the key — same rename in the tag fragment.

- [ ] **Step 1: Update `manage-run-page.tsx`.**

Replace the `subcategoryHash` references:

```typescript
// Replace these lines:
//     {run.subcategoryHash
//         ? ` · subcategory ${run.subcategoryHash}`
//         : ''}
// With:
//     {run.subcategoryKey
//         ? ` · ${run.subcategoryKey.replace(/\|/g, ' · ')}`
//         : ''}
```

Full replacement of the subtitle block:

```typescript
<small className="text-muted">
    {run.categoryDisplay}
    {run.subcategoryKey
        ? ` · ${run.subcategoryKey.replace(/\|/g, ' · ')}`
        : ''}
</small>
```

- [ ] **Step 2: Update `run-card.tsx`.**

Change the `RejectControl` prop:

```typescript
<RejectControl
    runId={run.runId}
    gameSlug={gameSlug}
    categoryId={run.categoryId}
    subcategoryKey={run.subcategoryKey}
/>
```

- [ ] **Step 3: Update `reject-control.tsx`.**

Rename the prop:

```typescript
interface Props {
    runId: number;
    gameSlug: string;
    categoryId: number;
    subcategoryKey: string;
}

export function RejectControl({
    runId,
    gameSlug,
    categoryId,
    subcategoryKey,
}: Props) {
    // ...
    // Pass `subcategoryKey` to the action call:
    const res = await rejectRunAction({
        gameSlug,
        runId,
        categoryId,
        subcategoryKey,
        reason: reason.trim() || undefined,
    });
    // ...
}
```

- [ ] **Step 4: Update `actions/reject-run.action.ts`.**

```typescript
interface Input {
    gameSlug: string;
    runId: number;
    categoryId: number;
    subcategoryKey: string;
    reason?: string;
}

// In the function body:
//     const sub = input.subcategoryKey;
//     for (const timing of ['rt', 'gt'] as const) {
//         for (const v of ['v', 'a'] as const) {
//             revalidateTag(
//                 `lb:${game.name}:${category.name}:${sub}:${timing}:${v}`,
//                 'minutes',
//             );
//         }
//     }
```

- [ ] **Step 5: Typecheck.**

Run: `npm run typecheck`
Expected: Manage > Run clean. Minimums still errors.

- [ ] **Step 6: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/run/
git commit -m "refactor(leaderboard-vars): rename subcategoryHash to subcategoryKey in manage-run path"
```

---

### Task 19: Propagate rename through Minimums section + actions

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-form.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-row.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/subcategory-label.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/actions/upsert-minimum.action.ts`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/actions/delete-minimum.action.ts`

**Rationale:** Mechanical rename — types renamed in Task 6, propagate to the UI/actions. Decoding plain-text keys (`subcategory-label.ts`) is now actually doable and replaces the prior "we can't decode the hash" placeholder.

- [ ] **Step 1: Rewrite `subcategory-label.ts` to decode the plain-text key.**

```typescript
import type { VariableDef } from '../../../../../../types/leaderboards.types';

/**
 * Decode a plain-text `subcategoryKey` ("platform=n64|region=us") into a
 * human-readable label using the category's subcategory variable defs.
 * Falls back to the raw key if decoding fails so admins always have
 * something to click.
 */
export function describeSubcategory(
    subcategoryKey: string,
    variables: VariableDef[],
): string {
    if (!subcategoryKey) return 'Default';

    const subcatVars = new Map(
        variables
            .filter((v) => v.role === 'subcategory')
            .map((v) => [v.nameNormalized, v]),
    );
    if (subcatVars.size === 0) return subcategoryKey;

    const parts = subcategoryKey.split('|').map((pair) => {
        const eq = pair.indexOf('=');
        if (eq < 0) return pair;
        const key = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        const def = subcatVars.get(key);
        if (!def) return `${key}=${value}`;
        const bucket = def.values.find((b) =>
            b.some((alias) => alias.toLowerCase() === value.toLowerCase()),
        );
        const display = bucket?.[0] ?? value;
        return `${def.name}: ${display}`;
    });

    return parts.join(' · ');
}
```

- [ ] **Step 2: Rename in `minimum-row.tsx`.**

Just rename `row.subcategoryHash` → `row.subcategoryKey`. The `describeSubcategory` call already takes a key; only the field name changes.

```typescript
<td>{describeSubcategory(row.subcategoryKey, variables)}</td>
```

- [ ] **Step 3: Rename in `minimum-form.tsx` (kept free-text for this task; restructured in Task 20 if doing the polish phase).**

Replace `subcategoryHash` → `subcategoryKey` in state, props, and submission. Update the label from "Subcategory hash" to "Subcategory key" with placeholder copy reflecting the new format.

```typescript
export type FormSubmitValues = {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
};

// State rename:
const [subcategoryKey, setSubcategoryKey] = useState('');

// In the effect that hydrates editing:
//     setSubcategoryKey(editing.subcategoryKey);

// Submission:
//     onSubmit({ subcategoryKey, minTimeMs: rt, minGameTimeMs: gt });

// In the JSX:
//     <label className="form-label small">Subcategory key</label>
//     <input
//         ...
//         value={subcategoryKey}
//         onChange={(e) => setSubcategoryKey(e.target.value)}
//         placeholder='(empty = default — e.g. "platform=n64|region=us")'
//         disabled={mode === 'edit' || isBusy}
//     />
```

- [ ] **Step 4: Update `minimums-section.tsx`.**

```typescript
// In handleSubmit:
//     subcategoryKey: values.subcategoryKey,

// In handleDelete:
//     subcategoryKey: row.subcategoryKey,

// In the rendered rows:
//     key={row.subcategoryKey}
```

- [ ] **Step 5: Update `upsert-minimum.action.ts` and `delete-minimum.action.ts`.**

Both: rename `subcategoryHash` → `subcategoryKey` in the `Input` interface and forward to the lib function. The lib was renamed in Task 6.

- [ ] **Step 6: Typecheck the full codebase.**

Run: `npm run typecheck`
Expected: **all green**. This is the last typecheck gate before optional Phases 5.

- [ ] **Step 7: Lint.**

Run: `npm run lint`
Expected: green, possibly some import-order auto-fixes. If there are import-order errors, run `npm run lint-fix` and re-commit.

- [ ] **Step 8: Build.**

Run: `npm run build`
Expected: green build. The first build after Phase 1 cleared `.next` is the right time to verify.

If the build complains about stale cache, run `rm -rf .next` and retry.

- [ ] **Step 9: Smoke test.**

Run: `npm run dev`
- Open `/games-v2/<game>/manage`. Verify the Minimums section shows decoded labels (e.g. "Platform: Nintendo 64 · Region: US") instead of raw keys.
- Add a minimum by typing a key (e.g. `platform=n64`) — confirm it round-trips.
- Open `/games-v2/<game>/manage/run/<runId>`. Confirm the subcategory subtitle renders as dot-separated parts.

- [ ] **Step 10: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/minimums/
git commit -m "refactor(leaderboard-vars): rename subcategoryHash to subcategoryKey in minimums + decode keys in labels"
```

---

## Phase 5 — Optional UX polish

Both tasks below are recommended but skippable. Each is self-contained.

### Task 20 (optional): Replace minimum-form free-text with structured picker

**Files:**
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimum-form.tsx`
- Modify: `app/(new-layout)/games-v2/[game]/manage/minimums/minimums-section.tsx`

**Rationale:** Biggest user-friendliness win in the whole migration. The legacy form asked admins to type a hash. With plain-text keys and decodable buckets, we can build the key from per-variable dropdowns. This task adds a structured picker as the primary input, keeps a "manual entry" toggle as an escape hatch for keys not yet covered by current defs.

**UX:**
- One dropdown per subcategory variable: options are bucket canonicals plus "(any)" which omits that variable from the key.
- A live-rendered "Resulting key" preview below the dropdowns: `platform=n64 · region=us`.
- Default bucket auto-selected.
- A small `Manual` link toggles to a free-text input pre-populated with the structured value.

- [ ] **Step 1: Update `minimum-form.tsx` to accept `variables` and render the picker.**

```typescript
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { timeToMillis } from '~src/components/util/datetime';
import type { MinimumTime } from '../../../../../../types/leaderboard-minimums.types';
import type { VariableDef } from '../../../../../../types/leaderboards.types';

export type FormSubmitValues = {
    subcategoryKey: string;
    minTimeMs: number | null;
    minGameTimeMs: number | null;
};

interface Props {
    mode: 'create' | 'edit';
    editing: MinimumTime | null;
    variables: VariableDef[];
    onSubmit: (values: FormSubmitValues) => void;
    onCancel: () => void;
    isBusy: boolean;
    error: string | null;
}

function msToInput(ms: number | null): string {
    if (ms === null) return '';
    const totalMs = Math.max(0, Math.round(ms));
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = totalMs % 1000;
    const pad = (n: number, w: number) => String(n).padStart(w, '0');
    return millis === 0
        ? `${pad(minutes, 2)}:${pad(seconds, 2)}`
        : `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(millis, 3)}`;
}

function parseKey(key: string): Record<string, string> {
    if (!key) return {};
    const out: Record<string, string> = {};
    for (const pair of key.split('|')) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        out[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
    return out;
}

function buildKey(selections: Record<string, string>): string {
    const entries = Object.entries(selections).filter(([, v]) => v !== '');
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([k, v]) => `${k}=${v}`).join('|');
}

export function MinimumForm({
    mode,
    editing,
    variables,
    onSubmit,
    onCancel,
    isBusy,
    error,
}: Props) {
    const subcatVars = useMemo(
        () => variables.filter((v) => v.role === 'subcategory'),
        [variables],
    );
    const [manual, setManual] = useState(false);
    const [manualKey, setManualKey] = useState('');
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [rtInput, setRtInput] = useState('');
    const [gtInput, setGtInput] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    // Hydrate from `editing` or seed defaults.
    useEffect(() => {
        if (mode === 'edit' && editing) {
            setManualKey(editing.subcategoryKey);
            setSelections(parseKey(editing.subcategoryKey));
            setRtInput(msToInput(editing.minTimeMs));
            setGtInput(msToInput(editing.minGameTimeMs));
        } else {
            const seeded: Record<string, string> = {};
            for (const v of subcatVars) {
                if (v.defaultValueIndex != null) {
                    const canonical =
                        v.values[v.defaultValueIndex]?.[0] ?? '';
                    if (canonical) seeded[v.nameNormalized] = canonical;
                }
            }
            setSelections(seeded);
            setManualKey('');
            setRtInput('');
            setGtInput('');
        }
        setManual(false);
        setLocalError(null);
    }, [mode, editing, subcatVars]);

    const effectiveKey = manual ? manualKey.trim() : buildKey(selections);

    const parse = (s: string): number | null => {
        const trimmed = s.trim();
        if (trimmed === '') return null;
        const ms = timeToMillis(trimmed);
        if (!Number.isFinite(ms) || ms <= 0) return Number.NaN;
        return ms;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        const rt = parse(rtInput);
        const gt = parse(gtInput);

        if (Number.isNaN(rt) || Number.isNaN(gt)) {
            setLocalError(
                'Times must be in m:ss or m:ss.SSS format and greater than zero.',
            );
            return;
        }
        if (rt === null && gt === null) {
            setLocalError('At least one of RT or GT minimum is required.');
            return;
        }

        onSubmit({
            subcategoryKey: effectiveKey,
            minTimeMs: rt,
            minGameTimeMs: gt,
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="border rounded p-3 mb-3 bg-light-subtle"
        >
            <div className="d-flex align-items-baseline justify-content-between mb-2">
                <h3 className="h6 mb-0">
                    {mode === 'create' ? 'Add minimum' : 'Edit minimum'}
                </h3>
                <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => {
                        if (!manual) setManualKey(buildKey(selections));
                        else setSelections(parseKey(manualKey));
                        setManual((m) => !m);
                    }}
                    disabled={isBusy || mode === 'edit'}
                >
                    {manual ? 'Pick from variables' : 'Manual entry'}
                </button>
            </div>

            {manual ? (
                <div className="mb-3">
                    <label className="form-label small">Subcategory key</label>
                    <input
                        type="text"
                        className="form-control form-control-sm font-monospace"
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder='(empty = default — e.g. "platform=n64|region=us")'
                        disabled={mode === 'edit' || isBusy}
                    />
                </div>
            ) : (
                <div className="row g-2 mb-3">
                    {subcatVars.length === 0 ? (
                        <p className="text-muted small mb-0">
                            This category has no subcategory variables — the
                            minimum applies to the default board.
                        </p>
                    ) : (
                        subcatVars.map((v) => (
                            <div
                                key={v.nameNormalized}
                                className="col-md-4"
                            >
                                <label className="form-label small">
                                    {v.name}
                                </label>
                                <select
                                    className="form-select form-select-sm"
                                    value={
                                        selections[v.nameNormalized] ?? ''
                                    }
                                    onChange={(e) =>
                                        setSelections((prev) => ({
                                            ...prev,
                                            [v.nameNormalized]: e.target.value,
                                        }))
                                    }
                                    disabled={mode === 'edit' || isBusy}
                                >
                                    <option value="">(any)</option>
                                    {v.values.map((bucket, idx) => (
                                        <option
                                            key={idx}
                                            value={bucket[0]}
                                        >
                                            {bucket[0]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))
                    )}
                </div>
            )}

            <small className="text-muted d-block mb-3">
                Resulting key:{' '}
                <code>{effectiveKey || '(default board)'}</code>
            </small>

            <div className="row g-2">
                <div className="col-md-4">
                    <label className="form-label small">
                        Min RT (m:ss.SSS)
                    </label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={rtInput}
                        onChange={(e) => setRtInput(e.target.value)}
                        placeholder="e.g. 0:30"
                        disabled={isBusy}
                    />
                </div>
                <div className="col-md-4">
                    <label className="form-label small">
                        Min GT (m:ss.SSS)
                    </label>
                    <input
                        type="text"
                        className="form-control form-control-sm"
                        value={gtInput}
                        onChange={(e) => setGtInput(e.target.value)}
                        placeholder="(optional)"
                        disabled={isBusy}
                    />
                </div>
                <div className="col-md-4 d-flex align-items-end gap-2">
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={isBusy}
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onCancel}
                        disabled={isBusy}
                    >
                        Cancel
                    </button>
                </div>
            </div>

            {(localError || error) && (
                <div className="alert alert-danger mt-2 mb-0 py-2">
                    {localError ?? error}
                </div>
            )}
        </form>
    );
}
```

- [ ] **Step 2: Update `minimums-section.tsx` to pass `variables` into the form.**

```typescript
<MinimumForm
    mode={formState.mode}
    editing={
        formState.mode === 'edit' ? formState.editing : null
    }
    variables={variables}
    onSubmit={handleSubmit}
    onCancel={() => {
        setFormState({ open: false });
        setFormError(null);
    }}
    isBusy={isSaving}
    error={formError}
/>
```

- [ ] **Step 3: Typecheck + smoke test.**

Run: `npm run typecheck`
Open the manage page and verify the picker:
- Subcategory dropdowns default-select the right bucket.
- "Resulting key" updates live.
- `Manual entry` toggle round-trips the value.
- Submit and confirm the minimum appears in the list with the decoded label.

- [ ] **Step 4: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/minimums/
git commit -m "feat(leaderboard-vars): structured per-variable picker for minimum-time subcategory key"
```

---

### Task 21 (optional): Combinations management section

**Files:**
- Create: `app/(new-layout)/games-v2/[game]/manage/variables/combinations-section.tsx`
- Create: `app/(new-layout)/games-v2/[game]/manage/variables/actions/load-combinations.action.ts`
- Create: `app/(new-layout)/games-v2/[game]/manage/variables/actions/save-combinations.action.ts`
- Modify: `src/lib/leaderboard-variables.ts` (add combinations endpoints)
- Modify: `app/(new-layout)/games-v2/[game]/manage/variables/variables-section.tsx` (mount the new section)

**Rationale:** Doc explicitly recommends a combinations grid. Each row in the Cartesian product gets a checkbox. With many variables the grid grows fast; per-row and per-column bulk toggles keep it tractable.

- [ ] **Step 1: Add combinations endpoints to `src/lib/leaderboard-variables.ts`.**

Append to that file (do not replace the existing exports):

```typescript
export interface CombinationsResult {
    combinations: { subcategoryKey: string; valid: boolean }[];
    mode: 'open' | 'managed';
}

function combinationsPath(gameId: number, categoryId?: number | null) {
    const suffix = categoryId != null ? `/${categoryId}` : '';
    return `/admin/combinations/${gameId}${suffix}`;
}

export async function listCombinations(
    sessionId: string,
    gameId: number,
    categoryId?: number | null,
): Promise<CombinationsResult> {
    return apiFetch<CombinationsResult>(
        combinationsPath(gameId, categoryId),
        { sessionId },
    );
}

export async function replaceCombinations(
    sessionId: string,
    gameId: number,
    categoryId: number | null | undefined,
    subcategoryKeys: string[],
): Promise<void> {
    await apiFetch<unknown>(combinationsPath(gameId, categoryId), {
        sessionId,
        method: 'PUT',
        body: { subcategoryKeys },
    });
}
```

- [ ] **Step 2: Create `actions/load-combinations.action.ts`.**

```typescript
'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import {
    type CombinationsResult,
    listCombinations,
} from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number | null;
}

export async function loadCombinationsAction(
    input: Input,
): Promise<{ result: CombinationsResult } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        const result = await listCombinations(
            user.id,
            input.gameId,
            input.categoryId,
        );
        return { result };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to load combinations.' };
    }
}
```

- [ ] **Step 3: Create `actions/save-combinations.action.ts`.**

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { resolveCategory } from '~src/lib/games-v1';
import { replaceCombinations } from '~src/lib/leaderboard-variables';
import { confirmPermission } from '~src/rbac/confirm-permission';

interface Input {
    gameSlug: string;
    gameId: number;
    categoryId: number | null;
    subcategoryKeys: string[];
}

export async function saveCombinationsAction(
    input: Input,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    try {
        confirmPermission(user, 'edit', 'category-settings', {
            game: input.gameSlug,
        });
    } catch {
        return { error: 'Not authorized to edit category settings.' };
    }

    try {
        await replaceCombinations(
            user.id,
            input.gameId,
            input.categoryId,
            input.subcategoryKeys,
        );
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to save combinations.' };
    }

    try {
        const { categories } = await resolveCategory(input.gameId);
        const targets =
            input.categoryId == null
                ? categories
                : categories.filter((c) => c.id === input.categoryId);
        for (const cat of targets) {
            revalidateTag(`game-vars:${input.gameSlug}:${cat.name}`, 'hours');
        }
    } catch {
        // Best-effort.
    }

    return { ok: true };
}
```

- [ ] **Step 4: Create `combinations-section.tsx`.**

```typescript
'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { loadCombinationsAction } from './actions/load-combinations.action';
import { saveCombinationsAction } from './actions/save-combinations.action';

interface Props {
    gameSlug: string;
    gameId: number;
    selectedCategory: ResolvedCategory | null;
}

interface Combo {
    subcategoryKey: string;
    valid: boolean;
}

function parseKey(key: string): { name: string; value: string }[] {
    if (!key) return [];
    return key.split('|').map((pair) => {
        const eq = pair.indexOf('=');
        return eq < 0
            ? { name: pair, value: '' }
            : { name: pair.slice(0, eq), value: pair.slice(eq + 1) };
    });
}

export function CombinationsSection({
    gameSlug,
    gameId,
    selectedCategory,
}: Props) {
    const [combos, setCombos] = useState<Combo[]>([]);
    const [mode, setMode] = useState<'open' | 'managed'>('open');
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pristine, setPristine] = useState(true);
    const [isLoading, startLoadTransition] = useTransition();
    const [isSaving, startSaveTransition] = useTransition();
    const busy = isLoading || isSaving;
    const categoryId = selectedCategory?.id ?? null;

    const refresh = async () => {
        const res = await loadCombinationsAction({
            gameSlug,
            gameId,
            categoryId,
        });
        if ('error' in res) {
            setLoadError(res.error);
            setCombos([]);
            setMode('open');
        } else {
            setLoadError(null);
            setCombos(res.result.combinations);
            setMode(res.result.mode);
        }
        setPristine(true);
    };

    useEffect(() => {
        startLoadTransition(() => refresh());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, categoryId]);

    const toggle = (idx: number) => {
        setCombos((prev) =>
            prev.map((c, i) =>
                i === idx ? { ...c, valid: !c.valid } : c,
            ),
        );
        setPristine(false);
    };

    const setAll = (valid: boolean) => {
        setCombos((prev) => prev.map((c) => ({ ...c, valid })));
        setPristine(false);
    };

    const handleSave = () => {
        startSaveTransition(async () => {
            const res = await saveCombinationsAction({
                gameSlug,
                gameId,
                categoryId,
                subcategoryKeys: combos.filter((c) => c.valid).map((c) => c.subcategoryKey),
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Valid combinations saved');
            await refresh();
        });
    };

    const validCount = combos.filter((c) => c.valid).length;

    // Pretty header: pull variable names from the first combo to know the
    // column labels.
    const firstParts = useMemo(
        () => parseKey(combos[0]?.subcategoryKey ?? ''),
        [combos],
    );

    return (
        <section className="border rounded p-3 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <h2 className="h5 mb-1">Valid combinations</h2>
                    <p className="text-muted small mb-0">
                        {mode === 'open' ? (
                            <>
                                <span className="badge text-bg-secondary me-1">
                                    open mode
                                </span>
                                Every combination is a real leaderboard. Mark
                                rows invalid below to switch to{' '}
                                <code>managed</code> mode.
                            </>
                        ) : (
                            <>
                                <span className="badge text-bg-primary me-1">
                                    managed mode
                                </span>
                                Only the checked combinations are valid
                                leaderboards. Runs in unchecked combos keep
                                their stale key until a re-resolve runs.
                            </>
                        )}
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setAll(true)}
                        disabled={busy || combos.length === 0}
                    >
                        Check all
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setAll(false)}
                        disabled={busy || combos.length === 0}
                    >
                        Uncheck all
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleSave}
                        disabled={busy || pristine}
                    >
                        {isSaving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            {combos.length === 0 ? (
                <p className="text-muted">
                    No subcategory variables in scope — no combinations to
                    manage.
                </p>
            ) : (
                <>
                    <div className="d-flex justify-content-between mb-2 small text-muted">
                        <span>
                            {validCount} valid of {combos.length}
                        </span>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-sm align-middle">
                            <thead>
                                <tr>
                                    <th />
                                    {firstParts.map((p) => (
                                        <th key={p.name}>{p.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {combos.map((c, idx) => {
                                    const parts = parseKey(c.subcategoryKey);
                                    return (
                                        <tr
                                            key={c.subcategoryKey}
                                            className={
                                                c.valid
                                                    ? undefined
                                                    : 'text-muted'
                                            }
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={c.valid}
                                                    onChange={() =>
                                                        toggle(idx)
                                                    }
                                                    disabled={busy}
                                                />
                                            </td>
                                            {parts.map((p) => (
                                                <td key={p.name}>
                                                    {p.value}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </section>
    );
}
```

- [ ] **Step 5: Mount in `variables-section.tsx`.**

Either render `<CombinationsSection ... />` directly after `</section>` of `VariablesSection`, or — simpler — mount both as siblings from `manage-page.tsx`. Recommendation: sibling from `manage-page.tsx` so each section manages its own loading state independently.

`app/(new-layout)/games-v2/[game]/manage/manage-page.tsx`:

```typescript
import { CombinationsSection } from './variables/combinations-section';
// ...
<VariablesSection
    gameSlug={data.game.name}
    gameId={data.game.id}
    selectedCategory={selectedCategory}
/>
<CombinationsSection
    gameSlug={data.game.name}
    gameId={data.game.id}
    selectedCategory={selectedCategory}
/>
<MinimumsSection
    data={data}
    selectedCategory={selectedCategory}
/>
```

- [ ] **Step 6: Typecheck + smoke test.**

Run: `npm run typecheck`
Open the manage page. Verify:
- Mode badge reflects the current state (`open` or `managed`).
- Grid renders one row per Cartesian combo with variable-name columns.
- Toggle a checkbox, click Save, confirm mode flips to `managed` after refresh.
- Re-check all and save, confirm mode flips back to `open` (no rows → open).

- [ ] **Step 7: Commit.**

```bash
git add app/\(new-layout\)/games-v2/\[game\]/manage/variables/combinations-section.tsx app/\(new-layout\)/games-v2/\[game\]/manage/variables/actions/load-combinations.action.ts app/\(new-layout\)/games-v2/\[game\]/manage/variables/actions/save-combinations.action.ts src/lib/leaderboard-variables.ts app/\(new-layout\)/games-v2/\[game\]/manage/manage-page.tsx
git commit -m "feat(leaderboard-vars): add combinations management section with Cartesian grid"
```

---

## Phase 6 — Final verification + branch cleanup

### Task 22: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Clear `.next` and rebuild.**

```bash
rm -rf .next
npm run typecheck && npm run lint && npm run build
```

Expected: all green. If lint flags formatting issues, run `npm run lint-fix`, re-commit with `chore: biome auto-format`, and rerun.

- [ ] **Step 2: Manual UI walkthrough.**

Run: `npm run dev`

For a game with subcategory + filter variables:

- [ ] Default landing page loads (no params) — default subcategory selected via server-side fallback.
- [ ] Click each subcategory pill — URL flips to `?<name>=<value>`, board updates.
- [ ] Click `+ combined` (or set `?combined=1` manually) — combined view renders.
- [ ] Open a filter pill, check a value — URL adds `?<name>=<value>`, board filters down.
- [ ] Click *Clear filters* — variable params drop out of URL.
- [ ] Switch category — variable params drop out of URL.
- [ ] Manually set an invalid combination URL — friendly notice with clickable suggestions renders.
- [ ] Open *Manage* → variables. Add subcategory + filter variables. Confirm sections are correct.
- [ ] Edit a variable's sortOrder via up/down arrows. Confirm reorder.
- [ ] Delete a variable. Confirm warning copy and removal.
- [ ] Open Minimums. Add a minimum via the structured picker (Phase 5) or free-text input. Confirm decoded label in the row.
- [ ] Open *Manage* → run for any run. Confirm subtitle shows decoded subcategoryKey. Reject it — confirm navigation to next run or back to leaderboard.
- [ ] (Phase 5) Toggle a combination off, save, reload — confirm mode flips and the public leaderboard shows the friendly notice for that combo.

- [ ] **Step 3: Search for any leftover references to legacy field names.**

```bash
grep -rn --include="*.ts" --include="*.tsx" "subcategoryHash\|defaultValue: \|var_\|subvar_\|computeSubcategoryHash\|kind:.*'subcategory'\|VariableType\|MissingRequiredVariableError" app src types | grep -v node_modules | grep -v ".next"
```

Expected: only matches inside comments or doc strings, if any. Any code-level match must be addressed before merging.

- [ ] **Step 4: Final cleanup commit (if `lint-fix` ran or any drift was caught).**

If `lint-fix` made changes:

```bash
git add -u
git commit -m "chore: biome auto-format after leaderboard variables migration"
```

If nothing to commit, skip this step.

- [ ] **Step 5: Push the branch.**

```bash
git push -u origin feat/leaderboard-run-management
```

(The branch already exists per the working state. If a separate branch is desired for the variables migration alone, create it before Phase 1 with `git checkout -b feat/leaderboard-variables-migration`.)

---

## Out of scope

- Submit warnings UI (no submit form in `(new-layout)`).
- Background re-resolve worker for existing runs (backend follow-up per the doc).
- Bulk variable import / reorder endpoints (backend doesn't expose them).
- Migrating the old-layout (`app/(old-layout)/`) — the legacy fields it uses are out of this plan's scope.

## Rollback notes

Phase 1 commits are atomic and additive at the type layer. If something goes catastrophically wrong, the cleanest rollback is `git revert` of the relevant phase commits in reverse order. Phase 2 onward is per-area; reverting Phase 2 in isolation leaves the codebase in a Phase-1-only state (lib correct, UI broken) — only useful as a debugging step. For a full rollback, revert from Phase 6 back to before Phase 1.
