import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { AppContext } from "../../../common/app.context";
import { getRun } from "../../../lib/get-run";
import {
    Run,
    RunHistory,
    RunSession,
    SplitsHistory,
} from "../../../common/types";
import { Title } from "../../../components/title";
import { getSplitsHistoryUrl } from "../../../lib/get-splits-history";
import { Col, Row, Tab, Tabs } from "react-bootstrap";
import { RecentRuns } from "../../../components/run/dashboard/recent-runs";
import { Splits } from "../../../components/run/dashboard/splits";
import { Stats } from "../../../components/run/dashboard/stats";
import { History } from "../../../components/run/history/history";
import { AppProps } from "next/app";
import { Activity } from "../../../components/run/dashboard/activity";
import { GameSessions } from "../../../components/run/run-sessions/game-sessions";
import { SplitStats } from "../../../components/run/splits/split-stats";
import { UserGameLink, UserLink } from "../../../components/links/links";
import { GametimeForm } from "../../../components/gametime/gametime-form";
import { CompareSplits } from "../../../components/run/compare/compare-splits";
import { StatsData } from "~app/games/[game]/game.types";
import styles from "../../../components/css/User.module.scss";
import { getGameGlobal } from "../../../components/game/get-game";
import { Vod } from "../../../components/run/dashboard/vod";
import { Golds } from "../../../components/run/dashboard/golds";
import Timesaves from "../../../components/run/dashboard/timesaves";
import { LiveIcon, LiveUserRun } from "../../../components/live/live-user-run";
import { getLiveRunForUser } from "../../../lib/live-runs";
import { useReconnectWebsocket } from "../../../components/websocket/use-reconnect-websocket";
import { LiveRun } from "~app/live/live.types";

interface RunPageProps extends AppProps {
    run: Run;
    username: string;
    game: string;
    runName: string;
    realTimeRuns: Runs;
    globalGameData: GlobalGameData;
    gameTimeRuns?: Runs;
    liveData: LiveRun;
}

export interface Runs {
    runs: RunHistory[];
    splits: SplitsHistory[];
    sessions: RunSession[];
}

export interface GlobalGameData {
    forceRealTime?: boolean;
    image?: string;
    game: string;
    display: string;
}

const RunPage = ({
    run,
    username,
    game,
    runName,
    globalGameData,
    liveData,
}: RunPageProps) => {
    const { baseUrl } = React.useContext(AppContext);
    const forceRealTime = !!globalGameData.forceRealTime;

    const [useGameTime, setUseGameTime] = useState(
        run.hasGameTime &&
            !!run.gameTimeData &&
            run.gameTimeData.personalBest &&
            parseInt(run.gameTimeData.personalBest) &&
            !forceRealTime
    );
    const [gameData, setGameData] = useState(null);
    const [dataLoading, setDataLoading] = useState(false);

    const [realTimeRuns, setRealTimeRuns] = useState(null);
    const [gameTimeRuns, setGameTimeRuns] = useState(null);
    const [liveRun, setLiveRun] = useState(liveData);

    const lastMessage = useReconnectWebsocket(username);

    useEffect(() => {
        if (lastMessage !== null) {
            const data = JSON.parse(lastMessage.data);
            if (data.type === "UPDATE") {
                setLiveRun(JSON.parse(lastMessage.data).run);
            }

            if (data.type === "DELETE") {
                setLiveRun([]);
            }
        }
    }, [lastMessage]);

    const router = useRouter();
    const tab = router.query.tab || "dashboard";

    runName = run.run;

    const loadCompare = async () => {
        const gameName = encodeURIComponent(run.game);

        const url = `${baseUrl}/api/games/${gameName}`;
        const gamesData: StatsData = await (
            await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
        ).json();

        setGameData(gamesData as any);
    };

    useEffect(() => {
        if (!realTimeRuns && !dataLoading) {
            const fetchSplitsData = async (gameTime: boolean) => {
                const url = getSplitsHistoryUrl(run.historyFilename, gameTime);

                const res = await fetch(url, { mode: "cors" });
                const data = await res.json();

                if (gameTime) {
                    setGameTimeRuns(data);
                    setDataLoading(false);
                } else {
                    setRealTimeRuns(data);
                    if (!useGameTime) {
                        setDataLoading(false);
                    }
                }
            };

            setDataLoading(true);
            fetchSplitsData(false);
            if (run.hasGameTime) fetchSplitsData(true);
        }
    }, [
        dataLoading,
        realTimeRuns,
        run.hasGameTime,
        run.historyFilename,
        useGameTime,
        gameData,
        tab,
    ]);

    if (!dataLoading && !realTimeRuns) {
        return <>You should not see this</>;
    }

    if (dataLoading) {
        return <>Loading data, should not take long...</>;
    }

    const { runs, splits, sessions } = useGameTime
        ? (gameTimeRuns as Runs)
        : (realTimeRuns as Runs);

    // This implementation of the variables is pretty ugly. Should refactor code + UI
    const varsMap: { [key: string]: string } = {};

    if (run.platform) varsMap["Platform"] = run.platform;
    if (run.gameregion) varsMap["Region"] = run.gameregion;
    if (run.emulator) varsMap["Uses Emulator"] = "Yes";

    if (run.variables) {
        Object.entries(run.variables).forEach(([a, b]) => {
            varsMap[a] = b;
        });
    }

    let vars = Object.entries(varsMap);

    vars = vars.filter((variable) => variable[0] !== "Verified");

    return (
        <>
            <Row>
                <Col xl={9} className={styles.title}>
                    <Title>
                        <UserGameLink game={game} username={username} /> -{" "}
                        {runName} by <UserLink username={username} />
                    </Title>
                    <i>{run.description}</i>

                    {vars.length > 0 && (
                        <small
                            style={{ display: "flex", marginBottom: "0.3rem" }}
                        >
                            <Row style={{ width: "100%" }}>
                                {vars.map(([k, v]) => {
                                    let xl = 12;

                                    switch (vars.length) {
                                        case 6:
                                            xl = 4;
                                            break;
                                        case 5:
                                            xl = 4;
                                            break;
                                        case 4:
                                            xl = 3;
                                            break;
                                        case 3:
                                            xl = 4;
                                            break;
                                        case 2:
                                            xl = 3;
                                            break;
                                    }

                                    return (
                                        <Col xl={xl} key={k}>
                                            <i>{k}</i>:{" "}
                                            <b style={{ fontSize: "0.95rem" }}>
                                                {v}
                                            </b>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </small>
                    )}
                </Col>
                {run.hasGameTime && (
                    <Col
                        className={"col-xl-3"}
                        style={{ alignSelf: "flex-end", whiteSpace: "nowrap" }}
                    >
                        <GametimeForm
                            useGameTime={useGameTime}
                            setUseGameTime={setUseGameTime}
                        />
                    </Col>
                )}
            </Row>

            {!!liveRun && !Array.isArray(liveRun) && (
                <div style={{ marginBottom: "1rem", maxWidth: "550px" }}>
                    <h2>
                        Currently Live!&nbsp;
                        <a href={"/live"}>
                            <LiveIcon />
                        </a>
                    </h2>

                    <div>
                        <a
                            href={`/live/${username}`}
                            className={"link-without-style"}
                        >
                            <LiveUserRun liveRun={liveRun} isUrl={true} />
                        </a>
                    </div>
                </div>
            )}

            <Tabs
                defaultActiveKey={tab}
                className="mb-3"
                onSelect={async (e) => {
                    if (e !== "compare" || !!gameData) return;

                    await loadCompare();
                }}
            >
                <Tab eventKey="dashboard" title="Dashboard">
                    <Row>
                        <Col className={"col-xl-8"}>
                            <Splits
                                splits={splits}
                                gameTime={useGameTime}
                                run={run}
                            />
                        </Col>
                        <Col className={"col-xl-4"}>
                            <Stats run={run} gameTime={useGameTime} />
                            <hr />
                            <RecentRuns
                                history={runs}
                                pb={
                                    useGameTime
                                        ? run.gameTimeData?.personalBest
                                        : run.personalBest
                                }
                            />
                            <hr />
                            <Activity history={runs} splits={splits} />
                        </Col>
                    </Row>
                </Tab>
                <Tab eventKey="splits_stats" title="Splits Stats">
                    <Row>
                        <Col className={"col-12"}>
                            <SplitStats
                                history={runs}
                                splits={splits}
                                gameTime={useGameTime}
                            />
                        </Col>
                    </Row>
                </Tab>
                <Tab eventKey="sessions" title="Sessions">
                    <Row>
                        <Col className={"col-12"}>
                            <GameSessions
                                sessions={sessions}
                                runs={runs}
                                splits={splits}
                                gameTime={useGameTime}
                            />
                        </Col>
                    </Row>
                </Tab>
                <Tab eventKey="runs" title="Runs">
                    <History history={runs} splits={splits} />
                </Tab>
                <Tab eventKey="golds" title="Golds">
                    <Golds history={runs} splits={splits} />
                </Tab>
                <Tab eventKey="timesaves" title="Timesaves">
                    <Timesaves history={runs} splits={splits} />
                </Tab>
                <Tab eventKey="compare" title={"Compare splits"}>
                    {gameData ? (
                        <CompareSplits
                            statsData={gameData}
                            category={run.run}
                            username={username}
                            splits={splits}
                            run={run}
                            runs={runs}
                            gameTime={useGameTime as boolean}
                        />
                    ) : (
                        "Loading Game Data..."
                    )}
                </Tab>
                {run.vod && (
                    <Tab
                        eventKey="vod"
                        title={"Video"}
                        className={styles.video}
                    >
                        {run.vod && (
                            <Vod vod={run.vod} width={"100%"} height={"100%"} />
                        )}
                    </Tab>
                )}
            </Tabs>
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    if (
        !context.params ||
        !context.params.username ||
        !context.params.game ||
        !context.params.run
    )
        throw new Error("Params not found");

    const username: string = context.params.username as string;
    const game: string = context.params.game as string;
    const runName: string = context.params.run as string;

    const promises = [getRun(username, game, runName), getGameGlobal(game)];

    const [run, globalGameData] = await Promise.all(promises);

    if (!run) throw new Error("Could not find run");

    const liveData = await getLiveRunForUser(username);

    return {
        props: { run, username, game, runName, globalGameData, liveData },
    };
};

export default RunPage;
