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
            'result' in body ? (body as { result: unknown }).result : body;
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
        categoryId != null
            ? `?categoryId=${encodeURIComponent(categoryId)}`
            : '';
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
    return apiFetch<CombinationsResult>(combinationsPath(gameId, categoryId), {
        sessionId,
    });
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
