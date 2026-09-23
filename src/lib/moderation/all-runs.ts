import type {
    AllRunsApiQuery,
    AllRunsCounts,
    AllRunsPage,
    AllRunsViewCounts,
    RunnerSuggestion,
} from '../../../types/all-runs.types';
import { meFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}/runs`;

/** Every run on or eligible for the game's visible boards. Not cached: per
 *  moderator, and must show a verdict the moment it is made. */
export function getAllRuns(
    sessionId: string,
    gameId: number,
    q: AllRunsApiQuery,
): Promise<AllRunsPage> {
    return meFetch(base(gameId), { sessionId, query: q });
}

export function getAllRunsCounts(
    sessionId: string,
    gameId: number,
    q: AllRunsApiQuery,
): Promise<AllRunsCounts> {
    return meFetch(`${base(gameId)}/counts`, { sessionId, query: q });
}

export function getAllRunsViews(
    sessionId: string,
    gameId: number,
): Promise<AllRunsViewCounts> {
    return meFetch(`${base(gameId)}/views`, { sessionId });
}

export function getRunnerSuggestions(
    sessionId: string,
    gameId: number,
    q: string,
): Promise<RunnerSuggestion[]> {
    return meFetch(`${base(gameId)}/runners`, { sessionId, query: { q } });
}
