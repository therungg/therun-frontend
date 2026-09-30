import type {
    RejectOptions,
    RejectWithout,
} from '../../../types/reject-options.types';
import { meFetch } from './mod-fetch';

/** What the reject dialog can offer for one run. Not cached: per moderator,
 *  and it must reflect a verdict the moment it is made. */
export function getRejectOptions(
    sessionId: string,
    gameId: number,
    runId: number,
    without: RejectWithout,
): Promise<RejectOptions> {
    return meFetch(
        `/v1/leaderboards/games/${gameId}/runs/${runId}/reject-options`,
        {
            sessionId,
            query: {
                without:
                    without === null
                        ? undefined
                        : without === 'all'
                          ? 'all'
                          : without.join(','),
            },
        },
    );
}
