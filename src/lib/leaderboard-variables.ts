import { apiFetch } from '~src/lib/api-client';
import { V1FetchError } from '~src/lib/v1-fetch';
import type { VariablePreview } from '~src/lib/variables/consequences';
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
            'result' in body ? (body as { result: unknown }).result : body;
        if (candidate && typeof candidate === 'object' && 'id' in candidate) {
            return candidate as VariableRow;
        }
    }
    return null;
}

export interface UpsertVariableInput {
    categoryId: number;
    name: string;
    /**
     * Explicit URL/storage key, decoupled from the display `name`. Sent on
     * create (slugged from the name, editable); on edit, pass the existing
     * row's `nameNormalized` so the backend matches the same identity. Omit to
     * let the backend derive the key from the name.
     */
    nameNormalized?: string;
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex?: number | null;
    sortOrder?: number;
    description?: string | null;
    // Filters only: show each runner's value for this variable as its own
    // leaderboard column. Full-replace upsert, so every write that touches a
    // row must carry the current value or it resets to the backend default
    // (false).
    showValueOnBoard?: boolean;
    // Rules that hold for one value, keyed by that value's normalized
    // identity. Same full-replace trap as the field above: a write that omits
    // it clears every value's rules on that variable.
    valueRules?: Record<string, string> | null;
}

export interface DeleteVariableInput {
    categoryId: number;
    name?: string;
    nameNormalized?: string;
}

export async function listGameVariables(
    sessionId: string,
    gameId: number,
    categoryId: number,
): Promise<VariableRow[]> {
    const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;
    const qs = `?categoryId=${encodeURIComponent(categoryId)}`;
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

/** Query-string budget per request, in characters of joined ids. Measured
 * against the production gateway: a request URI is refused with 414 at about
 * 16.4KB, so 6,000 characters of ids plus the base URL sits at roughly a
 * third of the ceiling. It also keeps every game seen so far to one request
 * (game 1, the widest board, joins its ids into ~4.4KB). */
const MAX_IDS_QUERY_CHARS = 6_000;
/** How many batches are in flight at once. The batched endpoint exists
 * because one request per category once exhausted the Postgres connection
 * cap — batches are far fewer, but the fan-out still stays small. */
const BATCH_CONCURRENCY = 4;

/** Split ids into groups whose joined query string stays inside the budget. */
function batchCategoryIds(
    categoryIds: number[],
    maxChars: number = MAX_IDS_QUERY_CHARS,
): number[][] {
    const batches: number[][] = [];
    let current: number[] = [];
    let chars = 0;
    for (const id of categoryIds) {
        const cost = String(id).length + 1; // the id plus its separator
        if (current.length > 0 && chars + cost > maxChars) {
            batches.push(current);
            current = [];
            chars = 0;
        }
        current.push(id);
        chars += cost;
    }
    if (current.length > 0) batches.push(current);
    return batches;
}

async function fetchVariableBatch(
    sessionId: string,
    gameId: number,
    categoryIds: number[],
): Promise<VariableRow[]> {
    const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;
    const qs = `?categoryIds=${categoryIds.map(encodeURIComponent).join(',')}`;
    const url = `${BASE_URL}${basePath(gameId)}${qs}`;
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${sessionId}` },
        });
        const text = await res.text();
        if (!res.ok) {
            console.error(
                `${basePath(gameId)} batch of ${categoryIds.length} categories failed: ${res.status} ${text.slice(0, 200)}`,
            );
            return [];
        }
        if (!text) return [];
        return unwrapVariableArray(JSON.parse(text));
    } catch (e) {
        console.error(
            `${basePath(gameId)} batch of ${categoryIds.length} categories threw:`,
            e,
        );
        return [];
    }
}

/**
 * Every variable row for a set of categories, in batched calls
 * (`?categoryIds=1,2,3`). Used to be one request per category — for games
 * with hundreds of categories that fanned out into hundreds of concurrent
 * Lambda invocations, each opening its own Postgres pool, and blew through
 * the connection cap.
 *
 * It then went the other way: every id in one query string, unbounded. Past
 * roughly 16KB of URL the gateway answers 414 before the request reaches the
 * Lambda, and the swallowed failure would render the console matrix with no
 * variables at all. So the ids are split into batches that fit, run a few at
 * a time, and merged.
 *
 * A failed batch contributes nothing rather than failing the whole read —
 * callers use this for overviews (console matrix, wizard hub, copy sources)
 * where a partial list beats an error page — but it is logged rather than
 * silently dropped.
 */
export async function listCategoryVariables(
    sessionId: string,
    gameId: number,
    categoryIds: number[],
): Promise<VariableRow[]> {
    if (categoryIds.length === 0) return [];
    const batches = batchCategoryIds(categoryIds);
    const rows: VariableRow[] = [];
    for (let i = 0; i < batches.length; i += BATCH_CONCURRENCY) {
        const wave = await Promise.all(
            batches
                .slice(i, i + BATCH_CONCURRENCY)
                .map((ids) => fetchVariableBatch(sessionId, gameId, ids)),
        );
        for (const batch of wave) rows.push(...batch);
    }
    return rows;
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
    if (!row)
        throw new Error('Backend returned an unexpected upsert response.');
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

/**
 * Dry run: what a proposed definition would move, without writing it. Rides
 * the same route as the real write (`?dryRun=1`) so it shares its auth and
 * validation — and so no new API Gateway resource was needed.
 */
export async function previewGameVariable(
    sessionId: string,
    gameId: number,
    body: UpsertVariableInput | DeleteVariableInput,
    mode: 'save' | 'delete',
): Promise<VariablePreview> {
    const raw = await apiFetch<{ preview: VariablePreview }>(
        `${basePath(gameId)}?dryRun=1`,
        {
            sessionId,
            method: mode === 'delete' ? 'DELETE' : 'POST',
            body,
        },
    );
    return raw.preview;
}

/**
 * One edit in a staged change set: a variable set on, or removed from, one
 * category. `input: null` removes it, in which case `nameNormalized` says
 * which one.
 */
export interface VariableChangeInput {
    categoryId: number;
    input: Omit<UpsertVariableInput, 'categoryId'> | null;
    nameNormalized?: string;
}

/**
 * Applies a whole change set from the setup wizard's variable grid.
 *
 * One transaction backend-side, so a grid full of cell toggles either lands
 * completely or not at all — and fires one cache invalidation plus one
 * leaderboard rebuild per touched category, rather than one of each per cell.
 */
export async function applyVariableChangeSet(
    sessionId: string,
    gameId: number,
    changes: VariableChangeInput[],
): Promise<{ applied: number }> {
    // Rides POST /variables, not a /bulk route: the backend's `api`
    // CloudFormation template is at 499 of its hard 500-resource limit. A
    // `changes` array is the unambiguous signal — no single-variable upsert
    // sends that field. See the note in aws/lib/api-stack.ts.
    return apiFetch<{ applied: number }>(basePath(gameId), {
        sessionId,
        method: 'POST',
        body: { changes },
    });
}

/**
 * Dry run for a whole change set. Rides the same route as the write
 * (`?dryRun=1`), so it shares its auth and validation.
 *
 * Movement is planned once per affected category with all of that category's
 * changes applied together: subcategory variables compose multiplicatively, so
 * previewing them one at a time would understate how many runs move.
 */
export async function previewVariableChangeSet(
    sessionId: string,
    gameId: number,
    changes: VariableChangeInput[],
): Promise<VariablePreview> {
    const raw = await apiFetch<{ preview: VariablePreview }>(
        `${basePath(gameId)}?dryRun=1`,
        { sessionId, method: 'POST', body: { changes } },
    );
    return raw.preview;
}

export interface CombinationsResult {
    combinations: {
        subcategoryKey: string;
        valid: boolean;
        entryCount: number;
    }[];
    mode: 'open' | 'managed';
}

function combinationsPath(gameId: number, categoryId: number) {
    return `/admin/combinations/${gameId}/${categoryId}`;
}

export async function listCombinations(
    sessionId: string,
    gameId: number,
    categoryId: number,
): Promise<CombinationsResult> {
    return apiFetch<CombinationsResult>(combinationsPath(gameId, categoryId), {
        sessionId,
    });
}

export async function replaceCombinations(
    sessionId: string,
    gameId: number,
    categoryId: number,
    subcategoryKeys: string[],
): Promise<void> {
    await apiFetch<unknown>(combinationsPath(gameId, categoryId), {
        sessionId,
        method: 'PUT',
        body: { subcategoryKeys },
    });
}

/**
 * One row per raw variable=value found on finished runs, with the count of
 * distinct runners who submitted it. Setup-time suggestion data for the
 * variables editor — shows the real value distribution (and long tail to
 * bucket) so a moderator doesn't have to guess what people actually enter.
 *
 * `categoryId === null` widens the scope to the whole game. The backend serves
 * this from an index-range slice (not a full scan); callers should still cache
 * it — it's a slow-moving hint, not live data.
 */
export interface VariableValueCount {
    variable: string;
    value: string;
    count: number;
}

export async function listVariableValueCounts(
    sessionId: string,
    gameId: number,
    categoryId: number | null,
): Promise<VariableValueCount[]> {
    const scope = categoryId !== null ? `&categoryId=${categoryId}` : '';
    return apiFetch<VariableValueCount[]>(
        `${basePath(gameId)}?valueCounts=1${scope}`,
        { sessionId },
    );
}

/**
 * A variable that clears the relevance bar within at least one category —
 * share of that category's runners >= 10% AND >= 5 distinct setters. Suggested
 * even when it is rare game-wide, because relevance is measured against each
 * category's own population, not the game's.
 *
 * `relevantCategoryIds` are exactly the categories it cleared; `perCategory`
 * carries the numbers behind that (for a "relevant in X (67%)" label); `values`
 * is the observed value distribution across those categories, for pre-filling
 * buckets. Mirrors CategoryVariableSuggestion in the backend handler.
 */
export interface CategoryVariableSuggestion {
    variable: string;
    relevantCategoryIds: number[];
    perCategory: Record<
        number,
        { setters: number; runners: number; share: number }
    >;
    values: VariableValueCount[];
}

export async function listVariableSuggestionsByCategory(
    sessionId: string,
    gameId: number,
    categoryIds: number[],
): Promise<CategoryVariableSuggestion[]> {
    if (categoryIds.length === 0) return [];
    return apiFetch<CategoryVariableSuggestion[]>(
        `${basePath(gameId)}?valueCounts=1&byCategory=1&categoryIds=${categoryIds.join(',')}`,
        { sessionId },
    );
}
