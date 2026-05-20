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
