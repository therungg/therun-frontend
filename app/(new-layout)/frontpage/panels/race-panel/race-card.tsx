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
    props.className = className;

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
        <div>
            <a href={'/races/' + race.raceId} className={className}>
                <CardWithImage
                    key={race.raceId}
                    imageUrl={race.gameImage}
                    imageAlt={race.game}
                    {...props}
                >
                    <div className="d-flex justify-content-between">
                        <div className="fs-larger fw-bold">
                            {race.displayGame}
                        </div>
                        <span>
                            {race.status === 'pending' &&
                                race.startMethod === 'everyone-ready' &&
                                race.readyParticipantCount.toString() + '/'}
                            {race.participantCount}{' '}
                            <FaUser
                                size={14}
                                className="mb-1 ms-1 text-highlight"
                            />
                        </span>
                    </div>
                    <div className="d-flex justify-content-between">
                        <div className={styles.category}>
                            {race.displayCategory}
                        </div>
                        {firstPlace && (
                            <span className={styles.result}>
                                {firstPlace.user}{' '}
                                {firstPlaceFinished ? (
                                    <span className="font-monospace">
                                        {'- '}
                                        <DurationToFormatted
                                            duration={
                                                firstPlace.finalTime?.toString() as string
                                            }
                                        />{' '}
                                        <FaTrophy
                                            size={14}
                                            className="mb-1 ms-1 text-gold"
                                        />
                                    </span>
                                ) : (
                                    <FaRocket
                                        size={14}
                                        className="ms-1 text-gold"
                                    />
                                )}
                            </span>
                        )}
                        {raceWasCompleted && (
                            <span className={styles.result}>
                                {race.results![0].name}{' '}
                                <FaTrophy
                                    size={14}
                                    className="ms-1 text-gold"
                                />
                            </span>
                        )}
                    </div>
                    {race.startTime && (
                        <div className="d-flex justify-content-between mt-1">
                            <div></div>
                            <span className={styles.result}>
                                <FromNow time={new Date(race.startTime)} />
                                <FaClock size={12} className="ms-2" />
                            </span>
                        </div>
                    )}
                    {race.status === 'progress' && (
                        <div className="d-flex justify-content-center d-flex position-relative">
                            <div
                                className={clsx(
                                    'px-2 rounded-2 position-absolute bottom-0 start-50 translate-middle-x',
                                    styles.timerContainer,
                                )}
                                style={{ marginBottom: '-1rem' }}
                            >
                                <span className={styles.timer}>
                                    <div className="d-flex justify-content-center">
                                        <RaceTimer race={race} />
                                        <div className="ms-2 d-flex justify-content-start mt-2">
                                            <PingAnimation />
                                        </div>
                                    </div>
                                </span>
                            </div>
                        </div>
                    )}
                    {race.status === 'pending' && (
                        <div className="mt-2 d-flex justify-content-center text-muted d-flex">
                            {race.startMethod === 'everyone-ready' && (
                                <span>Waiting for ready up...</span>
                            )}
                            {race.startMethod === 'moderator' && (
                                <span>Waiting for moderator to start...</span>
                            )}
                            {race.startMethod === 'datetime' && (
                                <span>
                                    Starts on{' '}
                                    <LocalizedTime
                                        date={
                                            new Date(race.willStartAt as string)
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
                        </div>
                    )}
                    {raceWasCompleted && (
                        <div className="d-flex justify-content-center d-flex position-relative">
                            <div
                                className={clsx(
                                    'px-2 rounded-2 position-absolute bottom-0 start-50 translate-middle-x',
                                    styles.timerContainer,
                                )}
                                style={{ marginBottom: '-1rem' }}
                            >
                                <span
                                    className={clsx(styles.timer, 'fst-italic')}
                                >
                                    <DurationToFormatted
                                        duration={
                                            race.results![0].finalTime?.toString() as string
                                        }
                                    />
                                </span>
                            </div>
                        </div>
                    )}
                </CardWithImage>
            </a>
        </div>
    );
};
