'use client';

import Image from 'next/image';
import { FaClock, FaTrophy, FaUser } from 'react-icons/fa6';
import { RaceTimer } from '~app/(old-layout)/races/[race]/race-timer';
import { sortRaceParticipants } from '~app/(old-layout)/races/[race]/sort-race-participants';
import { useRace } from '~app/(old-layout)/races/hooks/use-race';
import { Race } from '~app/(old-layout)/races/races.types';
import {
    DurationToFormatted,
    LocalizedTime,
} from '~src/components/util/datetime';
import styles from './races-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface RaceRowProps {
    race: Race;
    className?: string;
}

export const RaceRow = ({ race: initialRace, className }: RaceRowProps) => {
    const { raceState } = useRace(initialRace, []);
    const race = raceState;

    const imageUrl =
        race.gameImage && race.gameImage !== 'noimage'
            ? race.gameImage
            : FALLBACK_IMAGE;

    const isLive = race.status === 'progress';
    const isStarting = race.status === 'starting';
    const isPending = race.status === 'pending';
    const isFinished = race.status === 'finished';

    const sortedParticipants = sortRaceParticipants(race);
    const leader = sortedParticipants[0];
    const leaderFinished =
        leader?.status === 'finished' || leader?.status === 'confirmed';

    const hasResults =
        isFinished &&
        race.results &&
        race.results.length > 0 &&
        (race.results[0].status === 'finished' ||
            race.results[0].status === 'confirmed');

    const winnerName = hasResults ? race.results![0].name : leader?.user;
    const winnerTime = hasResults
        ? race.results![0].finalTime
        : leaderFinished
          ? leader?.finalTime
          : null;

    return (
        <a
            href={`/races/${race.raceId}`}
            className={`${styles.raceRow} ${className ?? ''}`}
        >
            <Image
                src={imageUrl}
                alt={race.displayGame}
                width={30}
                height={40}
                className={styles.gameArt}
                unoptimized
            />
            <div className={styles.raceInfo}>
                <span className={styles.gameName}>{race.displayGame}</span>
                <span className={styles.subtitle}>
                    {race.displayCategory}
                    {isPending && (
                        <>
                            {' \u00b7 '}
                            <span className={styles.creator}>
                                by {race.creator}
                            </span>
                        </>
                    )}
                    {!isPending && winnerName && (
                        <>
                            {' \u00b7 '}
                            <span className={styles.winner}>
                                {winnerName}{' '}
                                {(hasResults || leaderFinished) && (
                                    <FaTrophy size={9} />
                                )}
                            </span>
                        </>
                    )}
                </span>
            </div>
            <div className={styles.raceRight}>
                {isLive && (
                    <>
                        <span className={styles.liveTimer}>
                            <RaceTimer race={race} />
                        </span>
                        <span className={styles.liveDot} />
                    </>
                )}
                {isStarting && (
                    <>
                        <span className={styles.pendingText}>Starting...</span>
                        <span className={styles.liveDot} />
                    </>
                )}
                {isPending && (
                    <span className={styles.pendingText}>
                        <FaClock size={9} />
                        {race.startMethod === 'datetime' && race.willStartAt ? (
                            <LocalizedTime
                                date={new Date(race.willStartAt)}
                                options={{
                                    year: undefined,
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }}
                            />
                        ) : (
                            'Waiting...'
                        )}
                    </span>
                )}
                {isFinished && winnerTime && (
                    <span className={styles.time}>
                        <DurationToFormatted duration={winnerTime.toString()} />
                    </span>
                )}
                <span className={styles.participants}>
                    {isPending &&
                        race.startMethod === 'everyone-ready' &&
                        `${race.readyParticipantCount}/`}
                    {race.participantCount}
                    <FaUser size={9} />
                </span>
            </div>
        </a>
    );
};
