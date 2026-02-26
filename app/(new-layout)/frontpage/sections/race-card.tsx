'use client';

import { FaTrophy, FaUser } from 'react-icons/fa6';
import { RaceTimer } from '~app/(old-layout)/races/[race]/race-timer';
import { sortRaceParticipants } from '~app/(old-layout)/races/[race]/sort-race-participants';
import { Race } from '~app/(old-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import {
    DurationToFormatted,
    LocalizedTime,
} from '~src/components/util/datetime';
import styles from './races-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface RaceCardProps {
    race: Race;
    variant: 'live' | 'imminent';
}

export const RaceCard = ({ race, variant }: RaceCardProps) => {
    const imageUrl =
        race.gameImage && race.gameImage !== 'noimage'
            ? race.gameImage
            : FALLBACK_IMAGE;

    const isLive = variant === 'live';

    const sortedParticipants = sortRaceParticipants(race);
    const leader = sortedParticipants[0];
    const leaderFinished =
        leader?.status === 'finished' || leader?.status === 'confirmed';

    const topSeed = race.participants
        ?.filter((p) => p.pb && Number.parseInt(p.pb) > 0)
        .sort((a, b) => Number.parseInt(a.pb) - Number.parseInt(b.pb))[0];

    const cardClassName = [
        styles.card,
        isLive ? styles.cardLive : styles.cardImminent,
    ]
        .filter(Boolean)
        .join(' ');

    const badgeClassName = [
        styles.cardBadge,
        isLive ? styles.cardBadgeLive : styles.cardBadgeImminent,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <a href={`/races/${race.raceId}`} className={cardClassName}>
            <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className={styles.cardBg}
            />
            <div className={styles.cardOverlay} />
            <div className={styles.cardContent}>
                <div className={styles.cardCenter}>
                    <div className={styles.cardTitleRow}>
                        <span className={styles.cardGame}>
                            {race.displayGame}
                        </span>
                        <span className={badgeClassName}>
                            {isLive ? (
                                <>
                                    <span className={styles.liveDot} />
                                    LIVE
                                </>
                            ) : (
                                <>
                                    <span className={styles.imminentDot} />
                                    OPEN LOBBY
                                </>
                            )}
                            {race.ranked && (
                                <>
                                    {' · '}
                                    <span className={styles.rankedBadge}>
                                        RANKED
                                    </span>
                                </>
                            )}
                            {' · '}
                            {race.participantCount}
                            <FaUser size={9} aria-hidden="true" />
                            <span className="visually-hidden">
                                {' '}
                                participants
                            </span>
                        </span>
                    </div>
                    <span className={styles.cardCategory}>
                        {race.displayCategory}
                    </span>
                </div>
                <div className={styles.cardFooter}>
                    {isLive ? (
                        <div className={styles.cardFooterLive}>
                            <div className={styles.cardTimer}>
                                <RaceTimer race={race} />
                            </div>
                            <div className={styles.cardFooterStats}>
                                {leader && (
                                    <div className={styles.cardStat}>
                                        <span className={styles.cardStatLabel}>
                                            {leaderFinished
                                                ? 'Winner'
                                                : 'Leader'}
                                        </span>
                                        <span className={styles.cardStatValue}>
                                            {leaderFinished && (
                                                <FaTrophy
                                                    size={9}
                                                    aria-hidden="true"
                                                />
                                            )}{' '}
                                            <UserLink
                                                username={leader.user}
                                                parentIsUrl
                                            />
                                        </span>
                                    </div>
                                )}
                                {race.participants && (
                                    <RaceProgress
                                        participants={race.participants}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.cardFooterStats}>
                            <div className={styles.cardStat}>
                                <span className={styles.cardStatLabel}>
                                    Hosted by
                                </span>
                                <span className={styles.cardStatValue}>
                                    <UserLink
                                        username={race.creator}
                                        parentIsUrl
                                    />
                                </span>
                            </div>
                            {topSeed && (
                                <div className={styles.cardStat}>
                                    <span className={styles.cardStatLabel}>
                                        Top Seed
                                    </span>
                                    <span className={styles.cardStatValue}>
                                        <UserLink
                                            username={topSeed.user}
                                            parentIsUrl
                                        />
                                        {' · '}
                                        <DurationToFormatted
                                            duration={topSeed.pb}
                                        />{' '}
                                        PB
                                    </span>
                                </div>
                            )}
                            <div className={styles.cardStat}>
                                <span className={styles.cardStatLabel}>
                                    Starts
                                </span>
                                <LobbyStatus race={race} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
};

const RaceProgress = ({
    participants,
}: {
    participants: Race['participants'];
}) => {
    if (!participants || participants.length === 0) return null;

    const finished = participants.filter(
        (p) => p.status === 'finished' || p.status === 'confirmed',
    ).length;
    const racing = participants.filter(
        (p) => p.status === 'ready' || p.status === 'started',
    ).length;
    const abandoned = participants.filter(
        (p) => p.status === 'abandoned',
    ).length;

    const parts: string[] = [];
    if (racing > 0) parts.push(`${racing} Racing`);
    if (finished > 0) parts.push(`${finished} Done`);
    if (abandoned > 0) parts.push(`${abandoned} DNF`);

    return (
        <div className={styles.cardStat}>
            <span className={styles.cardStatLabel}>Field</span>
            <span className={styles.cardStatValue}>{parts.join(' · ')}</span>
        </div>
    );
};

const LobbyStatus = ({ race }: { race: Race }) => {
    if (race.startMethod === 'everyone-ready') {
        return <span className={styles.lobbyStart}>When all ready</span>;
    }

    if (race.startMethod === 'datetime' && race.willStartAt) {
        const startDate = new Date(race.willStartAt);
        const minutesUntilStart = Math.max(
            0,
            Math.ceil((startDate.getTime() - Date.now()) / 60000),
        );

        if (minutesUntilStart >= 720) {
            return (
                <LocalizedTime
                    date={startDate}
                    options={{
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }}
                />
            );
        }

        const label =
            minutesUntilStart < 60
                ? `In ${minutesUntilStart} min`
                : `In ${Math.floor(minutesUntilStart / 60)}h ${minutesUntilStart % 60}m`;
        return (
            <span className={styles.lobbyStart} suppressHydrationWarning>
                {label}
            </span>
        );
    }

    if (race.startMethod === 'moderator') {
        return (
            <span className={styles.lobbyStart}>When mod presses start</span>
        );
    }

    return <span className={styles.lobbyStart}>Waiting for players</span>;
};
