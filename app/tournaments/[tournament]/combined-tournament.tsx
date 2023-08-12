"use client";

import { LiveDataMap } from "~app/live/live.types";
import {
    Tournament,
    TournamentInfo,
} from "~src/components/tournament/tournament-info";
import React, { useEffect, useState } from "react";
import { getRecommendedStream, liveRunIsInSearch } from "~app/live/utilities";
import { useReconnectWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { isLiveDataEligibleForTournaments } from "~app/tournaments/[tournament]/is-live-data-eligible-for-tournament.component";
import { liveRunArrayToMap } from "~app/tournaments/[tournament]/live-run-array-to-map.component";
import { Button, Col, Image, Row, Tab, Tabs } from "react-bootstrap";
import runStyles from "~src/components/css/LiveRun.module.scss";
import { DurationToFormatted } from "~src/components/util/datetime";
import homeStyles from "~src/components/css/Home.module.scss";
import Countdown from "react-countdown";
import { RecommendedStream } from "~src/components/live/recommended-stream";
import searchStyles from "~src/components/css/Search.module.scss";
import styles from "~src/components/css/Games.module.scss";
import { LiveUserRun } from "~src/components/live/live-user-run";
import { CombinedEventLeaderboards } from "~app/tournaments/[tournament]/combined-event-leaderboards.component";

export const CombinedTournament = ({
    liveDataMap,
    username,
    guidingTournament,
    tournaments,
    tab,
}: {
    liveDataMap: LiveDataMap;
    username?: string;
    guidingTournament: Tournament;
    tournaments: Tournament[];
    tab: string;
}) => {
    const [updatedLiveDataMap, setUpdatedLiveDataMap] = useState(liveDataMap);
    const [sort, setSort] = useState("personalBest");
    const [search, setSearch] = useState("");

    const recommendedStream = getRecommendedStream(liveDataMap, username);
    const [currentlyViewing, setCurrentlyViewing] = useState(recommendedStream);

    const tournamentLeaderboards = null;

    const eventStarted = new Date() > new Date(guidingTournament.startDate);
    const lastMessage = useReconnectWebsocket();

    // const { data } = useSWR(
    //     tournaments.map(
    //         (tournament) =>
    //             `/api/tournaments/${safeEncodeURI(tournament.name)}/stats`
    //     ),
    //     multiFetcher
    // );

    useEffect(() => {
        if (lastMessage !== null) {
            const newData = JSON.parse(lastMessage.data);
            const user = newData.user;

            if (isLiveDataEligibleForTournaments(newData.run, tournaments)) {
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
                    (guidingTournament.logoUrl
                        ? ` ${runStyles.tournamentInfoLogo}`
                        : "")
                }
            >
                <Col xl={10}>
                    <h1>
                        {guidingTournament.shortName || guidingTournament.name}
                    </h1>

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
                    {guidingTournament.socials &&
                        guidingTournament.socials.twitch && (
                            <div>
                                Watch live at{" "}
                                <a href={guidingTournament.socials.twitch.url}>
                                    {
                                        guidingTournament.socials.twitch
                                            .urlDisplay
                                    }
                                </a>
                            </div>
                        )}
                </Col>
                <Col xl={2}>
                    <div>
                        {guidingTournament.logoUrl && (
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
                                    src={guidingTournament.logoUrl}
                                    alt={"Tournament Logo"}
                                    height={120}
                                />
                            </div>
                        )}

                        {(!guidingTournament.eligibleUsers ||
                            guidingTournament.eligibleUsers.length === 0) && (
                            <div
                                className={
                                    runStyles.tournamentHowDoesThisWorkButton
                                }
                            >
                                <a
                                    href={
                                        guidingTournament.description?.includes(
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
                                guidingTournament.eligiblePeriods &&
                                guidingTournament.eligiblePeriods.length > 0
                                    ? guidingTournament.eligiblePeriods[0]
                                          .startDate
                                    : guidingTournament.startDate
                            )
                        }
                        renderer={renderCountdownToStart}
                    ></Countdown>
                    <Countdown
                        date={
                            new Date(
                                guidingTournament.eligiblePeriods &&
                                guidingTournament.eligiblePeriods.length > 1
                                    ? guidingTournament.eligiblePeriods[1]
                                          .endDate
                                    : guidingTournament.endDate
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
                                        guidingTournament.forceStream ||
                                        updatedLiveDataMap[currentlyViewing]
                                            .user
                                    }
                                    liveRun={
                                        updatedLiveDataMap[currentlyViewing]
                                    }
                                />
                            )}
                    </div>
                    <Row>
                        <Col xl={4} lg={12} md={12}>
                            <CombinedEventLeaderboards
                                tournaments={tournaments}
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
                                                        tournamentLeaderboards &&
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
                    <TournamentInfo tournament={guidingTournament} />
                </Tab>
            </Tabs>
        </div>
    );
};
