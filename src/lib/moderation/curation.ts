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

/**
 * `SetBoardOverrideInput.reason` is required by the backend
 * (board-mod-unified-log) whenever `target` is set (a real move) — min 10
 * characters, enforced server-side and mirrored client-side in
 * MoveDialog/BulkMoveDialog. Clearing an override (`target: null`, e.g. the
 * "moved here" tag's ×) keeps its prior shape — a bare `null` body — since
 * the breaking change is scoped to the SET path.
 */
export function setBoardOverride(
    sessionId: string,
    gameId: number,
    runId: number,
    target: { categoryId: number; subcategoryKey: string } | null,
    reason?: string,
): Promise<{ updated: boolean }> {
    return modFetch(`${base(gameId)}/runs/${runId}/board-override`, {
        sessionId,
        method: 'PUT',
        body: target ? { ...target, reason } : null,
    });
}
