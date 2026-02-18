import { getLiveCount } from '~src/lib/highlights';
import { getTopNLiveRuns } from '~src/lib/live-runs';
import { HeroContent } from './hero-content';

export const FrontpageHero = async () => {
    const [liveRuns, liveCount] = await Promise.all([
        getTopNLiveRuns(5),
        getLiveCount(),
    ]);
    return <HeroContent liveRuns={liveRuns} liveCount={liveCount} />;
};
