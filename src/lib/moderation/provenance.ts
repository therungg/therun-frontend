import type { RunProvenance } from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

// Mod-only full provenance chain. No caching — mods need live data.
export function getRunProvenance(
    sessionId: string,
    gameId: number,
    runId: number,
): Promise<RunProvenance> {
    return modFetch(
        `/v1/leaderboards/games/${gameId}/runs/${runId}/provenance`,
        {
            sessionId,
        },
    );
}

export function getManualTimeProvenance(
    sessionId: string,
    gameId: number,
    manualTimeId: number,
): Promise<RunProvenance> {
    return modFetch(
        `/v1/leaderboards/games/${gameId}/manual-times/${manualTimeId}/provenance`,
        { sessionId },
    );
}
