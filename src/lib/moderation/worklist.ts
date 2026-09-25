import type {
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
            categoryId: filter?.categoryIds?.length
                ? filter.categoryIds.join(',')
                : undefined,
            ...Object.fromEntries(
                Object.entries(filter?.vars ?? {})
                    .filter(([, vs]) => vs.length > 0)
                    // a lone '' (not set) must survive the query builder
                    .map(([k, vs]) => [`var.${k}`, vs.join(',') || ',']),
            ),
            maxRank: filter?.maxRank,
            ran: filter?.ran,
            video: filter?.video,
            source: filter?.source?.length
                ? filter.source.join(',')
                : undefined,
            reason: filter?.reason?.length
                ? filter.reason.join(',')
                : undefined,
            newRunner: filter?.newRunner ? 1 : undefined,
            runner: filter?.runner?.trim() || undefined,
            sort:
                filter?.sort && filter.sort !== 'priority'
                    ? filter.sort
                    : undefined,
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

/** The grant routes predate the worklist and are not `{result}`-wrapped. */

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
