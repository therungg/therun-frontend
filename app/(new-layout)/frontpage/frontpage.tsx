import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { getSession } from '~src/actions/session.action';
import { FrontpageHero } from './components/frontpage-hero';
import { SectionNav } from './components/section-nav';
import { SectionSkeleton } from './components/section-skeleton';
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

    return (
        <div className="d-flex flex-column gap-4">
            <SectionNav />
            <div id="live">
                <Suspense fallback={<SectionSkeleton height={340} />}>
                    <FrontpageHero />
                </Suspense>
            </div>
            <Row className="g-4">
                <Col lg={8} xs={12} as="section" aria-label="Main content">
                    <div className="d-flex flex-column gap-4">
                        <Suspense fallback={<SectionSkeleton height={400} />}>
                            <TrendingSection />
                        </Suspense>
                        <Suspense fallback={<SectionSkeleton height={400} />}>
                            <PbFeedSection />
                        </Suspense>
                        <Suspense fallback={<SectionSkeleton height={400} />}>
                            <RacesSection />
                        </Suspense>
                    </div>
                </Col>
                <Col lg={4} xs={12} as="aside" aria-label="Stats and community">
                    <div className="d-flex flex-column gap-4">
                        {isLoggedIn && (
                            <Suspense
                                fallback={<SectionSkeleton height={300} />}
                            >
                                <YourStatsSection statsUser={statsUser} />
                            </Suspense>
                        )}
                        <Suspense fallback={<SectionSkeleton height={300} />}>
                            <CommunityPulse />
                        </Suspense>
                        <Suspense fallback={<SectionSkeleton height={150} />}>
                            <QuickLinks />
                        </Suspense>
                        {!isLoggedIn && (
                            <Suspense
                                fallback={<SectionSkeleton height={300} />}
                            >
                                <YourStatsSection statsUser={statsUser} />
                            </Suspense>
                        )}
                        <Suspense fallback={<SectionSkeleton height={150} />}>
                            <PatreonSection />
                        </Suspense>
                    </div>
                </Col>
            </Row>
        </div>
    );
}
