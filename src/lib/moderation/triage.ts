import type { ResolveFlagResult } from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}/queue`;

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
