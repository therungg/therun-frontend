'use server';

import type {
    CategoryMappingEntry,
    CategoryReassignment,
    CategorySettingsDiffs,
    GameReassignment,
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
