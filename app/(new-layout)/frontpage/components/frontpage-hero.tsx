import { getTopNLiveRuns } from '~src/lib/live-runs';
import { HeroContent } from './hero-content';

export const FrontpageHero = async () => {
    const liveRuns = await getTopNLiveRuns(5);
    return <HeroContent liveRuns={liveRuns} />;
};
