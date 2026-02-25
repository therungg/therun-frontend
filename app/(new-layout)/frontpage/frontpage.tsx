import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { FrontpageHero } from './components/frontpage-hero';
import { SectionNav } from './components/section-nav';
import { SectionSkeleton } from './components/section-skeleton';
import { CommunityPulse } from './sections/community-pulse';
import { PatreonSection } from './sections/patreon-section';
import { PbFeedSection } from './sections/pb-feed-section';
import { RacesSection } from './sections/races-section';
import { TrendingSection } from './sections/trending-section';
import { YourStatsSection } from './sections/your-stats-section';

export default async function FrontPage() {
    return (
        <div className="d-flex flex-column gap-4">
            <SectionNav />
            <div id="live">
                <Suspense fallback={<SectionSkeleton height={340} />}>
                    <FrontpageHero />
                </Suspense>
            </div>
            <Row className="g-4">
                <Col lg={6} xs={12}>
                    <div className="d-flex flex-column gap-4">
                        <Suspense fallback={<SectionSkeleton height={400} />}>
                            <TrendingSection />
                        </Suspense>
                        <Suspense fallback={<SectionSkeleton height={400} />}>
                            <RacesSection />
                        </Suspense>
                    </div>
                </Col>
                <Col lg={6} xs={12}>
                    <div className="d-flex flex-column gap-4">
                        <Suspense fallback={<SectionSkeleton height={400} />}>
                            <PbFeedSection />
                        </Suspense>
                        <Suspense fallback={<SectionSkeleton height={300} />}>
                            <CommunityPulse />
                        </Suspense>
                    </div>
                </Col>
            </Row>
            <Row className="g-4">
                <Col lg={7} xs={12}>
                    <Suspense fallback={<SectionSkeleton height={400} />}>
                        <YourStatsSection />
                    </Suspense>
                </Col>
            </Row>
            <Suspense fallback={<SectionSkeleton height={150} />}>
                <PatreonSection />
            </Suspense>
        </div>
    );
}
