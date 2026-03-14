import clsx from 'clsx';
import NextImage from 'next/image';
import React, { useEffect, useState } from 'react';
import { Col, Image, Row } from 'react-bootstrap';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { Count } from '~app/(new-layout)/games/[game]/game.types';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { LiveSplitTimerComponent } from '~app/(new-layout)/live/live-split-timer.component';
import { CombinedLeaderboardStat } from '~app/(new-layout)/tournaments/[tournament]/get-combined-tournament-leaderboard.component';
import { GameImage } from '~src/components/image/gameimage';
import { getColorMode } from '~src/utils/colormode';
import styles from '../css/LiveRun.module.scss';
import { UserLink } from '../links/links';
import patreonStyles from '../patreon/patreon-styles';
import { usePatreons } from '../patreon/use-patreons';
import { DurationToFormatted } from '../util/datetime';
import {
    getSplitSegments,
    type SplitStatus,
    useSplitFlash,
} from './split-utils';

const SplitTimeline = ({
    segments,
    currentSplitIndex,
}: {
    segments: SplitStatus[];
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

export const LiveUserRun = ({
    liveRun,
    currentlyActive,
    showGameCategory = true,
    leaderboard = null,
    isUrl = false,
    seedingTable = [],
}: {
    liveRun: LiveRun;
    currentlyActive?: string;
    showGameCategory?: boolean;
    leaderboard?: Count[] | null;
    isUrl?: boolean;
    seedingTable?: CombinedLeaderboardStat[];
}) => {
    const [dark, setDark] = useState(true);
    const [liveUserStyles, setLiveUserStyles] = useState<{
        borderColor: string;
        gradient: string;
    }>({ borderColor: '', gradient: '' });
    const { data: patreons, isLoading } = usePatreons();
    const segments = getSplitSegments(liveRun);
    const flash = useSplitFlash(liveRun);

    useEffect(function () {
        setDark(getColorMode() !== 'light');
    }, []);

    useEffect(() => {
        if (!isLoading && patreons && patreons[liveRun.user]) {
            const patreonData = patreons[liveRun.user];
            let borderColor = '';
            let gradient = '';

            if (!patreonData.preferences || !patreonData.preferences.hide) {
                const colors = patreonStyles();
                const color = patreonData.preferences?.colorPreference ?? 0;

                const style =
                    colors.find((val) => val.id === color) ?? colors[0];
                const [darkStyle, lightStyle] = style.style;
                borderColor = dark ? darkStyle.color : lightStyle.color;
                gradient = dark
                    ? darkStyle.backgroundImage
                    : lightStyle.backgroundImage;
            } else {
                // TODO: Get rid of this.
                borderColor = 'var(--bs-link-color)';
            }
            setLiveUserStyles({ borderColor, gradient });
        }
    }, [patreons, isLoading, liveRun.user]);

    let tournamentPb = null;
    let ranking = null;
    let seed = null;

    if (leaderboard) {
        const pbLeaderboardIndex = leaderboard.findIndex(
            (count) => count.username == liveRun.user,
        );

        if (pbLeaderboardIndex > -1) {
            ranking = pbLeaderboardIndex + 1;
            tournamentPb = leaderboard[pbLeaderboardIndex].stat;
        }
    }

    if (seedingTable) {
        const userSeed = seedingTable.findIndex(
            (val) => val.username === liveRun.user,
        );

        if (userSeed > -1) seed = userSeed + 1;
    }

    const hasGameImage =
        liveRun.gameImage &&
        liveRun.gameImage.length > 0 &&
        liveRun.gameImage !== 'noimage';

    const hasAvatar = liveRun.picture && liveRun.picture !== 'noimage';

    return (
        <div
            className={clsx(
                'card',
                styles.liveRunContainer,
                liveRun.user === currentlyActive && styles.liveRunActive,
                flash === 'gold' && styles.liveRunGold,
                flash === 'ahead' && styles.liveRunGreen,
                flash === 'behind' && styles.liveRunRed,
            )}
            style={
                liveUserStyles.gradient
                    ? {
                          borderImageSource: liveUserStyles.gradient,
                          borderImageSlice: 1,
                          borderWidth: '2px',
                      }
                    : {
                          borderColor: liveUserStyles.borderColor || undefined,
                          borderWidth:
                              liveUserStyles.gradient ||
                              liveUserStyles.borderColor
                                  ? '2px'
                                  : undefined,
                      }
            }
        >
            <div className="d-flex flex-fill">
                {hasGameImage && (
                    <div className={styles.liveRunArt}>
                        <GameImage
                            alt={liveRun.game}
                            src={liveRun.gameImage!}
                            quality="small"
                            height={108}
                            width={81}
                            className={styles.liveRunArtImage}
                        />
                    </div>
                )}
                {!hasGameImage && (
                    <div className={styles.liveRunArt}>
                        <Image
                            alt="Logo"
                            src={
                                dark
                                    ? '/logo_dark_theme_no_text_transparent.png'
                                    : '/logo_light_theme_no_text_transparent.png'
                            }
                            width="60px"
                            height="60px"
                            className="m-auto"
                        />
                    </div>
                )}

                <div className={styles.liveRunContent}>
                    <Row className="flex-1 w-100 justify-content-between align-items-start g-0">
                        <Col xs={7} className="ps-1">
                            <div className="d-flex align-items-center gap-1">
                                {hasAvatar && (
                                    <div className={styles.liveRunAvatar}>
                                        <NextImage
                                            src={liveRun.picture!}
                                            alt=""
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            className={styles.liveRunAvatarImg}
                                        />
                                    </div>
                                )}
                                {ranking && !seed && (
                                    <span>#{ranking}&nbsp;-&nbsp;</span>
                                )}
                                {seed && <span>#{seed}&nbsp;-&nbsp;</span>}
                                <UserLink
                                    username={liveRun.user}
                                    parentIsUrl={isUrl}
                                    icon={false}
                                />
                                {liveRun.currentlyStreaming && (
                                    <TwitchIcon
                                        height={18}
                                        color="#6441a5"
                                        className="ms-1 flex-shrink-0"
                                        title="Live on Twitch"
                                    />
                                )}
                            </div>
                            {showGameCategory && (
                                <div className="text-truncate fs-large">
                                    {liveRun.game}
                                </div>
                            )}
                            {showGameCategory && (
                                <div className={styles.liveRunCategory}>
                                    {liveRun.category}
                                </div>
                            )}

                            {!showGameCategory && tournamentPb && (
                                <div className="text-truncate">
                                    Tournament PB -{' '}
                                    {!!tournamentPb && (
                                        <DurationToFormatted
                                            duration={tournamentPb}
                                        />
                                    )}
                                </div>
                            )}

                            {!showGameCategory &&
                                liveRun.pb &&
                                Math.trunc(liveRun.pb) !==
                                    Math.trunc(Number(tournamentPb)) && (
                                    <div className="text-truncate">
                                        Personal Best -{' '}
                                        <DurationToFormatted
                                            duration={liveRun.pb}
                                        />
                                    </div>
                                )}
                        </Col>
                        <Col
                            xs={5}
                            className="d-flex justify-content-end align-items-center"
                        >
                            <LiveSplitTimerComponent
                                liveRun={liveRun}
                                dark={dark}
                            />
                        </Col>
                    </Row>

                    {liveRun.splits && liveRun.splits.length > 0 && (
                        <SplitTimeline
                            segments={segments}
                            currentSplitIndex={liveRun.currentSplitIndex}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export const LiveIcon = ({ height = 16, dark = false }) => {
    return (
        <Image
            alt="Live Icon"
            src={!dark ? '/LiveTR-light.png' : '/LiveTR-dark.png'}
            height={height}
        />
    );
};

export const Flag = ({ className = '', height = 16, dark = false }) => {
    return (
        <Image
            alt="Flag"
            src={
                !dark
                    ? '/Flag finish greenTR-darktransparant.png'
                    : '/Flag finish greenTR-lighttransparant(1).png'
            }
            height={height}
            className={`mt-2 ${className}`}
        />
    );
};
