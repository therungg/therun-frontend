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

type SplitStatus = 'pending' | 'neutral' | 'gold' | 'ahead' | 'behind';

const getSplitSegments = (run: LiveRun): SplitStatus[] =>
    run.splits.map((split, i) => {
        if (i >= run.currentSplitIndex) return 'pending';
        const time = split.splitTime;
        if (!time) return 'neutral';

        const prevTime = i > 0 ? run.splits[i - 1].splitTime : 0;
        if (i > 0 && !prevTime) return 'neutral';
        const segmentTime = time - (prevTime ?? 0);

        const bestSegCumulative = split.comparisons?.['Best Segments'];
        const prevBestSegCumulative =
            i > 0 ? run.splits[i - 1].comparisons?.['Best Segments'] : 0;
        const bestSegSingle =
            bestSegCumulative && (i === 0 || prevBestSegCumulative)
                ? bestSegCumulative - (prevBestSegCumulative ?? 0)
                : null;

        if (bestSegSingle && segmentTime < bestSegSingle) return 'gold';

        const pbCumulative = split.comparisons?.['Personal Best'];
        if (pbCumulative && time <= pbCumulative) return 'ahead';
        return 'behind';
    });

const SplitTimeline = ({
    run,
    segments,
    className,
}: {
    run: LiveRun;
    segments: SplitStatus[];
    className?: string;
}) => (
    <div className={clsx(styles.splitTimeline, className)}>
        {segments.map((status, i) => (
            <div
                key={run.splits[i].name}
                className={clsx(
                    styles.splitSegment,
                    status === 'gold' && styles.splitSegmentGold,
                    status === 'ahead' && styles.splitSegmentAhead,
                    status === 'behind' && styles.splitSegmentBehind,
                    status === 'neutral' && styles.splitSegmentNeutral,
                    i === run.currentSplitIndex && styles.splitSegmentCurrent,
                )}
            />
        ))}
    </div>
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
    const hasAvatar = run.picture && run.picture !== 'noimage';
    const onPbPace = run.delta < 0;
    const splitSegments = getSplitSegments(run);

    return (
        <Link
            href={`/live/${run.user}`}
            className={clsx(
                styles.featuredPanel,
                onPbPace && styles.featuredPanelPbPace,
            )}
            style={{ textDecoration: 'none', color: 'inherit' }}
        >
            {/* Game art */}
            {hasGameImage && (
                <div className={styles.gameArtWrapper}>
                    <Image
                        src={run.gameImage!}
                        alt={run.game}
                        fill
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center',
                        }}
                        unoptimized
                    />
                </div>
            )}

            {/* Content */}
            <div
                className={clsx(
                    styles.featuredContent,
                    hasGameImage && styles.featuredContentWithArt,
                )}
            >
                {/* Top: runner + LIVE badge */}
                <div className={styles.runnerIdentity}>
                    {hasAvatar && (
                        <div className={styles.avatarWrapper}>
                            <Image
                                src={run.picture!}
                                alt={run.user}
                                fill
                                style={{ objectFit: 'cover' }}
                                className={styles.avatar}
                            />
                        </div>
                    )}
                    <div className={styles.runnerDetails}>
                        <h3 className={styles.runnerName}>{run.user}</h3>
                        <span className={styles.gameLabelText}>
                            {run.game}
                            {' · '}
                            <span className={styles.categoryLabel}>
                                {run.category}
                            </span>
                        </span>
                    </div>
                    <div className={styles.liveBadge}>
                        <span className={styles.liveDot} />
                        LIVE
                    </div>
                </div>

                {/* Timer block — total + delta on one line, segment below */}
                <div className={styles.timerSection}>
                    <div className={styles.mainTimerRow}>
                        <LiveSplitTimerComponent
                            liveRun={run}
                            dark={false}
                            withDiff={false}
                            timerClassName={styles.mainTimer}
                            className="d-flex"
                        />
                        {onPbPace && (
                            <span className={styles.pbPaceBadge}>PB Pace</span>
                        )}
                    </div>
                    <LiveSplitTimerComponent
                        liveRun={run}
                        dark={false}
                        withDiff={false}
                        splitTime={true}
                        timerClassName={styles.segmentTimer}
                        className="d-flex"
                    />
                </div>

                {/* Stats */}
                <div className={styles.featuredBottom}>
                    <div className={styles.statsRow}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>PB</span>
                            <span className={styles.statValue}>
                                <DurationToFormatted duration={run.pb} />
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Delta</span>
                            <span className={styles.statValue}>
                                <DifferenceFromOne diff={run.delta} />
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>SOB</span>
                            <span className={styles.statValue}>
                                <DurationToFormatted duration={run.sob} />
                            </span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>
                                Best Possible
                            </span>
                            <span className={styles.statValue}>
                                <DurationToFormatted
                                    duration={run.bestPossible}
                                />
                            </span>
                        </div>
                    </div>

                    {/* Split timeline */}
                    <SplitTimeline run={run} segments={splitSegments} />
                    <div className={styles.progressMeta}>
                        <span>{run.currentSplitName || 'Done'}</span>
                        <span>
                            {run.currentSplitIndex}/{run.splits.length} splits
                        </span>
                    </div>
                </div>
            </div>
        </Link>
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
                const hasGameImage =
                    run.gameImage && run.gameImage !== 'noimage';
                const onPace = run.delta < 0;
                const hasAvatar = run.picture && run.picture !== 'noimage';

                return (
                    <button
                        type="button"
                        key={run.user}
                        className={clsx(
                            styles.sidebarCard,
                            isActive && styles.sidebarCardActive,
                            onPace && styles.sidebarCardPace,
                        )}
                        onClick={() => onSelectRun(globalIndex)}
                    >
                        {/* Game art background */}
                        {hasGameImage && (
                            <div className={styles.sidebarCardArt}>
                                <Image
                                    src={run.gameImage!}
                                    alt={run.game}
                                    fill
                                    style={{
                                        objectFit: 'cover',
                                        objectPosition: 'center',
                                    }}
                                    unoptimized
                                />
                            </div>
                        )}
                        <div className={styles.sidebarCardContent}>
                            <div className={styles.sidebarCardTop}>
                                {hasAvatar && (
                                    <div className={styles.sidebarAvatar}>
                                        <Image
                                            src={run.picture!}
                                            alt={run.user}
                                            fill
                                            style={{
                                                objectFit: 'cover',
                                            }}
                                            unoptimized
                                        />
                                    </div>
                                )}
                                <div className={styles.sidebarCardInfo}>
                                    <span className={styles.sidebarRunner}>
                                        {run.user}
                                    </span>
                                    <span className={styles.sidebarGame}>
                                        {run.game} · {run.category}
                                    </span>
                                </div>
                                <div className={styles.sidebarRight}>
                                    <LiveSplitTimerComponent
                                        liveRun={run}
                                        dark={false}
                                        withDiff={false}
                                        splitTime={false}
                                        timerClassName={styles.sidebarTimerText}
                                        className="d-inline-flex"
                                    />
                                    <span className={styles.sidebarDelta}>
                                        <DifferenceFromOne diff={run.delta} />
                                    </span>
                                </div>
                            </div>
                            <SplitTimeline
                                run={run}
                                segments={getSplitSegments(run)}
                                className={styles.sidebarTimeline}
                            />
                        </div>
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
