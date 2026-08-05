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
    role: 'subcategory' | 'filter';
    values: string[][];
    defaultValueIndex?: number | null;
    sortOrder?: number;
    description?: string | null;
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

/**
 * Every variable row for a set of categories, in one batched call
 * (`?categoryIds=1,2,3`). Used to be one request per category — for games
 * with hundreds of categories that fanned out into hundreds of concurrent
 * Lambda invocations, each opening its own Postgres pool, and blew through
 * the connection cap. A failed fetch contributes nothing rather than
 * failing the whole read; callers use this for overviews (console matrix,
 * wizard hub, copy sources) where a partial list beats an error page.
 */
export async function listCategoryVariables(
    sessionId: string,
    gameId: number,
    categoryIds: number[],
): Promise<VariableRow[]> {
    if (categoryIds.length === 0) return [];
    const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;
    const qs = `?categoryIds=${categoryIds.map(encodeURIComponent).join(',')}`;
    const url = `${BASE_URL}${basePath(gameId)}${qs}`;
    try {
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${sessionId}` },
        });
        const text = await res.text();
        if (!res.ok) return [];
        if (!text) return [];
        return unwrapVariableArray(JSON.parse(text));
    } catch {
        return [];
    }
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
