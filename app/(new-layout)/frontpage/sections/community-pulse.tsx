import { FaHeartPulse } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getGlobalStats, getLiveCount } from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

export const CommunityPulse = async () => {
    const [globalStats, stats24h, liveCount] = await Promise.all([
        getGlobalStats(),
        getGlobalStats('24h'),
        getLiveCount(),
    ]);

    const last24h = {
        pbs: stats24h.totalPbs,
        runs: stats24h.totalFinishedAttemptCount,
        attempts: stats24h.totalAttemptCount,
        playtimeMs: stats24h.totalRunTime,
    };

    return (
        <Panel
            panelId="pulse"
            title="Community Pulse"
            subtitle="Runs, PBs, and playtime sitewide"
            icon={FaHeartPulse}
            className="p-0 overflow-hidden"
        >
            <CommunityPulseClient
                last24h={last24h}
                allTime={globalStats}
                liveCount={liveCount}
            />
        </Panel>
    );
};
