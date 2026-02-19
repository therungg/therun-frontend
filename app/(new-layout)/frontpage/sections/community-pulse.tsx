import { Panel } from '~app/(new-layout)/components/panel.component';
import { getGlobalStats, getLiveCount } from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

export const CommunityPulse = async () => {
    const [globalStats, globalStats24hAgo, liveCount] = await Promise.all([
        getGlobalStats(),
        getGlobalStats('24h'),
        getLiveCount(),
    ]);

    const last24h = {
        pbs: globalStats.totalPbs - globalStats24hAgo.totalPbs,
        runs:
            globalStats.totalFinishedAttemptCount -
            globalStats24hAgo.totalFinishedAttemptCount,
        attempts:
            globalStats.totalAttemptCount - globalStats24hAgo.totalAttemptCount,
        playtimeMs: globalStats.totalRunTime - globalStats24hAgo.totalRunTime,
    };

    return (
        <Panel title="Community Pulse" subtitle="Last 24 Hours" className="p-0">
            <CommunityPulseClient
                last24h={last24h}
                allTime={globalStats}
                liveCount={liveCount}
            />
        </Panel>
    );
};
