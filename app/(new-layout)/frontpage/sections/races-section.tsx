import { FaArrowRight } from 'react-icons/fa6';
import { Badge } from '~app/(new-layout)/components/badge.component';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { Race } from '~app/(old-layout)/races/races.types';
import { getSession } from '~src/actions/session.action';
import { getAllActiveRaces, getPaginatedFinishedRaces } from '~src/lib/races';
import { RaceCard } from '../panels/race-panel/race-card';
import styles from './races-section.module.scss';

const MAX_PER_GROUP = 3;
const FRONTPAGE_RACE_COUNT = 4;

export const RacesSection = async () => {
    const [races, session, prefetchedFinished] = await Promise.all([
        getAllActiveRaces(),
        getSession(),
        getPaginatedFinishedRaces(1, 6),
    ]);

    const progressRaces = races
        .filter((race) => race.status !== 'pending')
        .slice(0, MAX_PER_GROUP);

    const pendingRaces = races
        .filter(
            (race) => race.participantCount > 0 && race.status === 'pending',
        )
        .slice(0, MAX_PER_GROUP);

    let finishedRaces: Race[] = [];
    const activeCount = progressRaces.length + pendingRaces.length;

    if (activeCount < FRONTPAGE_RACE_COUNT) {
        const fillCount = FRONTPAGE_RACE_COUNT - activeCount;
        finishedRaces = prefetchedFinished.items
            .filter(
                (race) =>
                    race.status === 'finished' &&
                    race.results &&
                    race.results.length > 0 &&
                    (race.results[0].status === 'finished' ||
                        race.results[0].status === 'confirmed'),
            )
            .slice(0, fillCount);
    }

    const hasRaces =
        progressRaces.length > 0 ||
        pendingRaces.length > 0 ||
        finishedRaces.length > 0;

    return (
        <Panel
            title="Races"
            subtitle="Race against friends"
            className="p-4"
            link={{ url: '/races', text: 'View All Races' }}
        >
            {!hasRaces && (
                <div className={styles.emptyState}>
                    No active races right now. Be the first to start one!
                </div>
            )}

            {progressRaces.length > 0 && (
                <div className={styles.ongoingSection}>
                    <div className={styles.sectionHeader}>
                        <h5>In Progress</h5>
                        <Badge variant="primary">{progressRaces.length}</Badge>
                    </div>
                    <div className={styles.raceList}>
                        {progressRaces.map((race) => (
                            <RaceCard key={race.raceId} race={race} />
                        ))}
                    </div>
                </div>
            )}

            {pendingRaces.length > 0 && (
                <div className={styles.upcomingSection}>
                    <div className={styles.sectionHeader}>
                        <h5>Upcoming</h5>
                        <Badge variant="info">{pendingRaces.length}</Badge>
                    </div>
                    <div className={styles.raceList}>
                        {pendingRaces.map((race) => (
                            <RaceCard key={race.raceId} race={race} />
                        ))}
                    </div>
                </div>
            )}

            {finishedRaces.length > 0 && (
                <div className={styles.finishedSection}>
                    <div className={styles.sectionHeader}>
                        <h5>Recently Finished</h5>
                        <Badge variant="secondary">
                            {finishedRaces.length}
                        </Badge>
                    </div>
                    <div className={styles.raceList}>
                        {finishedRaces.map((race) => (
                            <RaceCard key={race.raceId} race={race} />
                        ))}
                    </div>
                </div>
            )}

            {session && (
                <div className="d-flex justify-content-center mt-3">
                    <a href="/races/create" className={styles.startRaceButton}>
                        Start a Race <FaArrowRight size={12} />
                    </a>
                </div>
            )}
        </Panel>
    );
};
