import type {
    TrustGrant,
    TrustState,
    WorklistDigest,
    WorklistFilter,
    WorklistPage,
} from '../../../types/worklist.types';
import { meFetch, modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}`;

/** The worklist: tiers, batches and order are decided server-side. */
export function getWorklist(
    sessionId: string,
    gameId: number,
    filter?: WorklistFilter,
): Promise<WorklistPage> {
    return meFetch(`${base(gameId)}/worklist`, {
        sessionId,
        query: {
            categoryId: filter?.categoryId,
            page: filter?.page,
            pageSize: filter?.pageSize,
        },
    });
}

export function getWorklistDigest(
    sessionId: string,
    gameId: number,
    days = 7,
): Promise<WorklistDigest> {
    return meFetch(`${base(gameId)}/worklist/digest`, {
        sessionId,
        query: { days },
    });
}

export function getTrustState(
    sessionId: string,
    gameId: number,
    userId: number,
): Promise<TrustState> {
    return meFetch(`${base(gameId)}/worklist/trust`, {
        sessionId,
        query: { userId },
    });
}

export function dismissTrustOffer(
    sessionId: string,
    gameId: number,
    userId: number,
): Promise<{ dismissed: true }> {
    return meFetch(`${base(gameId)}/worklist/trust-dismissals`, {
        sessionId,
        method: 'POST',
        body: { userId },
    });
}

/** The grant routes predate the worklist and are not `{result}`-wrapped. */
export function listTrustGrants(
    sessionId: string,
    gameId: number,
): Promise<TrustGrant[]> {
    return modFetch(`${base(gameId)}/auto-verify`, { sessionId });
}

export function grantTrust(
    sessionId: string,
    gameId: number,
    userId: number,
    categoryId: number | null,
): Promise<TrustGrant> {
    return modFetch(`${base(gameId)}/auto-verify`, {
        sessionId,
        method: 'POST',
        body: {
            userId,
            ...(categoryId !== null ? { categoryId } : {}),
            reason: 'Trusted from the worklist',
        },
    });
}

export function revokeTrust(
    sessionId: string,
    gameId: number,
    grantId: number,
): Promise<{ deleted: true }> {
    return modFetch(`${base(gameId)}/auto-verify/${grantId}`, {
        sessionId,
        method: 'DELETE',
    });
}

const worklistPost = <T>(
    sessionId: string,
    gameId: number,
    sub: string,
    runIds: number[],
): Promise<T> =>
    meFetch(`${base(gameId)}/worklist/${sub}`, {
        sessionId,
        method: 'POST',
        body: { runIds },
    });

export const requestVideo = (
    sessionId: string,
    gameId: number,
    runIds: number[],
) =>
    worklistPost<{ requested: number }>(
        sessionId,
        gameId,
        'request-video',
        runIds,
    );
export const nudgeRuns = (
    sessionId: string,
    gameId: number,
    runIds: number[],
) => worklistPost<{ nudged: number }>(sessionId, gameId, 'nudge', runIds);
export const waiveVideo = (
    sessionId: string,
    gameId: number,
    runIds: number[],
) => worklistPost<{ waived: number }>(sessionId, gameId, 'waive', runIds);
