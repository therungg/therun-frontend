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
import { GameLink, UserLink } from "~src/components/links/links";
import { getLiveRunForUser } from "~src/lib/live-runs";
import { SkeletonLiveRun } from "~src/components/skeleton/live/skeleton-live-run";

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
    const [selectedSort, setSelectedSort] = useState("pb");
    const [search, setSearch] = useState("");

    const recommendedStream = getRecommendedStream(liveDataMap, username);
    const [currentlyViewing, setCurrentlyViewing] = useState(recommendedStream);

    const [loadingUserData, setLoadingUserData] = useState(true);

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

    useEffect(() => {
        if (
            currentlyViewing &&
            (!updatedLiveDataMap[currentlyViewing] ||
                updatedLiveDataMap[currentlyViewing].isMinified)
        ) {
            const liveRunFromUser = async (user: string) => {
                setLoadingUserData(true);

                const newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap),
                );

                newMap[currentlyViewing] = await getLiveRunForUser(user);

                setUpdatedLiveDataMap(
                    liveRunArrayToMap(
                        Object.values(newMap),
                        selectedSort,
                        tournamentLeaderboards,
                    ),
                );
                setLoadingUserData(false);
            };

            liveRunFromUser(currentlyViewing);
        } else {
            setLoadingUserData(false);
        }
    }, [currentlyViewing]);

    const breadcrumbs: BreadcrumbItem[] = [
        { content: "Tournaments", href: "/tournaments" },
        { content: tournament.shortName || "" },
    ];

    return (
        <>
            <div className="g-1 mt-2 mb-3 row">
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
            <Card className={`game-border h-100 mb-3`}>
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
                                "d-flex justify-content-between gap-3 mb-0 pb-2 mb-2 w-100 border-bottom"
                            }
                        >
                            <div className={"pb-0 mb-0 w-100 fst-italic"}>
                                <GameLink game={tournament.game} /> -{" "}
                                {tournament.category}
                            </div>
                        </div>

                        {tournamentLeaderboards &&
                            tournamentLeaderboards.pbLeaderboard &&
                            tournamentLeaderboards.pbLeaderboard.length > 0 && (
                                <div className={"flex-grow-1"}>
                                    Current record:{" "}
                                    <span className={"fs-4"}>
                                        <DurationToFormatted
                                            duration={
                                                tournamentLeaderboards
                                                    .pbLeaderboard[0]
                                                    .stat as string
                                            }
                                        />
                                    </span>{" "}
                                    by&nbsp;
                                    <UserLink
                                        username={
                                            tournamentLeaderboards
                                                .pbLeaderboard[0].username
                                        }
                                    />
                                </div>
                            )}
                        {tournament.socials && tournament.socials.twitch && (
                            <div>
                                Watch live at{" "}
                                <a href={tournament.socials.twitch.url}>
                                    {tournament.socials.twitch.urlDisplay}
                                </a>
                            </div>
                        )}
                        <div className={"text-end fs-4"}>
                            <TournamentTimer tournament={tournament} />
                        </div>
                    </Col>
                </Row>
            </Card>

            <Tabs
                defaultActiveKey={tab}
                className="position-relative z-0 mb-3 tab-box"
            >
                <Tab title={"Live"} eventKey={"live"}>
                    <Row className="g-4 mb-4">
                        {loadingUserData && <SkeletonLiveRun />}
                        {!loadingUserData &&
                            currentlyViewing &&
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
                    <Row className="g-4">
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
                            <Row className="mt-3">
                                <Col md={4} className="mb-4">
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
                                <Col md={8} className="mb-4">
                                    <div className="input-group">
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
                                            placeholder="Filter by user"
                                            onChange={(e) => {
                                                setSearch(e.target.value);
                                            }}
                                            value={search}
                                            id="gameSearch"
                                        />
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
