'use client';

import React from 'react';
import { UserRaceStatsByGame } from '~app/(new-layout)/[username]/(sections)/races/user-race-stats-by-game';
import { UserRaces } from '~app/(new-layout)/[username]/(sections)/races/user-races';
import {
    Race,
    RaceParticipant,
    UserStats,
} from '~app/(new-layout)/races/races.types';
import {
    Breadcrumb,
    BreadcrumbItem,
} from '~src/components/breadcrumbs/breadcrumb';
import { UserRaceStatsTable } from '~src/components/run/user-detail/user-race-stats';
import sectionStyles from '../sections.module.scss';
import styles from './user-races.module.scss';

interface UserRaceProfileProps {
    username: string;
    globalStats?: UserStats;
    categoryStatsMap: UserStats[][];
    participations: RaceParticipant[];
    initialRaces: Race[];
}

export const UserRaceProfile = ({
    username,
    globalStats,
    categoryStatsMap,
    participations,
    initialRaces,
}: UserRaceProfileProps) => {
    const breadcrumbs: BreadcrumbItem[] = [
        { content: username, href: `/${username}` },
        { content: 'Race Stats' },
    ];

    if (!participations || participations.length === 0 || !globalStats) {
        return (
            <div className={styles.noRaces}>
                Unfortunately, this user has not done any races yet.
            </div>
        );
    }
    return (
        <div className={styles.profileContainer}>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <div className={styles.grid}>
                <section className={sectionStyles.panel}>
                    <h2 className={sectionStyles.panelTitle}>Races</h2>
                    <UserRaces
                        participations={participations}
                        initialRaces={initialRaces}
                        username={username}
                    />
                </section>
                <section className={sectionStyles.panel}>
                    <h2 className={sectionStyles.panelTitle}>Stats</h2>
                    <div className="mb-3">
                        <UserRaceStatsTable raceStats={globalStats} />
                    </div>
                    <UserRaceStatsByGame stats={categoryStatsMap} />
                </section>
            </div>
        </div>
    );
};
