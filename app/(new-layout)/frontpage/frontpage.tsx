import { Suspense } from 'react';
import { FrontpageHero } from './components/frontpage-hero';
import { SectionSkeleton } from './components/section-skeleton';
import { CommunityPulse } from './sections/community-pulse';
import { PatreonSection } from './sections/patreon-section';
import { RacesAndYourStats } from './sections/races-and-your-stats';
import { TrendingAndPbFeed } from './sections/trending-and-pb-feed';

export default async function FrontPage() {
    return (
        <div className="d-flex flex-column gap-4">
            <Suspense fallback={<SectionSkeleton height={340} />}>
                <FrontpageHero />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={220} />}>
                <CommunityPulse />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={500} />}>
                <TrendingAndPbFeed />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={400} />}>
                <RacesAndYourStats />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={150} />}>
                <PatreonSection />
            </Suspense>
        </div>
    );
}
