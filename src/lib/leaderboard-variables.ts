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
 * Every variable row for a set of categories, one list call per category
 * (the backend has no game-wide listing — variables are category-scoped
 * only). A category whose fetch fails contributes nothing rather than
 * failing the whole read; callers use this for overviews (console matrix,
 * wizard hub, copy sources) where a partial list beats an error page.
 */
export async function listCategoryVariables(
    sessionId: string,
    gameId: number,
    categoryIds: number[],
): Promise<VariableRow[]> {
    const lists = await Promise.all(
        categoryIds.map((id) =>
            listGameVariables(sessionId, gameId, id).catch(
                () => [] as VariableRow[],
            ),
        ),
    );
    return lists.flat();
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
