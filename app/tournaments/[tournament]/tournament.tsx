"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, Col, Row, Tab, Tabs } from "react-bootstrap";
import { LiveUserRun } from "~src/components/live/live-user-run";
import { RecommendedStream } from "~src/components/live/recommended-stream";
import { DurationToFormatted } from "~src/components/util/datetime";
import useSWR from "swr";
import { fetcher } from "~src/utils/fetcher";
import TournamentStats from "~src/components/tournament/tournament-stats";
import {
    Tournament,
    TournamentInfo,
} from "~src/components/tournament/tournament-info";
import { TournamentRuns } from "~src/components/tournament/tournament-runs";
import { useLiveRunsWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { LiveDataMap } from "~app/live/live.types";
import { getRecommendedStream, liveRunIsInSearch } from "~app/live/utilities";
import { isLiveDataEligibleForTournament } from "~app/tournaments/[tournament]/is-live-data-eligible-for-tournament.component";
import { liveRunArrayToMap } from "~app/tournaments/[tournament]/live-run-array-to-map.component";
import { EventLeaderboards } from "~app/tournaments/[tournament]/event-leaderboards.component";
import { Search as SearchIcon } from "react-bootstrap-icons";
import { TournamentTimer } from "~app/tournaments/[tournament]/tournament-timer";
import { TournamentStandings } from "~src/components/tournament/tournament-standings";
import {
    Breadcrumb,
    BreadcrumbItem,
} from "~src/components/breadcrumbs/breadcrumb";
import { CategoryLeaderboard } from "~app/games/[game]/game.types";

export const GenericTournament = ({
    liveDataMap,
    session,
    username,
    tournament,
    tab,
}: {
    liveDataMap: LiveDataMap;
    session: any;
    username?: string;
    tournament: Tournament;
    tab: string;
}) => {
    const gameTime = !!tournament.gameTime;

    const [updatedLiveDataMap, setUpdatedLiveDataMap] = useState(liveDataMap);
    const [selectedSort, setSelectedSort] = useState("personalBest");
    const [search, setSearch] = useState("");

    const recommendedStream = getRecommendedStream(liveDataMap, username);
    const [currentlyViewing, setCurrentlyViewing] = useState(recommendedStream);

    const handleSortChange: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(
            (event) => {
                setSelectedSort(event.target.value);
            },
            [setSelectedSort],
        );

    let tournamentLeaderboards: CategoryLeaderboard | null = null;
    if (tournament.leaderboards) {
        tournamentLeaderboards =
            gameTime && tournament.leaderboards.gameTime
                ? tournament.leaderboards.gameTime
                : tournament.leaderboards;
    }

    const { data } = useSWR(
        `/api/tournaments/${tournament.name}/stats`,
        fetcher,
    );
    const { data: qualifierData } = useSWR(
        tournament.qualifier
            ? `/api/tournaments/${tournament.qualifier}`
            : null,
        fetcher,
    );

    const lastMessage = useLiveRunsWebsocket();

    useEffect(() => {
        if (lastMessage !== null) {
            const newData = lastMessage;
            const user = newData.user;

            if (isLiveDataEligibleForTournament(newData.run, tournament)) {
                let newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap),
                );

                if (newData.type == "UPDATE") {
                    newMap[user] = newData.run;
                }

                if (newData.type == "DELETE") {
                    delete newMap[user];

                    if (recommendedStream == user) {
                        const newRecommendedStream = getRecommendedStream(
                            newMap,
                            username,
                        );
                        setCurrentlyViewing(newRecommendedStream);
                    }
                }

                newMap = liveRunArrayToMap(
                    Object.values(newMap),
                    selectedSort,
                    tournamentLeaderboards,
                );

                setUpdatedLiveDataMap(newMap);
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        let newMap: LiveDataMap = JSON.parse(
            JSON.stringify(updatedLiveDataMap),
        );
        newMap = liveRunArrayToMap(
            Object.values(newMap),
            selectedSort,
            tournamentLeaderboards,
        );

        setUpdatedLiveDataMap(newMap);
    }, [selectedSort]);

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Tournaments", href: "/tournaments" },
        { content: tournament.shortName || "" },
    ];

    return (
        <>
            <div className="g-1 mt-2 mb-4 row">
                <Breadcrumb
                    breadcrumbs={breadcrumbs}
                    className={"flex-grow-1 col-auto"}
                />
                {!tournament.eligibleUsers?.length && (
                    <div className="flex-grow-1 text-end col-auto">
                        <a
                            href={"/livesplit"}
                            rel={"noreferrer"}
                            target={"_blank"}
                            className="link-primary text-decoration-underline fs-6"
                        >
                            How does this work?
                        </a>
                    </div>
                )}
            </div>
            <Card className={`game-border h-100`}>
                <Row style={{ minHeight: "10rem" }}>
                    <Col xs={4} sm={3} md={"auto"}>
                        {tournament.logoUrl && (
                            <Card.Img
                                className={
                                    "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                }
                                style={{
                                    minWidth: "5rem",
                                    maxHeight: "18rem",
                                    maxWidth: "10rem",
                                }}
                                src={`/${tournament.logoUrl}`}
                                alt={"Tournament Logo"}
                                height={100}
                                width={20}
                            />
                        )}
                        {!tournament.logoUrl && tournament.gameImage && (
                            <Card.Img
                                className={
                                    "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                }
                                style={{
                                    minWidth: "5rem",
                                    maxHeight: "18rem",
                                    maxWidth: "10rem",
                                }}
                                src={tournament.gameImage}
                                alt={"Tournament Logo"}
                                height={100}
                                width={20}
                            />
                        )}
                    </Col>
                    <Col className={"p-2 ps-1 pe-4 d-flex flex-column"}>
                        <div className={"d-flex justify-content-between gap-3"}>
                            <Card.Title className="m-0 p-0 h5">
                                <h1>
                                    {tournament.shortName || tournament.name}
                                </h1>
                            </Card.Title>
                        </div>

                        <div
                            className={
                                "d-flex justify-content-between gap-3 mb-0 pb-2 w-100 border-bottom"
                            }
                        >
                            <div className={"pb-0 mb-0 w-100 fst-italic"}>
                                {tournament.game} - {tournament.category}
                            </div>
                        </div>

                        {tournament.socials && tournament.socials.twitch && (
                            <div>
                                Watch live at{" "}
                                <a href={tournament.socials.twitch.url}>
                                    {tournament.socials.twitch.urlDisplay}
                                </a>
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>
            <div className="text-center mt-5 mb-4">
                {tournamentLeaderboards &&
                    tournamentLeaderboards.pbLeaderboard &&
                    tournamentLeaderboards.pbLeaderboard.length > 0 && (
                        <h2 className={"text-primary"}>
                            Current record:{" "}
                            <DurationToFormatted
                                duration={
                                    tournamentLeaderboards.pbLeaderboard[0]
                                        .stat as string
                                }
                            />{" "}
                            by&nbsp;
                            {tournamentLeaderboards.pbLeaderboard[0].username}
                        </h2>
                    )}
                <h2>
                    <TournamentTimer tournament={tournament} />
                </h2>
            </div>
            <Row>
                <Col sm={7} xs={12}></Col>
                <Col sm={5} xs={12}></Col>
            </Row>

            <Tabs
                defaultActiveKey={tab}
                className="position-relative z-0 mb-3 tab-box"
            >
                <Tab title={"Live"} eventKey={"live"}>
                    <Row className="g-3 mb-3">
                        {currentlyViewing &&
                            updatedLiveDataMap[currentlyViewing] && (
                                <RecommendedStream
                                    stream={
                                        tournament.forceStream ||
                                        updatedLiveDataMap[currentlyViewing]
                                            .user
                                    }
                                    liveRun={
                                        updatedLiveDataMap[currentlyViewing]
                                    }
                                />
                            )}
                    </Row>
                    {/*{(!currentlyViewing || !updatedLiveDataMap[currentlyViewing] && tournament.forceStream) &&*/}
                    {/*    <div style={{marginBottom: '1rem', marginTop: '1rem'}}>*/}
                    {/*        <TwitchEmbed channel={tournament.forceStream} width={'100%'} height={'600px'} muted*/}
                    {/*                     withChat={true}/>*/}
                    {/*    </div>}*/}
                    <Row>
                        <Col md={12} xl={4}>
                            <EventLeaderboards
                                tournament={tournament}
                                gameTime={gameTime}
                                qualifierData={qualifierData}
                                tournamentLeaderboards={tournamentLeaderboards}
                            />
                        </Col>
                        <Col md={12} xl={8}>
                            <h3>Live Runs</h3>
                            <Row className="mt-4">
                                <Col md={4} className="mb-2">
                                    <select
                                        className={"form-select"}
                                        onChange={handleSortChange}
                                        value={selectedSort}
                                    >
                                        <option value="time">
                                            Sort by Current Time
                                        </option>
                                        <option value="pb">
                                            Sort by Tournament PB
                                        </option>
                                        <option value="personalBest">
                                            Sort By Personal best
                                        </option>
                                        <option value="name">
                                            Sort by Name
                                        </option>
                                    </select>
                                </Col>
                                <Col>
                                    <div className="d-flex justify-content-center">
                                        <div className="mb-3 input-group game-filter-mw">
                                            <span
                                                className="input-group-text"
                                                onClick={() => {
                                                    const searchElement =
                                                        document.getElementById(
                                                            "gameSearch",
                                                        );
                                                    if (
                                                        document.activeElement !==
                                                        searchElement
                                                    ) {
                                                        searchElement.focus();
                                                    }
                                                }}
                                            >
                                                <SearchIcon size={18} />
                                            </span>
                                            <input
                                                type="search"
                                                className="form-control"
                                                placeholder="Filter by game/category/user"
                                                onChange={(e) => {
                                                    setSearch(e.target.value);
                                                }}
                                                value={search}
                                                id="gameSearch"
                                            />
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                {Object.values(updatedLiveDataMap).length ==
                                    0 && (
                                    <div>
                                        Unfortunately, nobody is running live
                                        now...
                                    </div>
                                )}

                                {Object.values(updatedLiveDataMap)
                                    .filter((run) =>
                                        liveRunIsInSearch(run, search),
                                    )
                                    .map((liveRun) => {
                                        return (
                                            <Col
                                                lg={6}
                                                md={12}
                                                className="mb-3"
                                                key={liveRun.user}
                                                onClick={() => {
                                                    setCurrentlyViewing(
                                                        liveRun.user,
                                                    );
                                                }}
                                            >
                                                <LiveUserRun
                                                    liveRun={liveRun}
                                                    currentlyActive={
                                                        currentlyViewing
                                                    }
                                                    key={liveRun.user}
                                                    showGameCategory={false}
                                                    leaderboard={
                                                        tournamentLeaderboards.pbLeaderboard
                                                    }
                                                />
                                            </Col>
                                        );
                                    })}
                            </Row>
                        </Col>
                    </Row>
                </Tab>
                <Tab title={"Info"} eventKey={"info"}>
                    <TournamentInfo tournament={tournament} user={session} />
                </Tab>
                <Tab title={"Runs"} eventKey={"runs"}>
                    <TournamentRuns
                        data={data}
                        tournament={tournament}
                        user={session}
                        gameTime={false}
                    />
                </Tab>
                {tournament.pointDistribution && (
                    <Tab title={"Standings"} eventKey={"standings"}>
                        <TournamentStandings tournament={tournament} />
                    </Tab>
                )}
                <Tab title={"Stats"} eventKey={"stats"}>
                    <TournamentStats
                        data={data}
                        tournament={tournament}
                        gameTime={false}
                    />
                </Tab>
            </Tabs>
        </>
    );
};
