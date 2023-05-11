import type { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Run, RunSession } from "../common/types";
import { getUserRuns } from "../lib/get-user-runs";
import { UserOverview } from "../components/run/user-detail/user-overview";
import { Col, Row, Tab, Tabs } from "react-bootstrap";
import { SessionOverview } from "../components/run/user-detail/session-overview";
import { UserStats } from "../components/run/user-detail/user-stats";
import React, { useEffect, useReducer, useState } from "react";
import { GametimeForm } from "../components/gametime/gametime-form";
import Link from "next/link";
import styles from "../components/css/User.module.scss";
import { getGameGlobal } from "../components/game/get-game";
import { Userform } from "../components/user/userform";
import { getGlobalUser } from "../lib/get-global-user";
import { HighlightedRun } from "../components/run/dashboard/highlighted-run";
import { GlobalGameData } from "./[username]/[game]/[run]";
import { getLiveRunForUser } from "../lib/live-runs";
import {
    LiveIcon,
    LiveRun,
    LiveUserRun,
} from "../components/live/live-user-run";
import useWebSocket from "react-use-websocket";
import Stats from "../components/user/stats";
import { TwitchEmbed } from "../vendor/react-twitch-embed/dist/index";

export interface UserPageProps {
    runs: Run[];
    username: string;
    sessions: RunSession[];
    hasGameTime: boolean;
    gameTimeSessions?: RunSession[] | null;
    defaultGameTime: boolean;
    session: any;
    userData: any;
    allGlobalGameData: GlobalGameData[];
    liveData?: LiveRun;
}

const User = ({
    runs,
    username,
    userData,
    hasGameTime,
    defaultGameTime,
    session,
    allGlobalGameData,
    liveData,
}: UserPageProps) => {
    const [useGameTime, setUseGameTime] = useState(
        hasGameTime && defaultGameTime
    );
    const [currentGame, setCurrentGame] = useState("all-games");
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const [liveRun, setLiveRun] = useState(liveData);

    const { lastMessage } = useWebSocket(
        `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}?username=${username}`
    );

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

    if (runs.length === 0) return NoRuns(username, session, userData);

    runs.sort((a, b) => {
        if (a.highlighted && b.highlighted) {
            return 0;
        }
        if (a.highlighted) {
            return -1;
        }
        if (b.highlighted) {
            return 1;
        }
        return 0;
    });

    const currentRuns =
        currentGame === "all-games"
            ? runs
            : filterRunsByGame(runs, currentGame);

    const runMap = getRunmap(currentRuns);

    let highlightedRun = currentRuns.find((run) => run.highlighted && run.vod);
    if (!highlightedRun)
        highlightedRun = currentRuns.find((run) => run.highlighted);

    const allRunsRunMap = getRunmap(runs);

    const sessions: RunSession[] = prepareSessions(currentRuns, false);
    const gameTimeSessions = hasGameTime
        ? prepareSessions(currentRuns, true)
        : null;

    return (
        <>
            <Row style={{ marginBottom: "1rem" }}>
                <Col md={12} lg={9}>
                    <Userform
                        username={username}
                        session={session}
                        userData={userData}
                    />
                </Col>
                {hasGameTime && (
                    <Col md={12} lg={3} className={styles.gameTimeForm}>
                        <GametimeForm
                            useGameTime={useGameTime}
                            setUseGameTime={setUseGameTime}
                        />
                    </Col>
                )}
            </Row>
            <div style={{ position: "relative" }}>
                {allRunsRunMap.size > 1 && (
                    <Row className={styles.filterRow}>
                        <Col className={`col-md-8 ${styles.filterMargin}`} />
                        <Col className={"col-md-4"}>
                            <select
                                className={"form-select"}
                                onChange={(e) => {
                                    setCurrentGame(
                                        e.target.value.split("#")[0]
                                    );
                                }}
                            >
                                <option
                                    key={"all-games"}
                                    title={"All Games"}
                                    value={"all-games"}
                                >
                                    No Game Filter
                                </option>
                                {Array.from(allRunsRunMap.keys())
                                    .filter(
                                        (game: string, i, arr: string[]) => {
                                            if (i === 0) return true;

                                            const previous = arr[i - 1];

                                            return (
                                                game.split("#")[0] !==
                                                previous.split("#")[0]
                                            );
                                        }
                                    )
                                    .map((game: string) => {
                                        return (
                                            <option key={game} value={game}>
                                                {game.split("#")[0]}
                                            </option>
                                        );
                                    })}
                            </select>
                        </Col>
                    </Row>
                )}
                {/*</div>*/}
                <Tabs
                    defaultActiveKey="overview"
                    className={`mb-3${
                        allRunsRunMap.size > 1 ? " with-filter" : ""
                    }`}
                    style={{ position: "relative", zIndex: 1 }}
                >
                    <Tab eventKey="overview" title="Overview">
                        <Row>
                            <Col xl={8} lg={12}>
                                <UserOverview
                                    runs={runMap}
                                    username={username}
                                    gameTime={useGameTime}
                                    session={session}
                                    allGlobalGameData={allGlobalGameData}
                                    parentForceUpdate={forceUpdate}
                                />
                            </Col>
                            <Col xl={4} lg={12}>
                                {!!liveRun && !Array.isArray(liveRun) && (
                                    <div style={{ marginBottom: "1rem" }}>
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
                                                <LiveUserRun
                                                    liveRun={liveRun}
                                                />
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <UserStats runs={currentRuns} />
                                {highlightedRun && (
                                    <HighlightedRun run={highlightedRun} />
                                )}
                            </Col>
                        </Row>
                    </Tab>

                    <Tab title={"Activity"} eventKey={"stats"}>
                        <Row>
                            <Col>
                                <Stats username={username} />
                            </Col>
                        </Row>
                    </Tab>
                    <Tab title={"Sessions"} eventKey={"sessions"}>
                        <Row>
                            <Col>
                                <h2>Speedrun Sessions</h2>
                                <SessionOverview
                                    sessions={
                                        hasGameTime &&
                                        useGameTime &&
                                        gameTimeSessions
                                            ? gameTimeSessions
                                            : sessions
                                    }
                                />
                            </Col>
                        </Row>
                    </Tab>
                    <Tab
                        title={"Twitch stream"}
                        eventKey={"stream"}
                        style={{ minHeight: "800px" }}
                    >
                        <h2>Twitch stream</h2>

                        <TwitchEmbed
                            channel={username}
                            width={"100%"}
                            height={"800px"}
                            muted
                            withChat={true}
                        />
                    </Tab>
                </Tabs>
            </div>
        </>
    );
};

const NoRuns = (username: string, session: any, userData: any) => {
    return (
        <>
            <Userform
                username={username}
                session={session}
                userData={userData}
            />
            <hr />
            <div>
                Unfortunately, {username} has not uploaded runs yet, or their
                upload has not yet been processed (should not take long). If the
                user has uploaded runs, but this page still shows, please{" "}
                <Link href={"/contact"}>contact me!</Link>
            </div>
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    if (!context.params || !context.params.username)
        throw new Error("Username not found");

    const username: string = context.params.username as string;
    const runs = await getUserRuns(username);

    const allRunsRunMap = getRunmap(runs);

    const promises = Array.from(allRunsRunMap.keys()).map((game) => {
        game = game.split("#")[0];
        return getGameGlobal(game);
    });

    const allGlobalGameData = await Promise.all(promises);
    const userData = await getGlobalUser(username);

    const hasGameTime = !!runs.find((run) => run.hasGameTime);

    let defaultGameTime = hasGameTime;

    if (defaultGameTime) {
        defaultGameTime = !!runs.find((run) => {
            const thisGlobalGameData = allGlobalGameData.find(
                (value: GlobalGameData) => {
                    return value.display === run.game;
                }
            );

            return (
                run.hasGameTime &&
                !!thisGlobalGameData &&
                !thisGlobalGameData.forceRealTime
            );
        });
    }

    const liveData = await getLiveRunForUser(username);

    return {
        props: {
            runs,
            username,
            userData,
            hasGameTime,
            defaultGameTime,
            allGlobalGameData,
            liveData,
        },
    };
};

const filterRunsByGame = (runs: Run[], game: string): Run[] => {
    return runs.filter((run) => run.game === game);
};

const getRunmap = (runs: Run[]) => {
    const runMap: Map<string, Run[]> = new Map();
    const uniqueVariantCount: Map<string, string[]> = new Map();

    if (!runs) return runMap;

    runs.filter((run) => !!run.game).forEach((run: Run) => {
        const variants: string[] = [];

        if (run.platform) {
            variants.push(`Platform:${run.platform}`);
        }

        if (run.emulator) {
            variants.push("Uses Emulator: Yes");
        }

        if (run.gameregion) {
            variants.push(`Region:${run.gameregion}`);
        }

        if (run.variables) {
            Object.entries(run.variables).forEach(([k, v]) => {
                variants.push(`${k}:${v}`);
            });
        }

        let runName = run.game;

        if (variants.length > 0) {
            runName += `#${variants.join("#")}`;

            if (!uniqueVariantCount.has(run.game)) {
                uniqueVariantCount.set(run.game, []);
            }

            const count = uniqueVariantCount.get(run.game);
            count.push(runName);
            uniqueVariantCount.set(run.game, count);
        }

        if (!runMap.has(runName)) {
            runMap.set(runName, []);
        }

        const map = runMap.get(runName) as Run[];
        map.push(run);
        runMap.set(runName, map);
    });

    uniqueVariantCount.forEach((variants, game) => {
        if (variants.length !== 1) return;

        if (!runMap.has(game)) return;

        const variantName = variants[0];

        const currentVariantRuns = runMap.get(variantName);

        runMap.get(game).forEach((run) => {
            currentVariantRuns.push(run);
        });

        runMap.set(variantName, currentVariantRuns);
        runMap.delete(game);
    });

    const sortedRunMap = new Map(
        [...runMap].sort((a, b) => {
            const aHasHighlighted = a[1].find((run) => run.highlighted);
            const bHasHighlighted = b[1].find((run) => run.highlighted);

            if (aHasHighlighted && bHasHighlighted) {
                if (a[0] == b[0]) return 0;
                return a[0] > b[0] ? 1 : -1;
            }
            if (aHasHighlighted) {
                return -1;
            }
            if (bHasHighlighted) {
                return 1;
            }
            return 0;
        })
    );

    sortedRunMap.forEach((values, key) => {
        values.sort((a, b) => {
            if (a.highlighted && b.highlighted) {
                return a.run > b.run ? 1 : -1;
            }
            if (a.highlighted) {
                return -1;
            }
            if (b.highlighted) {
                return 1;
            }
            return 0;
        });

        sortedRunMap.set(key, values);
    });

    return sortedRunMap;
};

const prepareSessions = (runs: Run[], gametime: boolean): RunSession[] => {
    const sessions: RunSession[] = [];

    runs.forEach((run) => {
        const currentSessions =
            gametime && run.gameTimeData?.sessions
                ? run.gameTimeData.sessions
                : run.sessions;
        currentSessions.forEach((session) => {
            session.gameTime = gametime && !!run.gameTimeData?.sessions;
            session.game = `${run.game} - ${run.run}`;
            sessions.push(session);
        });
    });

    sessions.sort((a, b) => (a.endedAt > b.endedAt ? -1 : 1));

    return sessions.slice(0, 10);
};
export default User;
