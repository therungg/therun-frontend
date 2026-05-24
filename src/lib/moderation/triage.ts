import type {
    QueueFilter,
    QueueItem,
    ResolveFlagResult,
} from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}/queue`;

export function listQueue(
    sessionId: string,
    gameId: number,
    filter?: QueueFilter,
): Promise<QueueItem[]> {
    return modFetch(base(gameId), {
        sessionId,
        query: {
            reason: filter?.reason,
            severity: filter?.severity,
            categoryId: filter?.categoryId,
            limit: filter?.limit,
            offset: filter?.offset,
            includeResolved: filter?.includeResolved ? 'true' : undefined,
        },
    });
}

export function resolveFlag(
    sessionId: string,
    gameId: number,
    flagId: number,
    reason: string,
): Promise<ResolveFlagResult> {
    return modFetch(`${base(gameId)}/${flagId}/resolve`, {
        sessionId,
        method: 'POST',
        body: { reason },
    });
}
