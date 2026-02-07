'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { Col, Placeholder, Row } from 'react-bootstrap';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(old-layout)/live/live-split-timer.component';
import { Button } from '~src/components/Button/Button';
import {
    DifferenceFromOne,
    DurationToFormatted,
} from '~src/components/util/datetime';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import styles from './hero-content.module.scss';

const LiveCountChart = dynamic(() =>
    import('../panels/live-count-panel/live-count-chart').then(
        (mod) => mod.LiveCountChart,
    ),
);

const TwitchPlayer = dynamic(() =>
    import('react-twitch-embed').then((mod) => mod.TwitchPlayer),
);

interface LiveCountDataPoint {
    count: number;
    timestamp: number;
}

export const HeroContent = ({
    liveRuns,
    countHistory,
}: {
    liveRuns: LiveRun[];
    countHistory: LiveCountDataPoint[];
}) => {
    const [showedRunIndex, setShowedRunIndex] = useState(0);

    const handleNextRun = useCallback(() => {
        setShowedRunIndex((prevIndex) =>
            prevIndex === liveRuns.length - 1 ? 0 : prevIndex + 1,
        );
    }, [liveRuns.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                handleNextRun();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextRun]);

    const liveRun = liveRuns[showedRunIndex];

    if (!liveRun) {
        return <HeroSkeleton />;
    }

    return (
        <HeroRun
            liveRun={liveRun}
            countHistory={countHistory}
            onNextRun={handleNextRun}
        />
    );
};

const HeroRun = ({
    liveRun,
    countHistory,
    onNextRun,
}: {
    liveRun: LiveRun;
    countHistory: LiveCountDataPoint[];
    onNextRun: () => void;
}) => {
    const [updatedLiveRun, setUpdatedLiveRun] = useState<LiveRun | undefined>(
        liveRun,
    );

    const lastMessage = useLiveRunsWebsocket(liveRun.user);

    useEffect(() => {
        if (lastMessage?.type === 'UPDATE') {
            setUpdatedLiveRun(lastMessage.run);
        }
        if (lastMessage?.type === 'DELETE') {
            setUpdatedLiveRun(undefined);
        }
    }, [lastMessage]);

    useEffect(() => {
        setUpdatedLiveRun(liveRun);
    }, [liveRun]);

    if (!updatedLiveRun) {
        return <HeroSkeleton />;
    }

    return (
        <div className={clsx(styles.hero, 'mb-3')}>
            <Row className="g-3">
                {/* Left: Activity chart */}
                <Col xl={3} lg={12} className="d-none d-xl-block">
                    <div
                        className={clsx(
                            styles.panel,
                            'h-100 d-flex flex-column p-3',
                        )}
                    >
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span
                                className={clsx(
                                    styles.liveIndicator,
                                    'rounded-circle',
                                )}
                            />
                            <span className="fw-semibold text-uppercase small">
                                Activity
                            </span>
                        </div>
                        <div className="flex-grow-1">
                            <LiveCountChart data={countHistory} />
                        </div>
                    </div>
                </Col>

                {/* Center: Stream */}
                <Col xl={5} lg={7} md={12}>
                    <div
                        className={clsx(styles.panel, styles.streamPanel)}
                        style={{ height: '340px' }}
                    >
                        <div className="ratio ratio-16x9 w-100 h-100">
                            <TwitchPlayer
                                channel={updatedLiveRun.user}
                                width="100%"
                                height="100%"
                                autoplay={true}
                                muted={true}
                                id="frontpage-twitch-player"
                            />
                        </div>
                    </div>
                </Col>

                {/* Right: Run stats */}
                <Col xl={4} lg={5} md={12}>
                    <div
                        className={clsx(
                            styles.panel,
                            'h-100 d-flex flex-column justify-content-center p-3',
                        )}
                        style={{ minHeight: '340px' }}
                    >
                        <HeroRunStats run={updatedLiveRun} onNext={onNextRun} />
                    </div>
                </Col>
            </Row>

            {/* Activity chart for smaller screens - below the stream */}
            <Row className="g-3 mt-0 d-xl-none">
                <Col xs={12}>
                    <div className={clsx(styles.panel, 'p-3')}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span
                                className={clsx(
                                    styles.liveIndicator,
                                    'rounded-circle',
                                )}
                            />
                            <span className="fw-semibold text-uppercase small">
                                Activity
                            </span>
                        </div>
                        <LiveCountChart data={countHistory} />
                    </div>
                </Col>
            </Row>
        </div>
    );
};

const HeroRunStats = ({
    run,
    onNext,
}: {
    run: LiveRun;
    onNext: () => void;
}) => {
    return (
        <>
            <div className="text-center">
                <div
                    className={`d-flex align-items-center justify-content-center gap-2 mb-2 ${styles.userHeader}`}
                >
                    {run.picture && run.picture !== 'noimage' && (
                        <div className={styles.userImageWrapper}>
                            <Image
                                src={run.picture}
                                alt={run.user}
                                fill
                                style={{ objectFit: 'cover' }}
                                className={styles.userImage}
                            />
                        </div>
                    )}
                    <h3 className="m-0 text-break">{run.user}</h3>
                </div>
                <span className="fs-smaller text-muted">is running</span>
                <div
                    className={`d-flex align-items-center justify-content-center gap-2 ${styles.gameInfo}`}
                >
                    {run.gameImage && run.gameImage !== 'noimage' && (
                        <div className={styles.gameImageWrapper}>
                            <Image
                                src={run.gameImage}
                                alt={run.game}
                                fill
                                style={{ objectFit: 'contain' }}
                                className={styles.gameImage}
                            />
                        </div>
                    )}
                    <div className="text-break">
                        <span className="fw-bold">{run.game}</span> -{' '}
                        <span className="fst-italic">{run.category}</span>
                    </div>
                </div>
            </div>

            <hr className="w-75 mx-auto my-3" />

            <LiveSplitTimerComponent
                liveRun={run}
                dark={false}
                withDiff={false}
                timerClassName="font-monospace text-center w-100 fs-1 fw-bold justify-content-center"
            />

            <Row className="mt-4 g-2">
                <Col className="d-flex flex-column align-items-center">
                    <span className="text-muted small text-uppercase">
                        Personal Best
                    </span>
                    <span className="fw-bold fs-5">
                        <DurationToFormatted duration={run.pb} />
                    </span>
                </Col>
                <Col className="d-flex flex-column align-items-center border-start border-end">
                    <span className="text-muted small text-uppercase">
                        Current Split
                    </span>
                    <span
                        className="fw-bold text-break text-center text-truncate"
                        style={{ maxWidth: '200px' }}
                    >
                        {run.currentSplitName || 'Finished!'}
                    </span>
                </Col>
                <Col className="d-flex flex-column align-items-center">
                    <span className="text-muted small text-uppercase">
                        +/- PB
                    </span>
                    <span className="fw-bold">
                        <DifferenceFromOne diff={run.delta} />
                    </span>
                </Col>
            </Row>

            <div className="mt-auto pt-4 text-center w-100">
                <Button
                    variant="primary"
                    className="w-100 py-2 rounded-3 fw-bold text-uppercase"
                    style={{ letterSpacing: '0.5px', fontSize: '0.95rem' }}
                    onClick={onNext}
                    title="Press Right Arrow key to skip"
                >
                    Watch next run &gt;
                </Button>
            </div>
        </>
    );
};

const HeroSkeleton = () => {
    return (
        <div className={clsx(styles.hero, 'mb-3')}>
            <Row className="g-3">
                <Col xl={3} lg={12} className="d-none d-xl-block">
                    <div
                        className={clsx(styles.panel, 'h-100 p-3')}
                        style={{ minHeight: '340px' }}
                    >
                        <div className="placeholder-glow">
                            <Placeholder xs={4} className="mb-3" />
                            <Placeholder xs={12} style={{ height: '180px' }} />
                        </div>
                    </div>
                </Col>
                <Col xl={5} lg={7} md={12}>
                    <div
                        className={clsx(
                            styles.panel,
                            'd-flex align-items-center justify-content-center',
                        )}
                        style={{ height: '340px' }}
                    >
                        <div
                            className="spinner-border text-secondary"
                            role="status"
                        >
                            <span className="visually-hidden">
                                Loading stream...
                            </span>
                        </div>
                    </div>
                </Col>
                <Col xl={4} lg={5} md={12}>
                    <div
                        className={clsx(styles.panel, 'p-4')}
                        style={{ minHeight: '340px' }}
                    >
                        <div className="d-flex flex-column align-items-center w-100 placeholder-glow">
                            <Placeholder as="h3" xs={6} className="mb-2" />
                            <Placeholder xs={4} className="mb-3" />
                            <Placeholder xs={8} size="lg" className="my-3" />
                            <Row className="w-100 mt-4">
                                <Col className="text-center">
                                    <Placeholder xs={8} />
                                </Col>
                                <Col className="text-center">
                                    <Placeholder xs={8} />
                                </Col>
                                <Col className="text-center">
                                    <Placeholder xs={8} />
                                </Col>
                            </Row>
                            <Placeholder.Button
                                variant="primary"
                                xs={12}
                                className="mt-5 py-2"
                            />
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
};
