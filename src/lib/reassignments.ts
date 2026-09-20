'use server';

import type {
    CategoryExtensionCandidate,
    CategoryMappingEntry,
    CategoryMergeResult,
    CategoryReassignment,
    CategorySettingsDiffs,
    GameMergeRequest,
    GameMergeRequestResult,
    GameReassignment,
    MergeCategoryPayload,
    PreviewResult,
} from '../../types/reassignments.types';
import { apiFetch } from './api-client';

export async function previewGameReassignment(
    sourceGameId: number,
    targetGameId: number,
    sessionId: string,
): Promise<PreviewResult> {
    return apiFetch<PreviewResult>('/reassignments/games/preview', {
        method: 'POST',
        sessionId,
        body: { sourceGameId, targetGameId },
    });
}

export async function createGameReassignment(
    body: {
        sourceGameId: number;
        targetGameId: number;
        categoryMapping: CategoryMappingEntry[];
        settingsDiffsAcknowledged?: CategorySettingsDiffs[];
    },
    sessionId: string,
): Promise<{ id: number; status: string }> {
    return apiFetch<{ id: number; status: string }>('/reassignments/games', {
        method: 'POST',
        sessionId,
        body,
    });
}

export async function getGameReassignment(
    id: number,
    sessionId: string,
): Promise<GameReassignment> {
    return apiFetch<GameReassignment>(`/reassignments/games/${id}`, {
        method: 'GET',
        sessionId,
    });
}

export async function undoGameReassignment(
    id: number,
    sessionId: string,
): Promise<{ id: number; undone: true }> {
    return apiFetch<{ id: number; undone: true }>(
        `/reassignments/games/${id}/undo`,
        { method: 'POST', sessionId },
    );
}

export async function createCategoryReassignment(
    body: {
        sourceCategoryId: number;
        targetCategoryId: number;
        settingsDiffsAcknowledged?: CategorySettingsDiffs[];
    },
    sessionId: string,
): Promise<{ id: number; status: string }> {
    return apiFetch<{ id: number; status: string }>(
        '/reassignments/categories',
        { method: 'POST', sessionId, body },
    );
}

export async function getCategoryReassignment(
    id: number,
    sessionId: string,
): Promise<CategoryReassignment> {
    return apiFetch<CategoryReassignment>(`/reassignments/categories/${id}`, {
        method: 'GET',
        sessionId,
    });
}

export async function undoCategoryReassignment(
    id: number,
    sessionId: string,
): Promise<{ id: number; undone: true }> {
    return apiFetch<{ id: number; undone: true }>(
        `/reassignments/categories/${id}/undo`,
        { method: 'POST', sessionId },
    );
}

export async function listReassignments(
    limit: number,
    sessionId: string,
): Promise<{
    games: GameReassignment[];
    categories: CategoryReassignment[];
}> {
    return apiFetch<{
        games: GameReassignment[];
        categories: CategoryReassignment[];
    }>(`/reassignments?limit=${limit}`, { method: 'GET', sessionId });
}

/** Every board on the game, for the merge picker. */
export async function listMergeCategories(
    gameId: number,
    sessionId: string,
): Promise<MergeCategoryPayload> {
    return apiFetch<MergeCategoryPayload>(
        `/reassignments/categories?gameId=${gameId}`,
        { method: 'GET', sessionId },
    );
}

/** One target, any number of sources, one job. */
export async function mergeCategories(
    body: {
        targetCategoryId: number;
        sourceCategoryIds: number[];
    },
    sessionId: string,
): Promise<CategoryMergeResult> {
    return apiFetch<CategoryMergeResult>('/reassignments/categories', {
        method: 'POST',
        sessionId,
        body,
    });
}

/** Category Extensions boards this game could pull in. */
export async function listCategoryExtensions(
    gameId: number,
    sessionId: string,
): Promise<CategoryExtensionCandidate[]> {
    return apiFetch<CategoryExtensionCandidate[]>(
        `/reassignments/category-extensions?gameId=${gameId}`,
        { method: 'GET', sessionId },
    );
}

/** Fold that Category Extensions game into this one. */
export async function mergeCategoryExtensions(
    body: { gameId: number; sourceGameId: number },
    sessionId: string,
): Promise<{ id: number; status: string }> {
    return apiFetch<{ id: number; status: string }>(
        '/reassignments/category-extensions',
        { method: 'POST', sessionId, body },
    );
}

/** Ask for another game to be folded into this one. */
export async function requestGameMerge(
    body: { gameId: number; sourceGameId: number },
    sessionId: string,
): Promise<GameMergeRequestResult> {
    return apiFetch<GameMergeRequestResult>('/reassignments/game-requests', {
        method: 'POST',
        sessionId,
        body,
    });
}

/** The admin queue of merges waiting on a decision. */
export async function listGameMergeRequests(
    sessionId: string,
): Promise<GameMergeRequest[]> {
    return apiFetch<GameMergeRequest[]>('/reassignments/game-requests', {
        method: 'GET',
        sessionId,
    });
}

export async function decideGameMergeRequest(
    id: number,
    decision: 'approve' | 'decline',
    sessionId: string,
    reason?: string,
): Promise<{ id: number; status: string }> {
    return apiFetch<{ id: number; status: string }>(
        `/reassignments/game-requests/${id}/${decision}`,
        { method: 'POST', sessionId, body: reason ? { reason } : undefined },
    );
}
