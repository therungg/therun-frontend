import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import { Button, Col, Image, Row, Tab, Tabs } from "react-bootstrap";
import { LiveRun, LiveUserRun } from "../../components/live/live-user-run";
import { RecommendedStream } from "../../components/live/recommended-stream";
import { getRecommendedStream, LiveDataMap } from "../live";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import runStyles from "../../components/css/LiveRun.module.scss";
import { getTournamentByName } from "../../components/tournament/getTournaments";
import { getLeaderboard } from "../../components/game/game-leaderboards";
import { DurationToFormatted } from "../../components/util/datetime";
import { getLiveRunsForGameCategory } from "../../lib/live-runs";
import homeStyles from "../../components/css/Home.module.scss";
import Countdown from "react-countdown";
import useSWR from "swr";
import { fetcher } from "../index";
import TournamentStats from "../../components/tournament/tournament-stats";
import BanUser from "../../components/tournament/ban-user";
import {
    Tournament,
    TournamentInfo,
} from "../../components/tournament/tournament-info";
import { TournamentRuns } from "../../components/tournament/tournament-runs";
import { TournamentStandings } from "../../components/tournament/tournament-standings";

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
    const [leaderboard, setLeaderboard] = useState(gameTime ? "pbIGT" : "pb");
    const [sort, setSort] = useState("personalBest");

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
    const { lastMessage } = useWebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);

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
                                tournament.eligiblePeriods.length > 0
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
                            <h3>Event leaderboards</h3>
                            <div style={{ marginBottom: "1rem" }}>
                                <select
                                    className={"form-select"}
                                    onChange={(e) => {
                                        setLeaderboard(e.target.value);
                                    }}
                                >
                                    {gameTime && (
                                        <option
                                            key={"pbIGT"}
                                            title={"Tournament PB (IGT)"}
                                            value={"pbIGT"}
                                        >
                                            Tournament PB (loadless)
                                        </option>
                                    )}

                                    <option
                                        key={"pb"}
                                        title={"Tournament PB"}
                                        value={"pb"}
                                    >
                                        Tournament PB
                                    </option>
                                    {qualifierData && (
                                        <option
                                            key={"qualifier"}
                                            title={"Qualifier Leaderboard"}
                                            value={"qualifier"}
                                        >
                                            Qualifier Leaderboard
                                        </option>
                                    )}
                                    {tournament.pointDistribution &&
                                        tournament.pointDistribution.length >
                                            0 && (
                                            <option
                                                key={"points"}
                                                title={"Qualification Points"}
                                                value={"points"}
                                            >
                                                Qualification Points
                                            </option>
                                        )}
                                    <option
                                        key={"attempts"}
                                        title={"Total Attempts"}
                                        value={"attempts"}
                                    >
                                        Total Attempts
                                    </option>
                                    <option
                                        key={"finishedAttempts"}
                                        title={"Total Finished Attempts"}
                                        value={"finishedAttempts"}
                                    >
                                        Total Finished Attempts
                                    </option>

                                    <option
                                        key={"playtime"}
                                        title={"Total Playtime"}
                                        value={"playtime"}
                                    >
                                        Total Playtime
                                    </option>
                                </select>
                            </div>
                            {tournamentLeaderboards && (
                                <span>
                                    {" "}
                                    {leaderboard == "pbIGT" && (
                                        <div>
                                            {getLeaderboard(
                                                "Tournament PB (IGT)",
                                                tournamentLeaderboards.pbLeaderboard,
                                                "",
                                                (stat) => {
                                                    return (
                                                        <DurationToFormatted
                                                            duration={stat.toString()}
                                                        />
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                    {leaderboard == "pb" && (
                                        <div>
                                            {getLeaderboard(
                                                "Personal Best",
                                                tournament.leaderboards
                                                    .pbLeaderboard,
                                                "",
                                                (stat) => {
                                                    return (
                                                        <DurationToFormatted
                                                            duration={stat.toString()}
                                                        />
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                    {tournament.pointDistribution &&
                                        tournament.pointDistribution.length >
                                            0 &&
                                        leaderboard == "points" && (
                                            <div>
                                                {getLeaderboard(
                                                    "Qualification Points",
                                                    tournamentLeaderboards.pbLeaderboard,
                                                    "",
                                                    (stat, key) => {
                                                        if (
                                                            tournament
                                                                .pointDistribution
                                                                ?.length -
                                                                1 <
                                                            key
                                                        )
                                                            return null;

                                                        return tournament
                                                            .pointDistribution[
                                                            key
                                                        ];
                                                    }
                                                )}
                                            </div>
                                        )}
                                    {qualifierData &&
                                        qualifierData.leaderboards &&
                                        leaderboard == "qualifier" && (
                                            <div>
                                                {getLeaderboard(
                                                    "Qualifier PB",
                                                    tournament.gameTime
                                                        ? qualifierData
                                                              .leaderboards
                                                              .gameTime
                                                              .pbLeaderboard
                                                        : qualifierData
                                                              .leaderboards
                                                              .pbLeaderboard,
                                                    "",
                                                    (stat) => {
                                                        return (
                                                            <DurationToFormatted
                                                                duration={stat.toString()}
                                                            />
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                    {leaderboard == "sob" && (
                                        <div>
                                            {getLeaderboard(
                                                "Sum of Bests",
                                                tournamentLeaderboards.sumOfBestsLeaderboard,
                                                "",
                                                (stat) => {
                                                    return (
                                                        <DurationToFormatted
                                                            duration={stat.toString()}
                                                        />
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                    {leaderboard == "attempts" && (
                                        <div>
                                            {getLeaderboard(
                                                "Total Attempts",
                                                tournamentLeaderboards.attemptCountLeaderboard,
                                                "",
                                                (stat) => {
                                                    return stat;
                                                }
                                            )}
                                        </div>
                                    )}
                                    {leaderboard == "finishedAttempts" && (
                                        <div>
                                            {getLeaderboard(
                                                "Finished Attempts",
                                                tournamentLeaderboards.finishedAttemptCountLeaderboard,
                                                "",
                                                (stat) => {
                                                    return stat;
                                                }
                                            )}
                                        </div>
                                    )}
                                    {leaderboard == "playtime" && (
                                        <div>
                                            {getLeaderboard(
                                                "Total Playtime",
                                                tournamentLeaderboards.totalRunTimeLeaderboard,
                                                "",
                                                (stat) => {
                                                    return (
                                                        <DurationToFormatted
                                                            duration={stat.toString()}
                                                        />
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </span>
                            )}
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
                            <Row>
                                {Object.values(updatedLiveDataMap).length ==
                                    0 && (
                                    <div>
                                        Unfortunately, nobody is running live
                                        now...
                                    </div>
                                )}

                                {Object.values(updatedLiveDataMap).map(
                                    (liveRun) => {
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
                                    }
                                )}
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

const liveRunArrayToMap = (
    liveData: LiveRun[],
    sort = "pb",
    leaderboards = null,
    leaderboardsRta = null
) => {
    liveData.sort((a, b) => {
        if (sort === "time") {
            if (a.currentSplitIndex < 0) return 1;
            if (b.currentSplitIndex < 0) return -1;

            const aTime = a.startedAt;
            const bTime = b.startedAt;

            if (!bTime) return 1;
            if (!aTime) return -1;

            if (aTime > bTime) return 1;
            return -1;
        }
        if (sort === "name") {
            if (a.user.toLowerCase() < b.user.toLowerCase()) return -1;
            if (a.user.toLowerCase() == b.user.toLowerCase()) return 0;
            return 1;
        }
        if (sort === "prediction") {
            if (
                !b.currentPrediction ||
                !b.currentTime ||
                parseInt(b.currentPrediction) < 1000 ||
                b.gameData?.finishedAttemptCount < 10
            ) {
                return -1;
            }
            if (
                !a.currentPrediction ||
                !a.currentTime ||
                parseInt(a.currentPrediction) < 1000 ||
                a.gameData?.finishedAttemptCount < 10
            ) {
                return 1;
            }
            if (parseInt(a.currentPrediction) < parseInt(b.currentPrediction))
                return -1;
            return 1;
        }
        if (sort === "personalBest") {
            if (!a.pb) return 1;
            if (!b.pb) return -1;
            if (a.pb < b.pb) return -1;
            if (a.pb == b.pb) return 0;
            return 1;
        }
        if (sort === "tournamentPb" || sort === "pb") {
            if (!leaderboards || !leaderboards.pbLeaderboard) {
                if (a.pb < b.pb) return -1;
                if (a.pb == b.pb) return 0;
                return 1;
            }

            const aUser = a.user;
            const bUser = b.user;

            const aLeaderboardRanking = leaderboards.pbLeaderboard.findIndex(
                (count) => {
                    return count.username == aUser;
                }
            );
            const bLeaderboardRanking = leaderboards.pbLeaderboard.findIndex(
                (count) => {
                    return count.username == bUser;
                }
            );

            if (aLeaderboardRanking < 0 && bLeaderboardRanking < 0) {
                if (!leaderboardsRta || !leaderboardsRta.pbLeaderboard)
                    return 1;

                const newALeaderboardRanking =
                    leaderboardsRta.pbLeaderboard.findIndex((count) => {
                        return count.username == aUser;
                    });
                const newBLeaderboardRanking =
                    leaderboardsRta.pbLeaderboard.findIndex((count) => {
                        return count.username == bUser;
                    });

                if (newBLeaderboardRanking < 0) return -1;
                if (newALeaderboardRanking < 0) return 1;

                if (newALeaderboardRanking < newBLeaderboardRanking) return -1;
                return 1;
            }

            if (bLeaderboardRanking < 0) return -1;
            if (aLeaderboardRanking < 0) return 1;

            if (aLeaderboardRanking < bLeaderboardRanking) return -1;
            return 1;
        }
    });

    const map = {};

    liveData.forEach((l) => {
        const user = l.user.toString();

        map[user] = l;
    });

    return map;
};

export const getServerSideProps = async (context) => {
    return getServerSidePropsGeneric(context);
};

const isLiveDataEligibleForTournament = (
    data: LiveRun,
    tournament: Tournament
): boolean => {
    let eligible = true;

    if (
        !data.game ||
        !data.category ||
        data.game.toLowerCase().trim() !==
            tournament.game?.toLowerCase().trim() ||
        data.category.toLowerCase().trim() !==
            tournament.category?.toLowerCase().trim()
    ) {
        eligible = false;
    }

    if (data.user) {
        const isUserIneligible = tournament.ineligibleUsers?.includes(
            data.user.toLowerCase()
        );
        const isUserEligible = tournament.eligibleUsers?.includes(
            data.user.toLowerCase()
        );

        if (isUserIneligible) {
            eligible = false;
        } else if (
            tournament.eligibleUsers &&
            tournament.eligibleUsers.length > 0 &&
            !isUserEligible
        ) {
            eligible = false;
        }
    }

    return eligible;
};

export const getServerSidePropsGeneric: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    if (!context.params || !context.params.tournament)
        throw new Error("Tournament not found");

    const tournamentName: string = context.params.tournament as string;

    let tab = "live";

    if (context.query && context.query.tab) {
        tab = context.query.tab;
    }

    const tournament: Tournament = await getTournamentByName(
        encodeURIComponent(tournamentName)
    );

    tournament.game = tournament.eligibleRuns[0].game;
    tournament.category = tournament.eligibleRuns[0].category;

    let liveData: LiveRun[] = await getLiveRunsForGameCategory(
        tournament.game,
        tournament.category
    );

    liveData = liveData.filter((data) =>
        isLiveDataEligibleForTournament(data, tournament)
    );

    let tournamentLeaderboards = null;

    if (tournament.leaderboards) {
        tournamentLeaderboards =
            tournament.gameTime && tournament.leaderboards.gameTime
                ? tournament.leaderboards.gameTime
                : tournament.leaderboards;
    }

    return {
        props: {
            liveDataMap: liveRunArrayToMap(
                liveData,
                "pb",
                tournamentLeaderboards
            ),
            tournament,
            tab,
        },
    };
};

export default GenericTournament;
