import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}`;

export function markRuns(
    sessionId: string,
    gameId: number,
    input: { runIds: number[]; marked: boolean },
): Promise<{ updated: number }> {
    return modFetch(`${base(gameId)}/runs/marks`, {
        sessionId,
        method: 'PUT',
        body: input,
    });
}

export function setBoardOverride(
    sessionId: string,
    gameId: number,
    runId: number,
    target: { categoryId: number; subcategoryKey: string } | null,
): Promise<{ updated: boolean }> {
    return modFetch(`${base(gameId)}/runs/${runId}/board-override`, {
        sessionId,
        method: 'PUT',
        body: target,
    });
}
