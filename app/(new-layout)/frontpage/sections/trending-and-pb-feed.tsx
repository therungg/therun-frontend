import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { SectionSkeleton } from '../components/section-skeleton';
import { PbFeedSection } from './pb-feed-section';
import { TrendingSection } from './trending-section';

export const TrendingAndPbFeed = () => {
    return (
        <Row className="g-4">
            <Col lg={7} xs={12}>
                <Suspense fallback={<SectionSkeleton height={500} />}>
                    <TrendingSection />
                </Suspense>
            </Col>
            <Col lg={5} xs={12}>
                <Suspense fallback={<SectionSkeleton height={500} />}>
                    <PbFeedSection />
                </Suspense>
            </Col>
        </Row>
    );
};
