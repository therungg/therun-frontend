import type { RunOriginRef } from '../../../../types/leaderboards.types';

/** What the run hover card fetches on open — see /api/runs/[runId]/card. */
export interface RunCardDetail {
    verifiedBy: RunOriginRef | null;
    verifiedAt: string | null;
}

/**
 * One request per run per page session. Same shape as the user card store:
 * the map holds the in-flight promise so overlapping hovers join one request,
 * and a failure is dropped so the next hover retries.
 */
const cache = new Map<number, Promise<RunCardDetail | null>>();
const resolved = new Map<number, RunCardDetail | null>();

/** Already resolved and in hand — lets a re-hover paint with no flash. */
export const peekRunCard = (runId: number): RunCardDetail | null | undefined =>
    resolved.get(runId);

export const loadRunCard = (runId: number): Promise<RunCardDetail | null> => {
    const existing = cache.get(runId);
    if (existing) return existing;

    const request = fetch(`/api/runs/${runId}/card`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
            const detail = (body as RunCardDetail | null) ?? null;
            resolved.set(runId, detail);
            return detail;
        })
        .catch(() => {
            cache.delete(runId);
            return null;
        });

    cache.set(runId, request);

    return request;
};
