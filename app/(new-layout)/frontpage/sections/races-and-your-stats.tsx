import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { SectionSkeleton } from '../components/section-skeleton';
import { RacesSection } from './races-section';
import { YourStatsSection } from './your-stats-section';

export const RacesAndYourStats = () => {
    return (
        <Row className="g-4">
            <Col lg={6} xs={12}>
                <Suspense fallback={<SectionSkeleton height={400} />}>
                    <RacesSection />
                </Suspense>
            </Col>
            <Col lg={6} xs={12}>
                <Suspense fallback={<SectionSkeleton height={400} />}>
                    <YourStatsSection />
                </Suspense>
            </Col>
        </Row>
    );
};
