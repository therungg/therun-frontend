import { Suspense } from 'react';
import { getFrontpageConfig } from '~src/actions/frontpage-config.action';
import { getSession } from '~src/actions/session.action';
import { DEFAULT_FRONTPAGE_CONFIG } from '~src/lib/frontpage-sections-metadata';
import type { SectionId } from '../../../types/frontpage-config.types';
import { FrontpageHero } from './components/frontpage-hero';
import { FrontpageLayout } from './components/frontpage-layout';
import { SectionSkeleton } from './components/section-skeleton';
import { WelcomeBanner } from './components/welcome-banner';
import { CommunityPulse } from './sections/community-pulse';
import { PatreonSection } from './sections/patreon-section';
import { PbFeedSection } from './sections/pb-feed-section';
import { QuickLinks } from './sections/quick-links';
import { RacesSection } from './sections/races-section';
import { TrendingSection } from './sections/trending-section';
import { YourStatsSection } from './sections/your-stats-section';

export default async function FrontPage({ statsUser }: { statsUser?: string }) {
    const session = await getSession();
    const isLoggedIn = !!session?.user;

    const config = isLoggedIn
        ? await getFrontpageConfig(session.username)
        : DEFAULT_FRONTPAGE_CONFIG;

    const sections: Record<SectionId, React.ReactNode> = {
        trending: (
            <Suspense fallback={<SectionSkeleton height={400} />}>
                <TrendingSection />
            </Suspense>
        ),
        'pb-feed': (
            <Suspense fallback={<SectionSkeleton height={400} />}>
                <PbFeedSection />
            </Suspense>
        ),
        races: (
            <Suspense fallback={<SectionSkeleton height={400} />}>
                <RacesSection />
            </Suspense>
        ),
        'quick-links': (
            <Suspense fallback={<SectionSkeleton height={150} />}>
                <QuickLinks />
            </Suspense>
        ),
        'your-stats': (
            <Suspense fallback={<SectionSkeleton height={300} />}>
                <YourStatsSection statsUser={statsUser} />
            </Suspense>
        ),
        'community-pulse': (
            <Suspense fallback={<SectionSkeleton height={300} />}>
                <CommunityPulse />
            </Suspense>
        ),
        patreon: (
            <Suspense fallback={<SectionSkeleton height={150} />}>
                <PatreonSection />
            </Suspense>
        ),
    };

    return (
        <div className="d-flex flex-column gap-4">
            <WelcomeBanner />
            <div id="live">
                <Suspense fallback={<SectionSkeleton height={340} />}>
                    <FrontpageHero />
                </Suspense>
            </div>
            <FrontpageLayout
                initialConfig={config}
                sections={sections}
                isAuthenticated={isLoggedIn}
            />
        </div>
    );
}
