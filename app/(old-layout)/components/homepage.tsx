import Link from 'next/link';
import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { DataHolder } from '~app/(old-layout)/components/data-holder';
import { Button } from '~src/components/Button/Button';
import { IconButton } from '~src/components/Button/IconButton';
import { PopularGames } from '~src/components/game/popular-games';
import { SkeletonPersonalBests } from '~src/components/skeleton/index/skeleton-personal-bests';
import { SkeletonPopularGames } from '~src/components/skeleton/index/skeleton-popular-games';
import { BunnyIcon } from '~src/icons/bunny-icon';

export const Homepage = () => {
    return (
        <div>
            <Row>
                <Col xl={12}>
                    <div className="px-4 pt-5 mt-3 mb-5 text-center">
                        <h1 className="display-1 fw-medium">The Run</h1>
                        <h2 className="display-6 mb-5">
                            Statistics for speedrunners
                        </h2>
                        <div className="col-lg-6 mx-auto">
                            <p className="lead mb-4"></p>
                            <div className="d-grid gap-2 d-sm-flex justify-content-sm-center mb-5">
                                <Link href="/patron" prefetch={false}>
                                    <IconButton
                                        icon={<BunnyIcon />}
                                        iconPosition="right"
                                        variant="secondary"
                                        className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                                    >
                                        Support
                                    </IconButton>
                                </Link>
                                <Link href="/about" prefetch={false}>
                                    <Button
                                        variant="primary"
                                        className="btn-lg me-sm-3 px-3 w-160p h-3r fw-medium"
                                    >
                                        Learn More
                                    </Button>
                                </Link>
                                <Link href="/livesplit" prefetch={false}>
                                    <Button
                                        variant="primary"
                                        className="btn-lg px-3 w-160p h-3r fw-medium"
                                    >
                                        LiveSplit Key
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </Col>
                {/*<Col xl={5}>*/}
                {/*    <EventHighlight />*/}
                {/*</Col>*/}
            </Row>
            <div>
                <Row className="text-center">
                    <Col xl={6} className="mt-4">
                        <h2>Recent Personal Bests</h2>
                        <React.Suspense fallback={<SkeletonPersonalBests />}>
                            <DataHolder />
                        </React.Suspense>
                    </Col>
                    <Col xl={6} className="mt-4">
                        <h2>Popular Games</h2>
                        <React.Suspense fallback={<SkeletonPopularGames />}>
                            <PopularGames />
                        </React.Suspense>
                    </Col>
                </Row>
            </div>
        </div>
    );
};
