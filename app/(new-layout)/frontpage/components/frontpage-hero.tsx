import { cacheLife } from 'next/cache';
import { getTopNLiveRuns } from '~src/lib/live-runs';
import { HeroContent } from './hero-content';

async function getLiveCount(): Promise<number> {
    'use cache';
    cacheLife('seconds');

    const res = await fetch('https://api.therun.gg/live/count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.result ?? data.count ?? 0;
}

export const FrontpageHero = async () => {
    const [liveRuns, liveCount] = await Promise.all([
        getTopNLiveRuns(5),
        getLiveCount(),
    ]);
    return <HeroContent liveRuns={liveRuns} liveCount={liveCount} />;
};
