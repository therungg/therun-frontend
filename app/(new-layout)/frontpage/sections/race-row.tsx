'use client';

import Image from 'next/image';
import { FaTrophy, FaUser } from 'react-icons/fa6';
import { Race } from '~app/(old-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from './races-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface RaceRowProps {
    race: Race;
    className?: string;
}

export const RaceRow = ({ race, className }: RaceRowProps) => {
    const imageUrl =
        race.gameImage && race.gameImage !== 'noimage'
            ? race.gameImage
            : FALLBACK_IMAGE;

    const hasResults =
        race.status === 'finished' &&
        race.results &&
        race.results.length > 0 &&
        (race.results[0].status === 'finished' ||
            race.results[0].status === 'confirmed');

    const winnerName = hasResults ? race.results![0].name : null;
    const winnerTime = hasResults ? race.results![0].finalTime : null;

    return (
        <a
            href={`/races/${race.raceId}`}
            className={`${styles.raceRow} ${className ?? ''}`}
        >
            <Image
                src={imageUrl}
                alt={race.displayGame}
                width={36}
                height={48}
                className={styles.raceArt}
                unoptimized
            />
            <div className={styles.raceInfo}>
                <span className={styles.raceName}>{race.displayGame}</span>
                <span className={styles.raceSub}>
                    {race.displayCategory}
                    {winnerName && (
                        <>
                            {' · '}
                            <span className={styles.raceWinner}>
                                <FaTrophy size={9} aria-hidden="true" />{' '}
                                <UserLink username={winnerName} parentIsUrl />
                            </span>
                        </>
                    )}
                </span>
            </div>
            <div className={styles.raceRight}>
                <span className={styles.raceTimeRow}>
                    {winnerTime && (
                        <span className={styles.raceTime}>
                            <DurationToFormatted
                                duration={winnerTime.toString()}
                            />
                        </span>
                    )}
                    <span className={styles.raceEntrants}>
                        {race.participantCount}
                        <FaUser size={9} aria-hidden="true" />
                        <span className="visually-hidden"> participants</span>
                    </span>
                </span>
            </div>
        </a>
    );
};
