import { FaArrowRight } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { Race } from '~app/(old-layout)/races/races.types';
import { getSession } from '~src/actions/session.action';
import { getAllActiveRaces, getPaginatedFinishedRaces } from '~src/lib/races';
import { RaceCard } from './race-card';
import { RaceRow } from './race-row';
import styles from './races-section.module.scss';

const MAX_CARDS = 3;
const MAX_COMPACT = 3;
const IMMINENT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const IMMINENT_PARTICIPANT_THRESHOLD = 3;

function isImminent(race: Race): boolean {
    if (race.willStartAt) {
        const diff = new Date(race.willStartAt).getTime() - Date.now();
        if (diff > 0 && diff <= IMMINENT_THRESHOLD_MS) return true;
    }
    if (race.participantCount >= IMMINENT_PARTICIPANT_THRESHOLD) return true;
    return false;
}

export const RacesSection = async () => {
    const [races, session, prefetchedFinished] = await Promise.all([
        getAllActiveRaces(),
        getSession(),
        getPaginatedFinishedRaces(1, 6),
    ]);

    // Live: in-progress or starting
    const liveRaces = races
        .filter(
            (race) => race.status === 'progress' || race.status === 'starting',
        )
        .slice(0, MAX_CARDS);

    // Pending: split into imminent vs regular
    const pendingRaces = races.filter(
        (race) => race.participantCount > 0 && race.status === 'pending',
    );
    const imminentRaces = pendingRaces
        .filter(isImminent)
        .slice(0, MAX_CARDS - liveRaces.length);
    const regularPending = pendingRaces
        .filter((race) => !isImminent(race))
        .slice(0, MAX_COMPACT);

    // Finished: fill remaining compact slots
    const compactCount = regularPending.length;
    const fillCount = Math.max(0, MAX_COMPACT - compactCount);
    const finishedRaces = prefetchedFinished.items
        .filter(
            (race) =>
                race.status === 'finished' &&
                race.results &&
                race.results.length > 0 &&
                (race.results[0].status === 'finished' ||
                    race.results[0].status === 'confirmed'),
        )
        .slice(0, fillCount);

    const cardRaces = [...liveRaces, ...imminentRaces];
    const compactRaces = [...regularPending, ...finishedRaces];
    const hasRaces = cardRaces.length > 0 || compactRaces.length > 0;
    const liveCount = liveRaces.length;

    return (
        <Panel
            panelId="races"
            title="Races"
            subtitle={
                liveCount > 0 ? `${liveCount} Live Now` : 'Race against friends'
            }
            link={{ url: '/races', text: 'View All Races' }}
            className="p-0 overflow-hidden"
        >
            {!hasRaces && (
                <div className={styles.emptyState}>
                    No active races right now. Be the first to start one!
                </div>
            )}

            {cardRaces.map((race) => (
                <RaceCard
                    key={race.raceId}
                    race={race}
                    variant={
                        race.status === 'progress' || race.status === 'starting'
                            ? 'live'
                            : 'imminent'
                    }
                />
            ))}

            {compactRaces.length > 0 && (
                <div className={styles.group}>
                    {cardRaces.length > 0 && (
                        <div className={styles.groupHeader}>More Races</div>
                    )}
                    {compactRaces.map((race) => (
                        <RaceRow
                            key={race.raceId}
                            race={race}
                            className={
                                race.status === 'finished'
                                    ? styles.rowFinished
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}

            {session && (
                <div className={styles.ctaContainer}>
                    <a href="/races/create" className={styles.startRaceButton}>
                        Start a Race <FaArrowRight size={12} />
                    </a>
                </div>
            )}
        </Panel>
    );
};
