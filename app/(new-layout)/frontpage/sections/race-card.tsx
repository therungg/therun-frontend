'use client';

import { FaClock, FaSeedling, FaTrophy, FaUser } from 'react-icons/fa6';
import { RaceTimer } from '~app/(old-layout)/races/[race]/race-timer';
import { sortRaceParticipants } from '~app/(old-layout)/races/[race]/sort-race-participants';
import { useRace } from '~app/(old-layout)/races/hooks/use-race';
import { Race } from '~app/(old-layout)/races/races.types';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from './races-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface RaceCardProps {
    race: Race;
    variant: 'live' | 'imminent';
}

export const RaceCard = ({ race: initialRace, variant }: RaceCardProps) => {
    const { raceState } = useRace(initialRace, []);
    const race = raceState;

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
                <span className={badgeClassName}>
                    <span
                        className={isLive ? styles.liveDot : styles.imminentDot}
                    />
                    {isLive ? 'LIVE' : 'STARTING SOON'}
                    {!isLive && race.ranked && (
                        <>
                            {' · '}
                            <span className={styles.rankedBadge}>RANKED</span>
                        </>
                    )}
                </span>
                <div className={styles.cardBody}>
                    <div className={styles.cardLeft}>
                        <span className={styles.cardGame}>
                            {race.displayGame}
                        </span>
                        <span className={styles.cardCategory}>
                            {race.displayCategory}
                            {isLive && leader && !leaderFinished && (
                                <>
                                    {' · '} Leader: {leader.user}
                                </>
                            )}
                            {isLive && leader && leaderFinished && (
                                <>
                                    {' · '}
                                    <FaTrophy size={10} /> {leader.user}
                                </>
                            )}
                        </span>
                        {!isLive && topSeed && (
                            <span className={styles.cardSeed}>
                                <FaSeedling size={10} />
                                {' #1 Seed: '}
                                {topSeed.user}
                                {' · '}
                                <DurationToFormatted duration={topSeed.pb} />
                            </span>
                        )}
                    </div>
                    <div className={styles.cardRight}>
                        <div className={styles.cardTimer}>
                            <TimerSection race={race} variant={variant} />
                        </div>
                        <span className={styles.cardParticipants}>
                            {race.participantCount}
                            <FaUser size={11} />
                            {!isLive && race.participantCount > 0 && (
                                <span className={styles.cardSocialProof}>
                                    waiting
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </a>
    );
};

const TimerSection = ({
    race,
    variant,
}: {
    race: Race;
    variant: 'live' | 'imminent';
}) => {
    if (variant === 'live') {
        return <RaceTimer race={race} />;
    }

    if (race.startMethod === 'everyone-ready') {
        return (
            <span className={styles.cardReadyCount}>
                {race.readyParticipantCount}/{race.participantCount} Ready
            </span>
        );
    }

    if (race.willStartAt) {
        const minutesUntilStart = Math.max(
            0,
            Math.ceil(
                (new Date(race.willStartAt).getTime() - Date.now()) / 60000,
            ),
        );
        return (
            <span suppressHydrationWarning>
                Starts in {minutesUntilStart} min
            </span>
        );
    }

    return (
        <span className={styles.cardWaiting}>
            <FaClock size={12} /> Waiting for players...
        </span>
    );
};
