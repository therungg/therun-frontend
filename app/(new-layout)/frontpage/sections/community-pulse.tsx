import {
    getGlobalStats,
    getPeriodStats,
    getPreviousPeriodStats,
    getTodayStats,
} from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

export const CommunityPulse = async () => {
    const [globalStats, todayStats, weekStats, prevWeekStats] =
        await Promise.all([
            getGlobalStats(),
            getTodayStats(),
            getPeriodStats('week'),
            getPreviousPeriodStats('week'),
        ]);

    return (
        <CommunityPulseClient
            globalStats={globalStats}
            todayStats={todayStats}
            weekStats={weekStats}
            prevWeekStats={prevWeekStats}
        />
    );
};
