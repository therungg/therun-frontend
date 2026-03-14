'use client';

import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { UserRaceStatsByGame } from '~app/(new-layout)/[username]/races/user-race-stats-by-game';
import { UserRaces } from '~app/(new-layout)/[username]/races/user-races';
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
import styles from './user-races.module.scss';

interface UserRaceProfileProps {
    username: string;
    globalStats: UserStats;
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

    if (!participations || participations.length === 0) {
        return (
            <div className={styles.noRaces}>
                Unfortunately, this user has not done any races yet.
            </div>
        );
    }
    return (
        <div className={styles.profileContainer}>
            <Breadcrumb breadcrumbs={breadcrumbs} />
            <Row>
                <Col xl={7} xxl={7}>
                    <h2 className={styles.sectionHeading}>Races</h2>
                    <UserRaces
                        participations={participations}
                        initialRaces={initialRaces}
                        username={username}
                    />
                </Col>
                <Col xl={5} xxl={5}>
                    <h2 className={styles.sectionHeading}>Stats</h2>
                    <div className="mb-3">
                        <UserRaceStatsTable raceStats={globalStats} />
                    </div>
                    <UserRaceStatsByGame stats={categoryStatsMap} />
                </Col>
            </Row>
        </div>
    );
};
