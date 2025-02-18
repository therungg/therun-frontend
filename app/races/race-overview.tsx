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
import { GlobalRaceStats } from "~app/races/global-race-stats";
import { CreateRaceButtons } from "~app/races/create-race-buttons";
import { useRaces } from "~app/races/hooks/use-race";
import { RecentlyFinishedRaces } from "~app/races/recently-finished-races";
import { RaceFaq } from "~app/races/race-faq";
import { RacesWelcomeMessage } from "~app/races/races-welcome-message";
import {
    getInProgressRaces,
    getUpcomingRaces,
} from "~src/helpers/race-helpers";

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

    const inProgressRaces = getInProgressRaces(racesState);
    const upcomingRaces = getUpcomingRaces(racesState);

    return (
        <>
            <Row className="mb-3">
                <Col md={12} lg={7} className="d-flex">
                    <h1>Races</h1>
                </Col>
                <Col
                    md={12}
                    lg={5}
                    className="d-flex mt-3 mt-lg-0 justify-content-end align-items-center"
                >
                    <CreateRaceButtons />
                    <RaceFaq />
                </Col>
            </Row>
            <Row className="gx-5 gy-5">
                <Col xl={8} lg={7} md={12}>
                    <RacesWelcomeMessage />
                    <InProgressRaces races={inProgressRaces} />
                    {/*<h3>Recently Finished Races</h3>*/}
                </Col>
                <Col xl={4} lg={5} md={12}>
                    <PendingRaces races={upcomingRaces} />
                    <GlobalRaceStats
                        stats={globalRaceStats}
                        gameStats={globalGameStats}
                    />
                    <RecentlyFinishedRaces races={finishedRaces.items} />
                </Col>
            </Row>
        </>
    );
};
