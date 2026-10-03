import type { RunReview } from '../../../types/run-review.types';
import { modFetch } from './mod-fetch';

// Mod-only. No caching — mods need live data.
export function getRunReview(
    sessionId: string,
    gameId: number,
    runId: number,
): Promise<RunReview> {
    return modFetch(`/v1/leaderboards/games/${gameId}/runs/${runId}/review`, {
        sessionId,
    });
}
