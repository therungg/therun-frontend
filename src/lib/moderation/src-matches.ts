import type {
    SrcMatchLink,
    SrcMatchLinkResult,
    SrcMatchList,
} from '../../../types/src-matches.types';
import { meFetch } from './mod-fetch';

/** Server caps a POST at this many links. */
export const SRC_MATCH_BATCH = 10;

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}/src-matches`;

export function getSrcMatches(
    sessionId: string,
    gameId: number,
): Promise<SrcMatchList> {
    return meFetch(base(gameId), { sessionId });
}

export function linkSrcMatches(
    sessionId: string,
    gameId: number,
    links: SrcMatchLink[],
): Promise<{ results: SrcMatchLinkResult[] }> {
    return meFetch(base(gameId), {
        sessionId,
        method: 'POST',
        body: { links },
    });
}
