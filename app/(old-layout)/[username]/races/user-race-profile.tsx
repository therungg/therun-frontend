"use client";

import {
    Race,
    RaceParticipant,
    UserStats,
} from "~app/(old-layout)/races/races.types";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import React from "react";
import { UserRaceStatsTable } from "~src/components/run/user-detail/user-race-stats";
import { UserRaceStatsByGame } from "~app/(old-layout)/[username]/races/user-race-stats-by-game";
import { Col, Row } from "react-bootstrap";
import { UserRaces } from "~app/(old-layout)/[username]/races/user-races";

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
        { content: "Race Stats" },
    ];

    if (!participations || participations.length === 0) {
        return <div>Unfortunately, this user has not done any races yet.</div>;
    }
    return (
        <div>
            <Breadcrumb breadcrumbs={breadcrumbs} />
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
        </div>
    );
};
