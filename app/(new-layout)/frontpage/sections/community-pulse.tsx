import { cacheLife } from 'next/cache';
import { getGlobalStats, getTopGames } from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

export const CommunityPulse = async () => {
    const [globalStats, stats24hAgo, topGames] = await Promise.all([
        getGlobalStats(),
        getGlobalStats('1d'),
        getTopGames(3),
    ]);

    const deltas = {
        runners: globalStats.totalRunners - stats24hAgo.totalRunners,
        attempts: globalStats.totalAttemptCount - stats24hAgo.totalAttemptCount,
        finished:
            globalStats.totalFinishedAttemptCount -
            stats24hAgo.totalFinishedAttemptCount,
        hours: Math.round(
            (globalStats.totalRunTime - stats24hAgo.totalRunTime) / 3_600_000,
        ),
    };

    return (
        <CommunityPulseClient
            globalStats={globalStats}
            deltas={deltas}
            topGames={topGames}
        />
    );
};
