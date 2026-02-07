import { cacheLife } from 'next/cache';
import { getTopNLiveRuns } from '~src/lib/live-runs';
import { HeroContent } from './hero-content';

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

export const FrontpageHero = async () => {
    const [liveRuns, countHistory] = await Promise.all([
        getTopNLiveRuns(5),
        getLiveCountHistory(),
    ]);

    return <HeroContent liveRuns={liveRuns} countHistory={countHistory} />;
};
