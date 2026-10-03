import type { RunReview, TimelineEvent } from '../../../types/run-review.types';
import { meFetch, modFetch } from './mod-fetch';

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

// Mod-only: what happened to a manual time, in the run timeline's shape.
export async function getManualTimeTimeline(
    sessionId: string,
    gameId: number,
    manualTimeId: number,
): Promise<TimelineEvent[]> {
    const body = await meFetch<{ timeline: TimelineEvent[] }>(
        `/v1/leaderboards/games/${gameId}/manual-times/${manualTimeId}/timeline`,
        { sessionId },
    );
    return body.timeline;
}
