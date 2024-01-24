"use client";

import {
    GameStats,
    GlobalStats,
    PaginatedRaces,
    Race,
} from "~app/races/races.types";
import { Col, Row } from "react-bootstrap";
import { InProgressRaces } from "~app/races/in-progress-races";
import { PendingRaces } from "~app/races/pending-races";
import { FinishedRaces } from "~app/races/finished-races";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import { GlobalRaceStats } from "~app/races/global-race-stats";
import { CreateRaceButtons } from "~app/races/create-race-buttons";
import { useRaces } from "~app/races/hooks/use-race";

interface RaceOverviewProps {
    races: Race[];
    finishedRaces: PaginatedRaces;
    globalRaceStats: GlobalStats;
    globalGameStats: GameStats[];
}

export const RaceOverview = ({
    races,
    finishedRaces,
    globalRaceStats,
    globalGameStats,
}: RaceOverviewProps) => {
    const racesState = useRaces(races);

    const inProgressRaces = racesState.filter((race) => {
        return race.status === "progress" || race.status === "starting";
    });

    const upcomingRaces = racesState.filter((race) => {
        return race.status === "pending";
    });

    return (
        <div>
            <div className={"d-flex"}>
                <h1>Races</h1>
                <span className={"mx-2 fst-italic"}>alpha</span>
            </div>
            <Row>
                <Col xl={8} lg={7} md={12}>
                    <InProgressRaces races={inProgressRaces} />
                </Col>
                <Col xl={4} lg={5} md={12}>
                    <PendingRaces races={upcomingRaces} />
                    <CreateRaceButtons />
                    <GlobalRaceStats
                        stats={globalRaceStats}
                        gameStats={globalGameStats}
                    />
                </Col>
            </Row>
            <hr />

            <PaginationContextProvider>
                <FinishedRaces races={finishedRaces} />
            </PaginationContextProvider>
        </div>
    );
};
