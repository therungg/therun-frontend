"use client";

import React, { useEffect, useState } from "react";
import { Button, Col, Image, Row, Tab, Tabs } from "react-bootstrap";
import { LiveUserRun } from "~src/components/live/live-user-run";
import { RecommendedStream } from "~src/components/live/recommended-stream";
import runStyles from "~src/components/css/LiveRun.module.scss";
import { DurationToFormatted } from "~src/components/util/datetime";
import useSWR from "swr";
import { fetcher } from "~src/utils/fetcher";
import TournamentStats from "~src/components/tournament/tournament-stats";
import BanUser from "~src/components/tournament/ban-user";
import {
    Tournament,
    TournamentInfo,
} from "~src/components/tournament/tournament-info";
import { TournamentRuns } from "~src/components/tournament/tournament-runs";
import { TournamentStandings } from "~src/components/tournament/tournament-standings";
import { useReconnectWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { LiveDataMap } from "~app/live/live.types";
import { getRecommendedStream, liveRunIsInSearch } from "~app/live/utilities";
import { isLiveDataEligibleForTournament } from "~app/tournaments/[tournament]/is-live-data-eligible-for-tournament.component";
import { liveRunArrayToMap } from "~app/tournaments/[tournament]/live-run-array-to-map.component";
import { EventLeaderboards } from "~app/tournaments/[tournament]/event-leaderboards.component";
import { Search as SearchIcon } from "react-bootstrap-icons";
import { TournamentTimer } from "~app/tournaments/[tournament]/tournament-timer";

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
    const [sort, setSort] = useState("personalBest");
    const [search, setSearch] = useState("");

    const recommendedStream = getRecommendedStream(liveDataMap, username);
    const [currentlyViewing, setCurrentlyViewing] = useState(recommendedStream);

    let tournamentLeaderboards = null;
    if (tournament.leaderboards) {
        tournamentLeaderboards =
            gameTime && tournament.leaderboards.gameTime
                ? tournament.leaderboards.gameTime
                : tournament.leaderboards;
    }

    const { data } = useSWR(
        `/api/tournaments/${tournament.name}/stats`,
        fetcher
    );
    const { data: qualifierData } = useSWR(
        tournament.qualifier
            ? `/api/tournaments/${tournament.qualifier}`
            : null,
        fetcher
    );

    const lastMessage = useReconnectWebsocket();

    useEffect(() => {
        if (lastMessage !== null) {
            const newData = JSON.parse(lastMessage.data);
            const user = newData.user;

            if (isLiveDataEligibleForTournament(newData.run, tournament)) {
                let newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap)
                );

                if (newData.type == "UPDATE") {
                    newMap[user] = newData.run;
                }

                if (newData.type == "DELETE") {
                    delete newMap[user];

                    if (recommendedStream == user) {
                        const newRecommendedStream = getRecommendedStream(
                            newMap,
                            username
                        );
                        setCurrentlyViewing(newRecommendedStream);
                    }
                }

                newMap = liveRunArrayToMap(
                    Object.values(newMap),
                    sort,
                    tournamentLeaderboards
                );

                setUpdatedLiveDataMap(newMap);
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        let newMap: LiveDataMap = JSON.parse(
            JSON.stringify(updatedLiveDataMap)
        );
        newMap = liveRunArrayToMap(
            Object.values(newMap),
            sort,
            tournamentLeaderboards
        );

        setUpdatedLiveDataMap(newMap);
    }, [sort]);

    return (
        <div>
            <Row
                className={
                    runStyles.tournamentInfo +
                    (tournament.logoUrl
                        ? ` ${runStyles.tournamentInfoLogo}`
                        : "")
                }
            >
                <Col xl={10}>
                    <h1>{tournament.shortName || tournament.name}</h1>

                    {tournamentLeaderboards &&
                        tournamentLeaderboards.pbLeaderboard &&
                        tournamentLeaderboards.pbLeaderboard.length > 0 && (
                            <div>
                                Current record:{" "}
                                <span style={{ fontSize: "x-large" }}>
                                    <DurationToFormatted
                                        duration={
                                            tournamentLeaderboards
                                                .pbLeaderboard[0].stat as string
                                        }
                                    />
                                </span>{" "}
                                by&nbsp;
                                {
                                    tournamentLeaderboards.pbLeaderboard[0]
                                        .username
                                }
                            </div>
                        )}
                    <div>
                        {tournament.game} - {tournament.category}
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
                <Col xl={2}>
                    <div>
                        {tournament.logoUrl && (
                            <div className="d-flex pt-3 justify-content-end h-100">
                                <Image
                                    src={tournament.logoUrl}
                                    alt={"Tournament Logo"}
                                    height={120}
                                />
                            </div>
                        )}

                        {(!tournament.eligibleUsers ||
                            tournament.eligibleUsers.length === 0) && (
                            <div
                                className={
                                    runStyles.tournamentHowDoesThisWorkButton
                                }
                            >
                                <a
                                    href={
                                        tournament.description?.includes(
                                            "Moist"
                                        )
                                            ? "/moist-setup"
                                            : "/upload-key"
                                    }
                                    rel={"noreferrer"}
                                    target={"_blank"}
                                >
                                    <Button
                                        variant={"primary"}
                                        className="btn-lg px-3 h-3r fw-medium"
                                        style={{ width: "15rem" }}
                                    >
                                        How does this work?
                                    </Button>
                                </a>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            <div style={{ display: "flex", justifyContent: "center" }}>
                <h2 className={runStyles.tournamentTimer}>
                    <TournamentTimer tournament={tournament} />
                </h2>
            </div>
            <Row>
                <Col sm={7} xs={12}></Col>
                <Col sm={5} xs={12}></Col>
            </Row>

            <Tabs
                defaultActiveKey={tab}
                className={"mb-3"}
                style={{ position: "relative", zIndex: 0, maxWidth: "30rem" }}
            >
                <Tab title={"Live"} eventKey={"live"}>
                    <div style={{ marginBottom: "1rem", marginTop: "1rem" }}>
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
                    </div>
                    {/*{(!currentlyViewing || !updatedLiveDataMap[currentlyViewing] && tournament.forceStream) &&*/}
                    {/*    <div style={{marginBottom: '1rem', marginTop: '1rem'}}>*/}
                    {/*        <TwitchEmbed channel={tournament.forceStream} width={'100%'} height={'600px'} muted*/}
                    {/*                     withChat={true}/>*/}
                    {/*    </div>}*/}
                    <Row>
                        <Col xl={4} lg={12} md={12}>
                            <EventLeaderboards
                                tournament={tournament}
                                gameTime={gameTime}
                                qualifierData={qualifierData}
                                tournamentLeaderboards={tournamentLeaderboards}
                            />
                        </Col>
                        <Col xl={8} lg={12} md={12}>
                            <h3>Live Runs</h3>
                            <Row style={{ marginBottom: "1rem" }}>
                                <Col>
                                    <Button
                                        className={
                                            runStyles.sortButton +
                                            (sort === "time"
                                                ? ` ${runStyles.sortButtonActive}`
                                                : "")
                                        }
                                        onClick={() => {
                                            setSort("time");
                                        }}
                                    >
                                        Sort by Current Time
                                    </Button>
                                </Col>
                                <Col>
                                    <Button
                                        className={
                                            runStyles.sortButton +
                                            (sort === "pb"
                                                ? ` ${runStyles.sortButtonActive}`
                                                : "")
                                        }
                                        onClick={() => {
                                            setSort("pb");
                                        }}
                                    >
                                        Sort by Tournament PB
                                    </Button>
                                </Col>
                                <Col>
                                    <Button
                                        className={
                                            runStyles.sortButton +
                                            (sort === "personalBest"
                                                ? ` ${runStyles.sortButtonActive}`
                                                : "")
                                        }
                                        onClick={() => {
                                            setSort("personalBest");
                                        }}
                                    >
                                        Sort by Personal Best
                                    </Button>
                                </Col>
                                <Col>
                                    <Button
                                        className={
                                            runStyles.sortButton +
                                            (sort === "name"
                                                ? ` ${runStyles.sortButtonActive}`
                                                : "")
                                        }
                                        onClick={() => {
                                            setSort("name");
                                        }}
                                    >
                                        Sort by Name
                                    </Button>
                                </Col>
                            </Row>

                            <div className="d-flex justify-content-center">
                                <div className="mb-3 input-group game-filter-mw">
                                    <span
                                        className="input-group-text"
                                        onClick={() => {
                                            const searchElement =
                                                document.getElementById(
                                                    "gameSearch"
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
                                        liveRunIsInSearch(run, search)
                                    )
                                    .map((liveRun) => {
                                        return (
                                            <Col
                                                xl={6}
                                                lg={6}
                                                md={12}
                                                key={liveRun.user}
                                                style={{ marginBottom: "1rem" }}
                                                onClick={() => {
                                                    setCurrentlyViewing(
                                                        liveRun.user
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
                    <TournamentInfo tournament={tournament} />
                </Tab>
                <Tab title={"Runs"} eventKey={"runs"}>
                    <TournamentRuns
                        data={data}
                        tournament={tournament}
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
                {tournament.moderators.includes(session.username) && (
                    <Tab title={"Ban User"} eventKey={"ban"}>
                        <BanUser session={session} tournament={tournament} />
                    </Tab>
                )}
            </Tabs>
        </div>
    );
};
