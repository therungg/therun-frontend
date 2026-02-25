'use client';

import { FaArrowRight } from 'react-icons/fa6';
import { useRaces } from '~app/(old-layout)/races/hooks/use-race';
import { Race } from '~app/(old-layout)/races/races.types';
import { RaceCard } from './race-card';
import { RaceRow } from './race-row';
import styles from './races-section.module.scss';

const MAX_CARDS = 3;
const MAX_COMPACT = 3;

interface RacesSectionClientProps {
    initialActiveRaces: Race[];
    initialFinishedRaces: Race[];
    hasSession: boolean;
}

export const RacesSectionClient = ({
    initialActiveRaces,
    initialFinishedRaces,
    hasSession,
}: RacesSectionClientProps) => {
    const races = useRaces(initialActiveRaces);

    const allLive = races.filter(
        (race) => race.status === 'progress' || race.status === 'starting',
    );
    const allPending = races.filter(
        (race) => race.participantCount > 0 && race.status === 'pending',
    );

    // Allocate slots: guarantee at least 1 pending if any exist
    let liveSlots: number;
    let pendingSlots: number;

    if (allLive.length > 0 && allPending.length > 0) {
        liveSlots = Math.min(allLive.length, MAX_CARDS - 1);
        pendingSlots = Math.min(allPending.length, MAX_CARDS - liveSlots);
    } else if (allPending.length === 0) {
        liveSlots = Math.min(allLive.length, MAX_CARDS);
        pendingSlots = 0;
    } else {
        liveSlots = 0;
        pendingSlots = Math.min(allPending.length, MAX_CARDS);
    }

    const liveRaces = allLive.slice(0, liveSlots);
    const pendingRaces = allPending.slice(0, pendingSlots);
    const extraLive = allLive.length - liveRaces.length;
    const extraPending = allPending.length - pendingRaces.length;

    // Combine newly-finished races (from websocket) with prefetched finished
    const newlyFinished = races.filter(
        (race) =>
            race.status === 'finished' &&
            !initialFinishedRaces.some((f) => f.raceId === race.raceId),
    );
    const finishedRaces = [...newlyFinished, ...initialFinishedRaces]
        .filter(
            (race) =>
                race.status === 'finished' &&
                race.results &&
                race.results.length > 0 &&
                (race.results[0].status === 'finished' ||
                    race.results[0].status === 'confirmed'),
        )
        .slice(0, MAX_COMPACT);

    const hasCards = liveRaces.length > 0 || pendingRaces.length > 0;
    const hasRaces = hasCards || finishedRaces.length > 0;
    const showHeaders = liveRaces.length > 0 && pendingRaces.length > 0;

    return (
        <>
            {!hasRaces && (
                <div className={styles.emptyState}>
                    No active races right now. Be the first to start one!
                </div>
            )}

            {liveRaces.length > 0 && (
                <div className={styles.cardList}>
                    {showHeaders && (
                        <div className={styles.groupHeader}>Live Now</div>
                    )}
                    {liveRaces.map((race) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            variant="live"
                        />
                    ))}
                    {extraLive > 0 && (
                        <a href="/races" className={styles.moreLink}>
                            +{extraLive} more live{' '}
                            {extraLive === 1 ? 'race' : 'races'}
                        </a>
                    )}
                </div>
            )}

            {pendingRaces.length > 0 && (
                <div className={styles.cardList}>
                    {showHeaders && (
                        <div className={styles.groupHeader}>Upcoming</div>
                    )}
                    {pendingRaces.map((race) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            variant="imminent"
                        />
                    ))}
                    {extraPending > 0 && (
                        <a href="/races" className={styles.moreLink}>
                            +{extraPending} more upcoming{' '}
                            {extraPending === 1 ? 'race' : 'races'}
                        </a>
                    )}
                </div>
            )}

            {hasSession && (
                <div className={styles.ctaContainer}>
                    <a href="/races/create" className={styles.startRaceButton}>
                        Start a Race <FaArrowRight size={12} />
                    </a>
                </div>
            )}

            {finishedRaces.length > 0 && (
                <div className={styles.group}>
                    {hasCards && (
                        <div className={styles.groupHeader}>
                            Recent Finished Races
                        </div>
                    )}
                    {finishedRaces.map((race) => (
                        <RaceRow key={race.raceId} race={race} />
                    ))}
                </div>
            )}
        </>
    );
};
