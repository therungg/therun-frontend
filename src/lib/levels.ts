'use server';

import type { LevelOverview } from '../../types/levels.types';
import { apiFetch } from './api-client';

/**
 * A level is a category in the game's level group, and what it splits into is
 * a subcategory variable on it — see docs/frontend-guide-levels.md. So most of
 * "levels" is the ordinary category and variable API; only the section itself,
 * the variant definitions and the overview need their own calls.
 */

/** The game's levels section, created on first use. Idempotent. */
export async function ensureLevelGroup(
    sessionId: string,
    gameId: number,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>(`/v1/games/${gameId}/groups`, {
        method: 'POST',
        sessionId,
        body: { kind: 'level' },
    });
}

export interface CreateLevelBody {
    display: string;
    groupId: number;
    rules?: string | null;
    sortOrder?: number;
    isMain?: boolean;
}

/** A level is created like any other category — in the levels section. */
export async function createLevel(
    sessionId: string,
    gameId: number,
    body: CreateLevelBody,
): Promise<{ id: number }> {
    return apiFetch<{ id: number }>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: { isMain: true, ...body },
    });
}

export interface CreateLevelTemplateBody {
    display: string;
    isMain?: boolean;
    sortOrder?: number;
}

/**
 * A variant every level has. The definition row is not a board: creating it
 * writes its display as a value of every level's subcategory variable.
 */
export async function createLevelTemplate(
    sessionId: string,
    gameId: number,
    body: CreateLevelTemplateBody,
): Promise<{ id: number; levels: number }> {
    return apiFetch<{ id: number; levels: number }>(
        `/v1/games/${gameId}/categories`,
        {
            method: 'POST',
            sessionId,
            body: { ...body, isLevelTemplate: true },
        },
    );
}

/**
 * Re-derive every level's variant list from the game's level categories.
 * Idempotent — the repair for a level that missed a write.
 */
export async function syncLevelVariants(
    sessionId: string,
    gameId: number,
): Promise<unknown> {
    return apiFetch<unknown>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: { op: 'level-sync' },
    });
}

export async function fetchLevelOverview(
    sessionId: string,
    gameId: number,
): Promise<LevelOverview> {
    return apiFetch<LevelOverview>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: { op: 'level-overview' },
    });
}

/**
 * Which variants one level carries. A level holding a subset is how "this
 * variant is not on this level" is said — the assignment matrix's write.
 */
export async function setLevelVariants(
    sessionId: string,
    gameId: number,
    categoryId: number,
    variants: string[],
): Promise<unknown> {
    return apiFetch<unknown>(`/v1/games/${gameId}/categories`, {
        method: 'POST',
        sessionId,
        body: { op: 'level-variants', categoryId, variants },
    });
}
