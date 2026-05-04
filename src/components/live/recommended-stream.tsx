import clsx from 'clsx';
import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { ChatLeftQuote } from 'react-bootstrap-icons';
import { TwitchEmbed } from 'react-twitch-embed';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(new-layout)/live/live-split-timer.component';
import { Split } from '~src/common/types';
import Link from '~src/components/link';
import { LiverunStatsPanel } from '~src/components/live/liverun-stats-panel';
import { SplitStatus, Status } from '~src/types/splits.types';
import { getColorMode } from '~src/utils/colormode';
import styles from '../css/LiveRun.module.scss';
import { UserLink } from '../links/links';
import { resolveFill } from '../patreon/patron-style';
import { usePatreons } from '../patreon/use-patreons';
import { DurationToFormatted } from '../util/datetime';
import { useCommentaryDrawerContext } from './commentary-drawer/commentary-drawer-context';
import {
    getSplitSegments,
    type SplitStatus as TimelineSplitStatus,
    useSplitFlash,
} from './split-utils';
import { SplitsViewer } from './splits-viewer';

const SplitTimeline = ({
    segments,
    currentSplitIndex,
}: {
    segments: TimelineSplitStatus[];
    currentSplitIndex: number;
}) => {
    const justCompleted = currentSplitIndex - 1;
    const tooManySplits = segments.length > 60;

    return (
        <div
            className={styles.splitTimeline}
            style={tooManySplits ? { gap: 0 } : undefined}
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
                        i === currentSplitIndex && styles.splitSegmentCurrent,
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

type StaleReason = 'reset' | 'finished' | 'offline';

const STALE_LABELS: Record<StaleReason, string> = {
    finished: 'Finished',
    reset: 'Reset',
    offline: 'Offline',
};

export const RecommendedStream = ({
    liveRun,
    stream = null,
    staleReason = null,
    countdown = null,
}: {
    liveRun: LiveRun;
    stream?: string | null;
    staleReason?: StaleReason | null;
    countdown?: number | null;
}) => {
    const [dark, setDark] = useState(true);
    const [activeLiveRun, setActiveLiveRun] = useState(liveRun);
    const [selectedSplit, setSelectedSplit] = useState(
        liveRun.currentSplitIndex,
    );
    const [recommendedStyles, setRecommendedStyles] = useState<{
        borderColor?: string;
        gradient?: string;
        patronPrimary?: string;
        patronGradient?: string;
        patronTier?: number;
        isGradient?: boolean;
        isAnimated?: boolean;
        hasPatronStyle?: boolean;
    }>({});
    const [manuallyChangedSplit, setManuallyChangedSplit] = useState(false);

    const pixelsForSplit = 27.9;

    const usePrevious = <T,>(value: T): T | undefined => {
        const ref = useRef<T>(undefined);
        useEffect(() => {
            ref.current = value;
        });
        return ref.current;
    };

    const previous = usePrevious({ activeLiveRun });

    const segments = getSplitSegments(activeLiveRun);
    const flash = useSplitFlash(activeLiveRun);
    const hasAvatar = liveRun.picture && liveRun.picture !== 'noimage';

    useEffect(function () {
        setDark(getColorMode() !== 'light');
    }, []);

    useEffect(() => {
        const scrollDistance = activeLiveRun.currentSplitIndex * pixelsForSplit;
        const scrollBox = document.getElementById('scrollBox');

        if (scrollBox) {
            if (
                activeLiveRun.currentSplitIndex !=
                previous?.activeLiveRun.currentSplitIndex
            ) {
                scrollBox.scrollTop = scrollDistance - 4 * pixelsForSplit;
            }

            if (
                !manuallyChangedSplit ||
                (previous && previous.activeLiveRun.user != activeLiveRun.user)
            ) {
                setSelectedSplit(activeLiveRun.currentSplitIndex);
            }
        }
    }, [activeLiveRun]);

    useEffect(() => {
        setActiveLiveRun(liveRun);
    }, [liveRun]);

    const { data: patreons, isLoading } = usePatreons();
    const commentaryCtx = useCommentaryDrawerContext();

    useEffect(() => {
        if (!isLoading && patreons && patreons[liveRun.user]) {
            const { preferences, tier } = patreons[liveRun.user];
            let borderColor = '';
            let gradient = '';
            let patronPrimary = '';
            let patronGradient = '';
            let patronTier = 0;
            let isGradient = false;
            let isAnimated = false;
            let hasPatronStyle = false;

            if (!preferences || !preferences.hide) {
                const fill = resolveFill(
                    preferences,
                    tier,
                    dark ? 'dark' : 'light',
                );
                patronTier = Math.min(tier, 3);
                hasPatronStyle = true;
                if (fill.kind === 'gradient') {
                    gradient = `-webkit-linear-gradient(left, ${fill.value.join(',')})`;
                    borderColor = fill.value[0];
                    patronPrimary = fill.value[0];
                    const angle =
                        preferences?.gradientAngle?.[dark ? 'dark' : 'light'] ??
                        90;
                    patronGradient = `linear-gradient(${angle}deg, ${fill.value.join(', ')})`;
                    isGradient = true;
                    isAnimated = !!preferences?.gradientAnimated;
                } else {
                    borderColor = fill.value;
                    patronPrimary = fill.value;
                }
            }
            setRecommendedStyles({
                borderColor,
                gradient,
                patronPrimary,
                patronGradient,
                patronTier,
                isGradient,
                isAnimated,
                hasPatronStyle,
            });
        }
    }, [patreons, isLoading, liveRun.user, dark]);

    if (
        !activeLiveRun ||
        !activeLiveRun.splits ||
        activeLiveRun.isMinified ||
        !liveRun ||
        isLoading
    ) {
        return <>Loading live data...</>;
    }

    const currentSplitSplitStatus = getSplitStatus(
        liveRun,
        liveRun.currentSplitIndex,
    );

    return (
        <Col xs={12}>
            <div
                className={clsx(
                    styles.heroWrapper,
                    staleReason === 'finished'
                        ? styles.heroIdentityFinished
                        : staleReason
                          ? styles.heroIdentityStale
                          : [
                                flash === 'gold' && styles.liveRunGold,
                                flash === 'ahead' && styles.liveRunGreen,
                                flash === 'behind' && styles.liveRunRed,
                            ],
                )}
            >
                {/* Runner identity bar */}
                <div
                    className={clsx(
                        styles.heroIdentityBar,
                        recommendedStyles.patronTier === 1 &&
                            styles.heroPatronTier1,
                        recommendedStyles.patronTier === 2 &&
                            styles.heroPatronTier2,
                        (recommendedStyles.patronTier ?? 0) >= 3 &&
                            styles.heroPatronTier3,
                        recommendedStyles.isGradient &&
                            styles.heroPatronGradient,
                        recommendedStyles.isAnimated &&
                            styles.heroPatronAnimated,
                    )}
                    style={
                        {
                            ...(recommendedStyles.patronPrimary && {
                                '--patron-primary':
                                    recommendedStyles.patronPrimary,
                            }),
                            ...(recommendedStyles.patronGradient && {
                                '--patron-gradient':
                                    recommendedStyles.patronGradient,
                            }),
                        } as React.CSSProperties
                    }
                >
                    {staleReason && (
                        <div
                            className={clsx(
                                styles.heroStaleBadge,
                                staleReason === 'finished' &&
                                    styles.heroStaleBadgeFinished,
                            )}
                        >
                            {STALE_LABELS[staleReason]}
                            {countdown != null && ` · ${countdown}`}
                        </div>
                    )}
                    {recommendedStyles.hasPatronStyle && !staleReason && (
                        <OverlayTrigger
                            placement="bottom"
                            overlay={
                                <Tooltip id={`supporter-${liveRun.user}`}>
                                    {liveRun.user} is a therun.gg supporter and
                                    picked these colors. Click to support too.
                                </Tooltip>
                            }
                        >
                            <Link
                                href="/support"
                                className={styles.heroSupporterChip}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className={styles.heroSupporterDot} />
                                Supporter colors
                            </Link>
                        </OverlayTrigger>
                    )}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            commentaryCtx.toggle();
                        }}
                        className={styles.heroSupporterChip}
                        aria-label="Open commentary view"
                        title="Commentary view"
                    >
                        <ChatLeftQuote /> Commentary
                    </button>
                    <div className={styles.heroIdentityLeft}>
                        {hasAvatar && (
                            <div className={styles.heroAvatar}>
                                <NextImage
                                    src={liveRun.picture!}
                                    alt=""
                                    fill
                                    style={{ objectFit: 'cover' }}
                                    className={styles.heroAvatarImg}
                                />
                            </div>
                        )}
                        <div>
                            <div className={styles.heroRunnerName}>
                                <UserLink username={liveRun.user} />
                            </div>
                            <span className={styles.heroGameLabel}>
                                {liveRun.game}
                                {' · '}
                                <span className={styles.heroCategoryLabel}>
                                    {liveRun.category}
                                </span>
                            </span>
                        </div>
                    </div>
                    <div className={styles.heroStatsRow}>
                        <div className={styles.heroStatItem}>
                            <span className={styles.heroStatLabel}>PB</span>
                            <span className={styles.heroStatValue}>
                                <DurationToFormatted duration={liveRun.pb} />
                            </span>
                        </div>
                        <div className={styles.heroStatItem}>
                            <span className={styles.heroStatLabel}>SOB</span>
                            <span className={styles.heroStatValue}>
                                <DurationToFormatted duration={liveRun.sob} />
                            </span>
                        </div>
                        <div className={styles.heroStatItem}>
                            <span className={styles.heroStatLabel}>
                                Best Possible
                            </span>
                            <span className={styles.heroStatValue}>
                                <DurationToFormatted
                                    duration={liveRun.bestPossible}
                                />
                            </span>
                        </div>
                    </div>
                    <div className={styles.heroTimerArea}>
                        <LiveSplitTimerComponent
                            liveRun={activeLiveRun}
                            dark={dark}
                            withDiff={false}
                            timerClassName={styles.heroTimer}
                            className={null}
                        />
                    </div>
                </div>
                {activeLiveRun.splits && activeLiveRun.splits.length > 0 && (
                    <div className={styles.heroTimelineWrapper}>
                        <SplitTimeline
                            segments={segments}
                            currentSplitIndex={activeLiveRun.currentSplitIndex}
                        />
                        <div className={styles.heroProgressMeta}>
                            <span>
                                {activeLiveRun.currentSplitName || 'Done'}
                            </span>
                            <span>
                                {activeLiveRun.currentSplitIndex}/
                                {activeLiveRun.splits.length} splits
                            </span>
                        </div>
                    </div>
                )}

                {/* Main content panels */}
                <Row className="g-3 mt-0">
                    <Col xl={3} lg={5} md={12} className="overflow-hidden">
                        <SplitsViewer
                            activeLiveRun={activeLiveRun}
                            currentSplitSplitStatus={currentSplitSplitStatus}
                            dark={dark}
                            setSelectedSplit={(e) => {
                                setSelectedSplit(e);
                                setManuallyChangedSplit(
                                    e !== activeLiveRun.currentSplitIndex,
                                );
                            }}
                        />
                    </Col>
                    <Col xl={5} lg={7} md={12}>
                        <div className={styles.heroStreamPanel}>
                            <TwitchEmbed
                                channel={
                                    stream
                                        ? stream
                                        : activeLiveRun.login &&
                                            activeLiveRun.login.toLowerCase() !==
                                                activeLiveRun.user.toLowerCase()
                                          ? activeLiveRun.login
                                          : activeLiveRun.user
                                }
                                width="100%"
                                height="100%"
                                muted
                                withChat={false}
                            />
                        </div>
                    </Col>
                    <Col xl={4}>
                        <div
                            className={styles.heroStatsPanel}
                            style={
                                recommendedStyles.gradient
                                    ? {
                                          borderImageSource:
                                              recommendedStyles.gradient,
                                          borderImageSlice: 1,
                                          borderWidth: '2px',
                                      }
                                    : {
                                          borderColor:
                                              recommendedStyles.borderColor ||
                                              undefined,
                                          borderWidth:
                                              recommendedStyles.gradient ||
                                              recommendedStyles.borderColor
                                                  ? '2px'
                                                  : undefined,
                                      }
                            }
                        >
                            <LiverunStatsPanel
                                liveRun={liveRun}
                                selectedSplit={selectedSplit}
                            />
                        </div>
                    </Col>
                </Row>
            </div>
        </Col>
    );
};

const SPLIT_KIND = {
    PERSONAL_BEST: 'Personal Best',
    BEST_SEGMENTS: 'Best Segments',
};

export const getSplitStatus = (liveRun: LiveRun, k: number): SplitStatus => {
    if (k < 0 || !liveRun.splits || !liveRun.splits[k]) return null;

    const split = liveRun.splits[k];
    const time = split.splitTime;

    let singleTime = null;
    if (k == 0) {
        singleTime = time;
    } else if (liveRun.splits[k - 1].splitTime) {
        singleTime = time - liveRun.splits[k - 1].splitTime;
    }

    const status: Status =
        liveRun.currentSplitIndex < k
            ? 'future'
            : liveRun.currentSplitIndex == k
              ? 'current'
              : time
                ? 'completed'
                : 'skipped';
    const name = split.name.toString();
    const isSubSplit = name ? name.startsWith('-') : false;
    const isActive = status == 'current';

    const newComparisons: { [key: string]: Split } = {};

    Object.entries(split.comparisons).forEach(([splitName, value]) => {
        let splitSingleTime = null;

        if (k == 0) {
            splitSingleTime = value;
        } else if (liveRun.splits[k - 1].comparisons[splitName]) {
            splitSingleTime =
                value - liveRun.splits[k - 1].comparisons[splitName];
        }

        const totalTime = value;

        newComparisons[splitName] = {
            splitName,
            splitSingleTime,
            totalTime,
        };
    });

    const isGold =
        status == 'completed' &&
        newComparisons[SPLIT_KIND.BEST_SEGMENTS] &&
        (k == 0 || liveRun.splits[k - 1].splitTime) &&
        newComparisons[SPLIT_KIND.BEST_SEGMENTS].singleTime &&
        singleTime < newComparisons[SPLIT_KIND.BEST_SEGMENTS].singleTime;

    let possibleTimeSave = null;

    if (
        newComparisons[SPLIT_KIND.PERSONAL_BEST]?.singleTime &&
        newComparisons[SPLIT_KIND.BEST_SEGMENTS]?.singleTime
    ) {
        possibleTimeSave =
            newComparisons[SPLIT_KIND.PERSONAL_BEST].singleTime -
            newComparisons[SPLIT_KIND.BEST_SEGMENTS].singleTime;
    }

    return {
        time,
        singleTime,
        status,
        name,
        isSubSplit,
        isActive,
        isGold,
        possibleTimeSave,
        comparisons: newComparisons,
    };
};
