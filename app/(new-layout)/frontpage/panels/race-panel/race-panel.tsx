import clsx from 'clsx';
import { FaPlusCircle } from 'react-icons/fa';
import { Badge } from '~app/(new-layout)/components/badge.component';
import { Card } from '~app/(new-layout)/components/card.component';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { Race } from '~app/(old-layout)/races/races.types';
import { getSession } from '~src/actions/session.action';
import { getAllActiveRaces, getPaginatedFinishedRaces } from '~src/lib/races';
import { RaceCard } from './race-card';
import styles from './race-panel.module.scss';

const FRONTPAGE_RACE_COUNT = 4;

export default async function RacePanel() {
    const races = await getAllActiveRaces();
    const session = await getSession();

    const pendingRaces = races.filter(
        (race) => race.participantCount > 0 && race.status === 'pending',
    );
    const progressRaces = races.filter((race) => race.status !== 'pending');

    let finishedRaces: Race[] = [];
    let finishedRaceCount = undefined;

    const progressRaceLength = pendingRaces.length + progressRaces.length;

    if (progressRaceLength < FRONTPAGE_RACE_COUNT) {
        const showFinishedRaceCount = FRONTPAGE_RACE_COUNT - progressRaceLength;

        const finishedRaceData = await getPaginatedFinishedRaces(
            1,
            showFinishedRaceCount + 2,
        );
        finishedRaces = finishedRaceData.items
            .filter((race) => {
                return (
                    race.status === 'finished' &&
                    race.results &&
                    race.results.length > 0 &&
                    (race.results[0].status === 'finished' ||
                        race.results[0].status === 'confirmed')
                );
            })
            .slice(0, showFinishedRaceCount);
        finishedRaceCount = finishedRaceData.totalItems;
    }

    return (
        <Panel
            subtitle="Race against friends"
            title="Races"
            link={{ url: '/races', text: 'View All Races' }}
            className="p-4"
        >
            <div className={styles.ongoingSection}>
                <div className={styles.sectionHeader}>
                    <h5>Ongoing</h5>
                    <Badge variant="primary">{progressRaces.length}</Badge>
                </div>
                <Card className={clsx(styles.link)}>
                    <a href="/races/create" className={styles.link}>
                        {session && (
                            <div
                                className="d-flex align-items-center"
                                style={{
                                    color: 'var(--bs-primary)',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                }}
                            >
                                <span>
                                    <FaPlusCircle className="mb-1 me-2" /> Start
                                    a New Race
                                </span>
                            </div>
                        )}
                    </a>
                </Card>
                {progressRaces.length > 0 ? (
                    progressRaces.map((race) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            className="mt-2"
                        />
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        No races currently in progress
                    </div>
                )}
            </div>
            {pendingRaces.length > 0 && (
                <div className={styles.upcomingSection}>
                    <div className={styles.sectionHeader}>
                        <h5>Upcoming</h5>
                        <Badge variant="info">{pendingRaces.length}</Badge>
                    </div>
                    {pendingRaces.map((race, i) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            className={i > 0 ? 'mt-2' : ''}
                        />
                    ))}
                </div>
            )}
            {finishedRaces.length > 0 && (
                <div className={styles.finishedSection}>
                    <div className={styles.sectionHeader}>
                        <h5>Finished</h5>
                        <Badge variant="secondary">{finishedRaceCount}</Badge>
                    </div>
                    {finishedRaces.map((race, i) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            className={i > 0 ? 'mt-2' : ''}
                        />
                    ))}
                </div>
            )}
        </Panel>
    );
}
