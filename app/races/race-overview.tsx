"use client";

import {
    GameStats,
    GlobalStats,
    PaginatedRaces,
    Race,
} from "~app/races/races.types";
import { Button, Col, Row } from "react-bootstrap";
import { InProgressRaces } from "~app/races/in-progress-races";
import { PendingRaces } from "~app/races/pending-races";
import { GlobalRaceStats } from "~app/races/global-race-stats";
import { CreateRaceButtons } from "~app/races/create-race-buttons";
import { useRaces } from "~app/races/hooks/use-race";
import { RecentlyFinishedRaces } from "~app/races/recently-finished-races";
import { RaceFaq } from "~app/races/race-faq";
import { PatreonBunnySvg } from "~app/patron/patreon-info";
import { RacesWelcomeMessage } from "~app/races/races-welcome-message";

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
                    <a
                        href="/patron"
                        rel="noreferrer"
                        target="_blank"
                        className="ms-2"
                    >
                        <Button variant="secondary">
                            Support therun.gg! <PatreonBunnySvg />
                        </Button>
                    </a>
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

const getInProgressRaces = (races: Race[]): Race[] => {
    return races
        .filter((race) => {
            return (
                race.status === "progress" ||
                race.status === "starting" ||
                race.status === "finished"
            );
        })
        .sort((a, b) => {
            return (
                new Date(a.startTime as string).getTime() -
                new Date(b.startTime as string).getTime()
            );
        });
};

const getUpcomingRaces = (races: Race[]): Race[] => {
    return races
        .filter((race) => {
            return race.status === "pending";
        })
        .sort((a, b) => {
            return (
                new Date(a.startTime as string).getTime() -
                new Date(b.startTime as string).getTime()
            );
        });
};
