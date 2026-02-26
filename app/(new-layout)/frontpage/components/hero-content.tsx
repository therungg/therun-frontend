'use client';

import clsx from 'clsx';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Col, Placeholder, Row } from 'react-bootstrap';
import {
    LiveRun,
    WebsocketLiveRunMessage,
} from '~app/(old-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(old-layout)/live/live-split-timer.component';
import {
    DifferenceFromOne,
    DurationToFormatted,
} from '~src/components/util/datetime';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import styles from './hero-content.module.scss';
import { type StaleReason, useRunRefresh } from './use-run-refresh';

const TwitchPlayer = dynamic(() =>
    import('react-twitch-embed').then((mod) => mod.TwitchPlayer),
);

type SplitStatus =
    | 'pending'
    | 'neutral'
    | 'gold'
    | 'ahead'
    | 'ahead-muted'
    | 'behind'
    | 'behind-muted';

const getSplitSegments = (run: LiveRun): SplitStatus[] =>
    run.splits.map((split, i) => {
        if (i >= run.currentSplitIndex) return 'pending';
        const time = split.splitTime;
        if (!time) return 'neutral';

        const prevTime = i > 0 ? run.splits[i - 1].splitTime : 0;
        if (i > 0 && !prevTime) return 'neutral';
        const segmentTime = time - (prevTime ?? 0);

        // Gold: segment time beats best segment ever
        const bestSegCumulative = split.comparisons?.['Best Segments'];
        const prevBestSegCumulative =
            i > 0 ? run.splits[i - 1].comparisons?.['Best Segments'] : 0;
        const bestSegSingle =
            bestSegCumulative && (i === 0 || prevBestSegCumulative)
                ? bestSegCumulative - (prevBestSegCumulative ?? 0)
                : null;

        if (bestSegSingle && segmentTime < bestSegSingle) return 'gold';

        // Cumulative: ahead or behind PB overall?
        const pbCumulative = split.comparisons?.['Personal Best'];
        if (!pbCumulative) return 'neutral';
        const aheadOverall = time < pbCumulative;

        // Segment: gained or lost time vs PB segment? Bright = gained, muted = lost
        const prevPbCumulative =
            i > 0 ? run.splits[i - 1].comparisons?.['Personal Best'] : 0;
        const pbSegSingle =
            pbCumulative && (i === 0 || prevPbCumulative)
                ? pbCumulative - (prevPbCumulative ?? 0)
                : null;
        const gainedTime = pbSegSingle ? segmentTime < pbSegSingle : null;

        if (aheadOverall) {
            return gainedTime ? 'ahead' : 'ahead-muted';
        }
        return gainedTime ? 'behind' : 'behind-muted';
    });

type CardFlash = 'gold' | 'ahead' | 'behind' | null;

const useSplitFlash = (run: LiveRun): CardFlash => {
    const [flash, setFlash] = useState<CardFlash>(null);
    const prevSplitIndexRef = useRef(run.currentSplitIndex);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (run.currentSplitIndex > prevSplitIndexRef.current) {
            const segments = getSplitSegments(run);
            const lastCompleted = run.currentSplitIndex - 1;
            const status = segments[lastCompleted];
            const highlight: CardFlash =
                status === 'gold'
                    ? 'gold'
                    : status === 'ahead' || status === 'ahead-muted'
                      ? 'ahead'
                      : status === 'behind' || status === 'behind-muted'
                        ? 'behind'
                        : null;

            setFlash(highlight);
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setFlash(null), 3000);
        }
        prevSplitIndexRef.current = run.currentSplitIndex;
    });

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    return flash;
};

const SplitTimeline = ({
    run,
    segments,
    className,
}: {
    run: LiveRun;
    segments: SplitStatus[];
    className?: string;
}) => {
    const justCompleted = run.currentSplitIndex - 1;
    const completed = segments.filter((s) => s !== 'pending').length;
    const gold = segments.filter((s) => s === 'gold').length;
    const ahead = segments.filter(
        (s) => s === 'ahead' || s === 'ahead-muted',
    ).length;
    const behind = segments.filter(
        (s) => s === 'behind' || s === 'behind-muted',
    ).length;

    const parts = [`${completed} of ${segments.length} splits completed`];
    if (gold > 0) parts.push(`${gold} gold`);
    if (ahead > 0) parts.push(`${ahead} ahead`);
    if (behind > 0) parts.push(`${behind} behind`);

    return (
        <div
            className={clsx(styles.splitTimeline, className)}
            role="img"
            aria-label={parts.join(', ')}
        >
            {segments.map((status, i) => (
                <div
                    key={i}
                    className={clsx(
                        styles.splitSegment,
                        status === 'gold' && styles.splitSegmentGold,
                        status === 'ahead' && styles.splitSegmentAhead,
                        status === 'ahead-muted' &&
                            styles.splitSegmentAheadMuted,
                        status === 'behind' && styles.splitSegmentBehind,
                        status === 'behind-muted' &&
                            styles.splitSegmentBehindMuted,
                        status === 'neutral' && styles.splitSegmentNeutral,
                        i === run.currentSplitIndex &&
                            styles.splitSegmentCurrent,
                        i === justCompleted &&
                            (status === 'ahead' || status === 'ahead-muted') &&
                            styles.splitSegmentAheadLatest,
                        i === justCompleted &&
                            status === 'gold' &&
                            styles.splitSegmentGoldLatest,
                    )}
                />
            ))}
        </div>
    );
};

export const HeroContent = ({
    liveRuns: initialRuns,
    liveCount: initialLiveCount,
}: {
    liveRuns: LiveRun[];
    liveCount: number;
}) => {
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const {
        liveRuns,
        liveCount,
        staleMap,
        enteringUsers,
        handleWsMessage,
        countdownMap,
        markStale,
    } = useRunRefresh(
        initialRuns,
        initialLiveCount,
        featuredIndex,
        setFeaturedIndex,
    );

    const handleSelectRun = useCallback((index: number) => {
        setFeaturedIndex(index);
    }, []);

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
            liveCount={liveCount}
            onSelectRun={handleSelectRun}
            staleMap={staleMap}
            enteringUsers={enteringUsers}
            onWsMessage={handleWsMessage}
            countdownMap={countdownMap}
            markStale={markStale}
        />
    );
};

const HeroLayout = ({
    featuredRun,
    sidebarRuns,
    featuredIndex,
    allRuns,
    liveCount,
    onSelectRun,
    staleMap,
    enteringUsers,
    onWsMessage,
    countdownMap,
    markStale,
}: {
    featuredRun: LiveRun;
    sidebarRuns: LiveRun[];
    featuredIndex: number;
    allRuns: LiveRun[];
    liveCount: number;
    onSelectRun: (index: number) => void;
    staleMap: Map<string, StaleReason>;
    enteringUsers: Set<string>;
    onWsMessage: (msg: WebsocketLiveRunMessage) => void;
    countdownMap: Map<string, number>;
    markStale: (user: string, reason: StaleReason) => void;
}) => {
    const currentFeatured = allRuns[featuredIndex] ?? featuredRun;

    // Track featured user in ref so the onOffline callback always reads the latest
    const featuredUserRef = useRef(currentFeatured.user);
    featuredUserRef.current = currentFeatured.user;

    const handleTwitchOffline = useCallback(() => {
        markStale(featuredUserRef.current, 'offline');
    }, [markStale]);

    // Set title on the Twitch iframe for accessibility
    useEffect(() => {
        const iframe = document.querySelector(
            '#frontpage-twitch-player iframe',
        ) as HTMLIFrameElement | null;
        if (iframe && !iframe.title) {
            iframe.title = `${currentFeatured.user}'s Twitch stream`;
        }
    }, [currentFeatured.user]);

    return (
        <div className={clsx(styles.hero, 'mb-3')}>
            {allRuns.map((run) => (
                <RunSubscriber
                    key={run.user}
                    user={run.user}
                    onMessage={onWsMessage}
                />
            ))}
            <Row className="g-3">
                {/* Left: Featured Run */}
                <Col xl={5} lg={5} md={12}>
                    <FeaturedRunPanel
                        run={currentFeatured}
                        staleReason={staleMap.get(currentFeatured.user)}
                        countdown={countdownMap.get(currentFeatured.user)}
                    />
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
                                onOffline={handleTwitchOffline}
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
                        liveCount={liveCount}
                        onSelectRun={onSelectRun}
                        staleMap={staleMap}
                        enteringUsers={enteringUsers}
                        countdownMap={countdownMap}
                    />
                </Col>
            </Row>
        </div>
    );
};

const STALE_LABELS: Record<StaleReason, string> = {
    finished: 'Finished',
    reset: 'Reset',
    offline: 'Offline',
};

const FeaturedRunPanel = ({
    run,
    staleReason,
    countdown,
}: {
    run: LiveRun;
    staleReason?: StaleReason;
    countdown?: number | null;
}) => {
    const hasGameImage = run.gameImage && run.gameImage !== 'noimage';
    const hasAvatar = run.picture && run.picture !== 'noimage';
    const onPbPace = run.delta < 0;
    const splitSegments = getSplitSegments(run);
    const flash = useSplitFlash(run);

    return (
        <Link
            href={`/live/${run.user}`}
            className={clsx(
                styles.featuredPanel,
                staleReason === 'finished'
                    ? styles.featuredPanelFinished
                    : staleReason
                      ? styles.featuredPanelStale
                      : [
                            onPbPace && styles.featuredPanelPbPace,
                            flash === 'gold' && styles.featuredPanelGold,
                            flash === 'ahead' && styles.featuredPanelGreen,
                            flash === 'behind' && styles.featuredPanelRed,
                        ],
            )}
            style={{ textDecoration: 'none', color: 'inherit' }}
        >
            {staleReason && (
                <div
                    className={clsx(
                        styles.staleBadge,
                        staleReason === 'finished' && styles.staleBadgeFinished,
                    )}
                >
                    {STALE_LABELS[staleReason]}
                    {countdown != null && ` · ${countdown}`}
                </div>
            )}
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
                                alt=""
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
                        {!staleReason && onPbPace && (
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
    liveCount,
    onSelectRun,
    staleMap,
    enteringUsers,
    countdownMap,
}: {
    runs: LiveRun[];
    allRuns: LiveRun[];
    featuredIndex: number;
    liveCount: number;
    onSelectRun: (index: number) => void;
    staleMap: Map<string, StaleReason>;
    enteringUsers: Set<string>;
    countdownMap: Map<string, number>;
}) => {
    return (
        <div className={styles.sidebar} style={{ height: '340px' }}>
            {runs.slice(0, 4).map((run) => {
                const globalIndex = allRuns.findIndex(
                    (r) => r.user === run.user,
                );
                return (
                    <SidebarCard
                        key={run.user}
                        run={run}
                        isActive={globalIndex === featuredIndex}
                        onSelect={() => onSelectRun(globalIndex)}
                        staleReason={staleMap.get(run.user)}
                        isEntering={enteringUsers.has(run.user)}
                        countdown={countdownMap.get(run.user)}
                    />
                );
            })}

            <Link href="/live" className={styles.viewAllLink}>
                <span className={styles.viewAllDot} />
                <span>View all {liveCount} live runs</span>
                <span className={styles.viewAllArrow}>&rarr;</span>
            </Link>
        </div>
    );
};

const SidebarCard = ({
    run,
    isActive,
    onSelect,
    staleReason,
    isEntering,
    countdown,
}: {
    run: LiveRun;
    isActive: boolean;
    onSelect: () => void;
    staleReason?: StaleReason;
    isEntering?: boolean;
    countdown?: number;
}) => {
    const hasGameImage = run.gameImage && run.gameImage !== 'noimage';
    const hasAvatar = run.picture && run.picture !== 'noimage';
    const segments = getSplitSegments(run);
    const flash = useSplitFlash(run);

    const isStale = !!staleReason;

    return (
        <button
            type="button"
            className={clsx(
                styles.sidebarCard,
                isActive && styles.sidebarCardActive,
                staleReason === 'finished'
                    ? styles.sidebarCardFinished
                    : staleReason
                      ? styles.sidebarCardStale
                      : [
                            flash === 'gold' && styles.sidebarCardGold,
                            flash === 'ahead' && styles.sidebarCardGreen,
                            flash === 'behind' && styles.sidebarCardRed,
                        ],
                isEntering && styles.sidebarCardEnter,
            )}
            onClick={onSelect}
            aria-disabled={isStale || undefined}
            tabIndex={isStale ? -1 : undefined}
            aria-label={`${run.user} playing ${run.game}${staleReason ? ` (${STALE_LABELS[staleReason]})` : ''}`}
        >
            {staleReason && (
                <div
                    className={clsx(
                        styles.staleBadge,
                        staleReason === 'finished' && styles.staleBadgeFinished,
                    )}
                >
                    {STALE_LABELS[staleReason]}
                    {countdown != null && ` · ${countdown}`}
                </div>
            )}
            {hasGameImage ? (
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
            ) : (
                <div className={styles.sidebarCardArtFallback}>
                    <Image
                        src="/logo_dark_theme_no_text_transparent.png"
                        alt="therun.gg"
                        width={40}
                        height={40}
                    />
                </div>
            )}
            <div className={styles.sidebarCardContent}>
                <div className={styles.sidebarCardTop}>
                    {hasAvatar && (
                        <div className={styles.sidebarAvatar}>
                            <Image
                                src={run.picture!}
                                alt=""
                                fill
                                style={{ objectFit: 'cover' }}
                                unoptimized
                            />
                        </div>
                    )}
                    <div className={styles.sidebarCardInfo}>
                        <span className={styles.sidebarRunner}>{run.user}</span>
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
                    segments={segments}
                    className={styles.sidebarTimeline}
                />
            </div>
        </button>
    );
};

const RunSubscriber = ({
    user,
    onMessage,
}: {
    user: string;
    onMessage: (msg: WebsocketLiveRunMessage) => void;
}) => {
    const lastMessage = useLiveRunsWebsocket(user);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    useEffect(() => {
        if (lastMessage) onMessageRef.current(lastMessage);
    }, [lastMessage]);

    return null;
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
