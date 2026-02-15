'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Col, Placeholder, Row } from 'react-bootstrap';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(old-layout)/live/live-split-timer.component';
import {
    DifferenceFromOne,
    DurationToFormatted,
} from '~src/components/util/datetime';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import styles from './hero-content.module.scss';

const TwitchPlayer = dynamic(() =>
    import('react-twitch-embed').then((mod) => mod.TwitchPlayer),
);

export const HeroContent = ({
    liveRuns: initialRuns,
}: {
    liveRuns: LiveRun[];
}) => {
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const [liveRuns, setLiveRuns] = useState(initialRuns);

    const handleSelectRun = useCallback((index: number) => {
        setFeaturedIndex(index);
    }, []);

    const handleNextRun = useCallback(() => {
        setFeaturedIndex((prev) =>
            prev >= liveRuns.length - 1 ? 0 : prev + 1,
        );
    }, [liveRuns.length]);

    const handlePrevRun = useCallback(() => {
        setFeaturedIndex((prev) =>
            prev <= 0 ? liveRuns.length - 1 : prev - 1,
        );
    }, [liveRuns.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNextRun();
            if (e.key === 'ArrowLeft') handlePrevRun();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextRun, handlePrevRun]);

    const featuredRun = liveRuns[featuredIndex];
    const sidebarRuns = liveRuns.filter((_, i) => i !== featuredIndex);

    if (!featuredRun) {
        return <HeroSkeleton />;
    }

    return (
        <HeroLayout
            featuredRun={featuredRun}
            sidebarRuns={sidebarRuns}
            featuredIndex={featuredIndex}
            allRuns={liveRuns}
            onSelectRun={handleSelectRun}
            onUpdateRuns={setLiveRuns}
        />
    );
};

const HeroLayout = ({
    featuredRun,
    sidebarRuns,
    featuredIndex,
    allRuns,
    onSelectRun,
    onUpdateRuns,
}: {
    featuredRun: LiveRun;
    sidebarRuns: LiveRun[];
    featuredIndex: number;
    allRuns: LiveRun[];
    onSelectRun: (index: number) => void;
    onUpdateRuns: (runs: LiveRun[]) => void;
}) => {
    const lastMessage = useLiveRunsWebsocket(featuredRun.user);

    useEffect(() => {
        if (!lastMessage) return;
        if (lastMessage.type === 'UPDATE') {
            onUpdateRuns(
                allRuns.map((r) =>
                    r.user === lastMessage.user ? lastMessage.run : r,
                ),
            );
        }
    }, [lastMessage]);

    const currentFeatured = allRuns[featuredIndex] ?? featuredRun;

    return (
        <div className={clsx(styles.hero, 'mb-3')}>
            <Row className="g-3">
                {/* Left: Featured Run */}
                <Col xl={5} lg={5} md={12}>
                    <FeaturedRunPanel run={currentFeatured} />
                </Col>

                {/* Center: Twitch Embed */}
                <Col xl={4} lg={4} md={12}>
                    <div
                        className={clsx(styles.panel, styles.streamPanel)}
                        style={{ height: '340px' }}
                    >
                        <div className="ratio ratio-16x9 w-100 h-100">
                            <TwitchPlayer
                                channel={currentFeatured.user}
                                width="100%"
                                height="100%"
                                autoplay={true}
                                muted={true}
                                id="frontpage-twitch-player"
                            />
                        </div>
                    </div>
                </Col>

                {/* Right: Live Sidebar */}
                <Col xl={3} lg={3} md={12}>
                    <LiveSidebar
                        runs={sidebarRuns}
                        allRuns={allRuns}
                        featuredIndex={featuredIndex}
                        onSelectRun={onSelectRun}
                    />
                </Col>
            </Row>
        </div>
    );
};

const FeaturedRunPanel = ({ run }: { run: LiveRun }) => {
    const hasGameImage = run.gameImage && run.gameImage !== 'noimage';
    const progress =
        run.splits.length > 0
            ? (run.currentSplitIndex / run.splits.length) * 100
            : 0;

    return (
        <div
            className={clsx(styles.panel, styles.featuredPanel)}
            style={{ height: '340px' }}
        >
            {hasGameImage && (
                <div
                    className={styles.featuredBg}
                    style={{ backgroundImage: `url(${run.gameImage})` }}
                />
            )}
            <div className={styles.featuredOverlay} />

            <div className={styles.featuredContent}>
                {/* Runner identity */}
                <div className={styles.userHeader}>
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
                    <div>
                        <h3 className={styles.userName}>{run.user}</h3>
                        <span className={styles.isRunningLabel}>
                            is running
                        </span>
                    </div>
                </div>

                {/* Game + Category */}
                <div className={styles.gameInfo}>
                    {hasGameImage && (
                        <div className={styles.gameImageWrapper}>
                            <Image
                                src={run.gameImage!}
                                alt={run.game}
                                fill
                                style={{ objectFit: 'contain' }}
                                className={styles.gameImage}
                            />
                        </div>
                    )}
                    <div>
                        <div className={styles.gameName}>{run.game}</div>
                        <div className={styles.categoryName}>
                            {run.category}
                        </div>
                    </div>
                </div>

                {/* Live timer */}
                <div className={styles.timerWrapper}>
                    <LiveSplitTimerComponent
                        liveRun={run}
                        dark={false}
                        withDiff={false}
                        timerClassName="font-monospace text-center w-100 fs-1 fw-bold justify-content-center"
                        className="d-flex justify-content-center"
                    />
                </div>

                {/* Stats row */}
                <div className={styles.statsRow}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Personal Best</span>
                        <span className={styles.statValue}>
                            <DurationToFormatted duration={run.pb} />
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Current Split</span>
                        <span
                            className={styles.statValue}
                            style={{
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {run.currentSplitName || 'Finished!'}
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>+/- PB</span>
                        <span className={styles.statValue}>
                            <DifferenceFromOne diff={run.delta} />
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className={styles.progressWrapper}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                    <div className={styles.progressLabel}>
                        <span>
                            Split {run.currentSplitIndex} / {run.splits.length}
                        </span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LiveSidebar = ({
    runs,
    allRuns,
    featuredIndex,
    onSelectRun,
}: {
    runs: LiveRun[];
    allRuns: LiveRun[];
    featuredIndex: number;
    onSelectRun: (index: number) => void;
}) => {
    return (
        <div className={styles.sidebar} style={{ height: '340px' }}>
            {runs.slice(0, 4).map((run) => {
                const globalIndex = allRuns.indexOf(run);
                const isActive = globalIndex === featuredIndex;
                const progress =
                    run.splits.length > 0
                        ? (run.currentSplitIndex / run.splits.length) * 100
                        : 0;

                return (
                    <button
                        type="button"
                        key={run.user}
                        className={clsx(
                            styles.sidebarCard,
                            isActive && styles.sidebarCardActive,
                        )}
                        onClick={() => onSelectRun(globalIndex)}
                    >
                        <div className={styles.sidebarCardInfo}>
                            <span className={styles.sidebarRunner}>
                                {run.user}
                            </span>
                            <span className={styles.sidebarGame}>
                                {run.game}
                            </span>
                            <div className={styles.sidebarMiniProgress}>
                                <div
                                    className={styles.sidebarMiniProgressFill}
                                    style={{
                                        width: `${Math.min(progress, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <span className={styles.sidebarDelta}>
                            <DifferenceFromOne diff={run.delta} />
                        </span>
                    </button>
                );
            })}

            <Link href="/live" className={styles.viewAllLink}>
                View all live runs &rarr;
            </Link>
        </div>
    );
};

const HeroSkeleton = () => {
    return (
        <div className={clsx(styles.hero, 'mb-3')}>
            <Row className="g-3">
                <Col xl={5} lg={5} md={12}>
                    <div
                        className={clsx(
                            styles.panel,
                            styles.skeletonPanel,
                            'p-4',
                        )}
                    >
                        <div className="placeholder-glow">
                            <div className="d-flex align-items-center gap-3 mb-3">
                                <Placeholder
                                    as="span"
                                    className="rounded-circle"
                                    style={{ width: 48, height: 48 }}
                                />
                                <div className="flex-grow-1">
                                    <Placeholder
                                        xs={6}
                                        className="d-block mb-1"
                                    />
                                    <Placeholder xs={3} />
                                </div>
                            </div>
                            <Placeholder xs={8} className="d-block mb-2" />
                            <Placeholder xs={5} className="d-block mb-4" />
                            <Placeholder
                                xs={12}
                                size="lg"
                                className="d-block my-4"
                                style={{ height: '3rem' }}
                            />
                            <div className="d-flex gap-3">
                                <Placeholder xs={4} />
                                <Placeholder xs={4} />
                                <Placeholder xs={4} />
                            </div>
                        </div>
                    </div>
                </Col>
                <Col xl={4} lg={4} md={12}>
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
                <Col xl={3} lg={3} md={12}>
                    <div
                        className="d-flex flex-column gap-2"
                        style={{ height: '340px' }}
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={clsx(
                                    styles.panel,
                                    'p-3 flex-fill placeholder-glow',
                                )}
                            >
                                <Placeholder xs={6} className="d-block mb-1" />
                                <Placeholder xs={8} />
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>
        </div>
    );
};
