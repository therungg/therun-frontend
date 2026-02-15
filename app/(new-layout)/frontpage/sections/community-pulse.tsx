import { cacheLife } from 'next/cache';
import {
    type GlobalStats,
    getGlobalStats,
    getPeriodStats,
    getPreviousPeriodStats,
    type PeriodStats,
} from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

interface LiveCountDataPoint {
    count: number;
    timestamp: number;
}

async function getLiveCountHistory(): Promise<LiveCountDataPoint[]> {
    'use cache';
    cacheLife('minutes');

    const res = await fetch('https://api.therun.gg/live/count/history');
    if (!res.ok) return [];
    const data = await res.json();
    return data.result ?? [];
}

async function getLiveCount(): Promise<number> {
    'use cache';
    cacheLife('seconds');

    const res = await fetch('https://api.therun.gg/live/count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.count ?? 0;
}

export const CommunityPulse = async () => {
    const [
        globalStats,
        dayStats,
        weekStats,
        monthStats,
        prevDayStats,
        prevWeekStats,
        prevMonthStats,
        countHistory,
        liveCount,
    ] = await Promise.all([
        getGlobalStats(),
        getPeriodStats('day'),
        getPeriodStats('week'),
        getPeriodStats('month'),
        getPreviousPeriodStats('day'),
        getPreviousPeriodStats('week'),
        getPreviousPeriodStats('month'),
        getLiveCountHistory(),
        getLiveCount(),
    ]);

    return (
        <CommunityPulseClient
            globalStats={globalStats}
            periodStats={{ day: dayStats, week: weekStats, month: monthStats }}
            prevPeriodStats={{
                day: prevDayStats,
                week: prevWeekStats,
                month: prevMonthStats,
            }}
            countHistory={countHistory}
            liveCount={liveCount}
        />
    );
};
