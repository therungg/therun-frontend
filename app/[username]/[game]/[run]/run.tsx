"use client";
import { Run, RunHistory, RunSession, SplitsHistory } from "~src/common/types";
import { LiveRun } from "~app/live/live.types";
import React, { useEffect, useState } from "react";
import { AppContext } from "~src/common/app.context";
import { useLiveRunsWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { StatsData } from "~app/games/[game]/game.types";
import { getSplitsHistoryUrl } from "~src/lib/get-splits-history";
import { Col, Row, Tab, Tabs } from "react-bootstrap";
import { Title } from "~src/components/title";
import { UserGameLink, UserLink } from "~src/components/links/links";
import { GametimeForm } from "~src/components/gametime/gametime-form";
import { LiveIcon, LiveUserRun } from "~src/components/live/live-user-run";
import { Splits } from "~src/components/run/dashboard/splits";
import { Stats } from "~src/components/run/dashboard/stats";
import { RecentRuns } from "~src/components/run/dashboard/recent-runs";
import { Activity } from "~src/components/run/dashboard/activity";
import { SplitStats } from "~src/components/run/splits/split-stats";
import { GameSessions } from "~src/components/run/run-sessions/game-sessions";
import { History } from "~src/components/run/history/history";
import TimeSaves from "~src/components/run/dashboard/timesaves";
import { CompareSplits } from "~src/components/run/compare/compare-splits";
import { Vod } from "~src/components/run/dashboard/vod";
import Golds from "~src/components/run/dashboard/golds";
import { safeEncodeURI } from "~src/utils/uri";
import Link from "next/link";

interface RunPageProps {
    run: Run;
    username: string;
    game: string;
    runName: string;
    globalGameData: GlobalGameData;
    liveData: LiveRun;
    tab?: string;
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

export default function RunDetail({
    run,
    username,
    runName,
    globalGameData,
    liveData,
    tab = "dashboard",
}: RunPageProps) {
    const { baseUrl } = React.useContext(AppContext);
    const forceRealTime = !!globalGameData.forceRealTime;

    const [useGameTime, setUseGameTime] = useState(
        !!(
            run.hasGameTime &&
            !!run.gameTimeData &&
            Number.isFinite(parseFloat(run.gameTimeData.personalBest)) &&
            !forceRealTime
        ),
    );
    const [gameData, setGameData] = useState<StatsData | null>(null);
    const [dataLoading, setDataLoading] = useState(false);

    const [realTimeRuns, setRealTimeRuns] = useState<Runs | null>(null);
    const [gameTimeRuns, setGameTimeRuns] = useState<Runs | null>(null);
    const [liveRun, setLiveRun] = useState<LiveRun | null>(liveData);

    const lastMessage = useLiveRunsWebsocket(username);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === "UPDATE") {
                setLiveRun(lastMessage.run);
            }

            if (lastMessage.type === "DELETE") {
                setLiveRun(null);
            }
        }
    }, [lastMessage]);

    runName = run.run;

    const loadCompare = async () => {
        const gameName = safeEncodeURI(run.game);

        const url = `${baseUrl}/api/games/${gameName}`;
        const gamesData: StatsData = await (
            await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })
        ).json();

        setGameData(gamesData);
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
        return <>Loading data, should not take long...</>;
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
                <Col xl={9}>
                    <Title>
                        <UserGameLink game={run.game} username={username} /> -{" "}
                        {runName} by <UserLink username={username} />
                    </Title>
                    <i>{run.description}</i>

                    {vars.length > 0 && (
                        <small className="d-flex mb-1">
                            <Row className="w-100">
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
                                            <b className="fs-15p">{v}</b>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </small>
                    )}
                </Col>
                {run.hasGameTime && (
                    <Col xl={3} className="align-self-end text-nowrap">
                        <GametimeForm
                            useGameTime={useGameTime}
                            setUseGameTime={setUseGameTime}
                        />
                    </Col>
                )}
            </Row>

            {!!liveRun && !Array.isArray(liveRun) && (
                <div className="mb-3 mw-550p">
                    <h2>
                        Currently Live!&nbsp;
                        <Link href="/live">
                            <LiveIcon />
                        </Link>
                    </h2>

                    <div>
                        <a
                            href={`/live/${username}`}
                            className="link-without-style"
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
                        <Col xl={8}>
                            <Splits
                                splits={splits}
                                gameTime={useGameTime}
                                run={run}
                            />
                        </Col>
                        <Col xl={4}>
                            <Stats run={run} gameTime={useGameTime} />
                            <hr />
                            <RecentRuns
                                history={runs}
                                pb={
                                    (useGameTime
                                        ? run.gameTimeData?.personalBest
                                        : run.personalBest) || ""
                                }
                            />
                            <hr />
                            <Activity history={runs} splits={splits} />
                        </Col>
                    </Row>
                </Tab>
                <Tab eventKey="splits_stats" title="Splits Stats">
                    <Row>
                        <Col xs={12}>
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
                        <Col xs={12}>
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
                    <TimeSaves history={runs} splits={splits} />
                </Tab>
                <Tab eventKey="compare" title="Compare splits">
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
                        title="Video"
                        className="ratio ratio-16x9"
                    >
                        {run.vod && <Vod vod={run.vod} />}
                    </Tab>
                )}
            </Tabs>
        </>
    );
}
