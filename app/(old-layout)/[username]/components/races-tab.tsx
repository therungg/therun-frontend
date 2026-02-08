'use client';

import { Col, Row } from 'react-bootstrap';
import { UserRaceStatsByGame } from '~app/(old-layout)/[username]/races/user-race-stats-by-game';
import { UserRaces } from '~app/(old-layout)/[username]/races/user-races';
import {
    Race,
    RaceParticipant,
    UserStats,
} from '~app/(old-layout)/races/races.types';
import { UserRaceStatsTable } from '~src/components/run/user-detail/user-race-stats';

interface RacesTabProps {
    username: string;
    globalStats: UserStats;
    categoryStatsMap: UserStats[][];
    participations: RaceParticipant[];
    initialRaces: Race[];
}

export const RacesTab = ({
    username,
    globalStats,
    categoryStatsMap,
    participations,
    initialRaces,
}: RacesTabProps) => {
    if (!participations || participations.length === 0) {
        return (
            <div className="text-muted text-center py-5">
                No race data available yet.
            </div>
        );
    }

    return (
        <Row>
            <Col xl={7} xxl={7}>
                <h2>Races</h2>
                <UserRaces
                    participations={participations}
                    initialRaces={initialRaces}
                    username={username}
                />
            </Col>
            <Col xl={5} xxl={5}>
                <h2>Stats</h2>
                <UserRaceStatsTable raceStats={globalStats} />
                <UserRaceStatsByGame stats={categoryStatsMap} />
            </Col>
        </Row>
    );
};
