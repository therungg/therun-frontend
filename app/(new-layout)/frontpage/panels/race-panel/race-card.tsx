'use client';

import clsx from 'clsx';
import { FC, HTMLAttributes, PropsWithChildren } from 'react';
import { FaClock, FaRocket, FaTrophy, FaUser } from 'react-icons/fa6';
import { CardWithImage } from '~app/(new-layout)/components/card-with-image.component';
import { PingAnimation } from '~app/(new-layout)/components/ping-animation.component';
import { RaceTimer } from '~app/(old-layout)/races/[race]/race-timer';
import { sortRaceParticipants } from '~app/(old-layout)/races/[race]/sort-race-participants';
import { useRace } from '~app/(old-layout)/races/hooks/use-race';
import { Race } from '~app/(old-layout)/races/races.types';
import {
    DurationToFormatted,
    FromNow,
    LocalizedTime,
} from '~src/components/util/datetime';
import styles from './race-panel.module.scss';

interface RaceCardProps extends HTMLAttributes<HTMLDivElement> {
    race: Race;
}

export const RaceCard: FC<PropsWithChildren<RaceCardProps>> = ({
    race,
    ...props
}) => {
    const { raceState } = useRace(race, []);

    race = raceState;

    const className = clsx(props.className, styles.link);

    const firstPlace = sortRaceParticipants(race)[0];
    const firstPlaceFinished =
        firstPlace?.status === 'finished' || firstPlace?.status === 'confirmed';

    const raceWasCompleted =
        race.status === 'finished' &&
        race.results &&
        race.results.length > 0 &&
        (race.results[0].status === 'finished' ||
            race.results[0].status === 'confirmed');

    return (
        <a href={'/races/' + race.raceId} className={className}>
            <CardWithImage
                key={race.raceId}
                imageUrl={race.gameImage}
                imageAlt={race.game}
                imageWidth={70}
                imageHeight={90}
            >
                <div className={styles.raceContent}>
                    {/* Row 1: Game + Participants */}
                    <div className={styles.topRow}>
                        <div className={styles.gameName}>
                            {race.displayGame}
                        </div>
                        <div className={styles.participantBadge}>
                            {race.status === 'pending' &&
                                race.startMethod === 'everyone-ready' &&
                                race.readyParticipantCount.toString() + '/'}
                            {race.participantCount}
                            <FaUser size={10} className="ms-1" />
                        </div>
                    </div>

                    {/* Row 2: Category + Winner */}
                    <div className={styles.middleRow}>
                        <div className={styles.categoryBadge}>
                            {race.displayCategory}
                        </div>
                        {race.status === 'pending' && (
                            <span className={styles.creatorText}>
                                by {race.creator}
                            </span>
                        )}
                        {race.status !== 'pending' && firstPlace && (
                            <div className={styles.winnerInfo}>
                                <span className={styles.winnerName}>
                                    {firstPlace.user}
                                </span>
                                {firstPlaceFinished ? (
                                    <FaTrophy size={10} />
                                ) : (
                                    <FaRocket size={10} />
                                )}
                            </div>
                        )}
                        {raceWasCompleted && (
                            <div className={styles.winnerInfo}>
                                <span className={styles.winnerName}>
                                    {race.results![0].name}
                                </span>
                                <FaTrophy size={10} />
                            </div>
                        )}
                    </div>

                    {/* Row 3: [spacer] Time badge (center) Timestamp (right) */}
                    <div className={styles.bottomRow}>
                        <div />
                        <div>
                            {firstPlaceFinished && firstPlace && (
                                <div className={styles.timeBadge}>
                                    <DurationToFormatted
                                        duration={
                                            firstPlace.finalTime?.toString() as string
                                        }
                                    />
                                </div>
                            )}
                            {raceWasCompleted && (
                                <div className={styles.timeBadge}>
                                    <DurationToFormatted
                                        duration={
                                            race.results![0].finalTime?.toString() as string
                                        }
                                    />
                                </div>
                            )}
                            {race.status === 'pending' && (
                                <span className={styles.pendingStatus}>
                                    {race.startMethod === 'everyone-ready' && (
                                        <span>
                                            <FaClock
                                                size={10}
                                                className="me-1"
                                            />
                                            Waiting for ready up...
                                        </span>
                                    )}
                                    {race.startMethod === 'moderator' && (
                                        <span>
                                            <FaClock
                                                size={10}
                                                className="me-1"
                                            />
                                            Waiting for moderator...
                                        </span>
                                    )}
                                    {race.startMethod === 'datetime' && (
                                        <span>
                                            <FaClock
                                                size={10}
                                                className="me-1"
                                            />
                                            Starts{' '}
                                            <LocalizedTime
                                                date={
                                                    new Date(
                                                        race.willStartAt as string,
                                                    )
                                                }
                                                options={{
                                                    year: undefined,
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                }}
                                            />
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                        <span className={styles.timestampInline}>
                            {race.startTime && (
                                <FromNow time={new Date(race.startTime)} />
                            )}
                        </span>
                    </div>
                </div>
                {race.status === 'progress' && (
                    <div className="d-flex justify-content-center d-flex position-relative">
                        <div
                            className={clsx(
                                'px-2 rounded-2 position-absolute bottom-0 start-50 translate-middle-x',
                                styles.timerContainer,
                            )}
                            style={{ marginBottom: '-0.6rem' }}
                        >
                            <span className={styles.timer}>
                                <div className="d-flex justify-content-center align-items-center">
                                    <RaceTimer race={race} />
                                    <div className="ms-2 d-flex justify-content-start">
                                        <PingAnimation />
                                    </div>
                                </div>
                            </span>
                        </div>
                    </div>
                )}
            </CardWithImage>
        </a>
    );
};
