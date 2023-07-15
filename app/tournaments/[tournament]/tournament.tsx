"use client";

import React, { useEffect, useState } from "react";
import { Button, Col, Image, Row, Tab, Tabs } from "react-bootstrap";
import { LiveUserRun } from "~src/components/live/live-user-run";
import { RecommendedStream } from "~src/components/live/recommended-stream";
import runStyles from "~src/components/css/LiveRun.module.scss";
import { DurationToFormatted } from "~src/components/util/datetime";
import homeStyles from "~src/components/css/Home.module.scss";
import Countdown from "react-countdown";
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
import searchStyles from "~src/components/css/Search.module.scss";
import styles from "~src/components/css/Games.module.scss";
import { EventLeaderboards } from "~app/tournaments/[tournament]/event-leaderboards.component";

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

    const eventStarted = new Date() > new Date(tournament.startDate);
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

    const renderCountdown = ({ days, hours, minutes, completed }) => {
        if (completed) {
            return <div>Event ended!</div>;
        }

        if (!eventStarted) {
            return <></>;
        }

        return (
            <div>
                {!!parseInt(days) && `${days} days, `}{" "}
                {!!parseInt(hours) && `${hours} hours and `}{" "}
                {`${minutes} minute${minutes === 1 ? "" : "s"} to go!`}
            </div>
        );
    };

    const renderCountdownToStart = ({ days, hours, minutes, completed }) => {
        if (completed) {
            return <></>;
        }

        return (
            <div>
                Event starts in {!!days && `${days} days, `}{" "}
                {hours && `${hours} hours and `}{" "}
                {`${minutes} minute${minutes === 1 ? "" : "s"}!`}
            </div>
        );
    };

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
                            <div
                                style={{
                                    fontSize: "1.5rem",
                                    height: "100%",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                }}
                                className={homeStyles.learnMoreButtonContainer}
                            >
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
                                        variant={"outline-primary"}
                                        className={homeStyles.learnMoreButton}
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
                    <Countdown
                        date={
                            new Date(
                                tournament.eligiblePeriods &&
                                tournament.eligiblePeriods.length > 0
                                    ? tournament.eligiblePeriods[0].startDate
                                    : tournament.startDate
                            )
                        }
                        renderer={renderCountdownToStart}
                    ></Countdown>
                    <Countdown
                        date={
                            new Date(
                                tournament.eligiblePeriods &&
                                tournament.eligiblePeriods.length > 1
                                    ? tournament.eligiblePeriods[1].endDate
                                    : tournament.endDate
                            )
                        }
                        renderer={renderCountdown}
                    >
                        <div>Tournament ended!</div>
                    </Countdown>
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

                            <div>
                                <div
                                    className={runStyles.searchContainer}
                                    style={{
                                        marginLeft: "0",
                                        justifyContent: "center",
                                    }}
                                >
                                    <div
                                        className={`${searchStyles.searchContainer} ${styles.filter}`}
                                        style={{
                                            marginLeft: "0",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <span
                                            className={
                                                "material-symbols-outlined"
                                            }
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
                                            search
                                        </span>
                                        <input
                                            type="search"
                                            className={`form-control ${searchStyles.search}`}
                                            placeholder="Filter by game/category/user"
                                            style={{ marginBottom: "0" }}
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                            }}
                                            value={search}
                                            id="gameSearch"
                                        />
                                    </div>
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
