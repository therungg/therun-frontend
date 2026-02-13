import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { FrontpageHero } from '../frontpage/components/frontpage-hero';
import { PanelSkeleton } from '../frontpage/components/panel-skeleton';
import RacePanel from '../frontpage/panels/race-panel/race-panel';
import { HighlightsFeed } from './components/highlights-feed';
import { MostActiveGames } from './components/most-active-games';
import { PulseCounters } from './components/pulse-counters';
import { RunnerSpotlights } from './components/runner-spotlights';

export function NewHomepage() {
    return (
        <div>
            <FrontpageHero />

            <Suspense>
                <PulseCounters />
            </Suspense>

            <Row className="g-4 mt-2">
                {/* Main column */}
                <Col lg={8}>
                    <div className="d-flex flex-column gap-4">
                        <Suspense fallback={<PanelSkeleton />}>
                            <HighlightsFeed />
                        </Suspense>
                        <Suspense fallback={<PanelSkeleton />}>
                            <MostActiveGames />
                        </Suspense>
                    </div>
                </Col>

                {/* Sidebar */}
                <Col lg={4}>
                    <div className="d-flex flex-column gap-4">
                        <Suspense fallback={<PanelSkeleton />}>
                            <RacePanel />
                        </Suspense>
                        <Suspense fallback={<PanelSkeleton />}>
                            <RunnerSpotlights />
                        </Suspense>
                    </div>
                </Col>
            </Row>
        </div>
    );
}
