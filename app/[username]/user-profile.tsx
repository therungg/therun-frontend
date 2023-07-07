"use client";

import { Run, RunSession } from "~src/common/types";
import { UserOverview } from "~src/components/run/user-detail/user-overview";
import { Col, Row, Tab, Tabs } from "react-bootstrap";
import { SessionOverview } from "~src/components/run/user-detail/session-overview";
import { UserStats } from "~src/components/run/user-detail/user-stats";
import React, { useEffect, useReducer, useState } from "react";
import { GametimeForm } from "~src/components/gametime/gametime-form";
import Link from "next/link";
import styles from "~src/components/css/User.module.scss";
import { Userform } from "~src/components/user/userform";
import { HighlightedRun } from "~src/components/run/dashboard/highlighted-run";
import { LiveIcon, LiveUserRun } from "~src/components/live/live-user-run";
import Stats from "~src/components/user/stats";
import { TwitchEmbed } from "~src/vendor/react-twitch-embed/dist/index";
import { useReconnectWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import { LiveRun } from "~app/live/live.types";
import { getRunmap } from "~app/[username]/runmap.component";
import { prepareSessions } from "~app/[username]/prepare-sessions.component";
import { GlobalGameData } from "~src/pages/[username]/[game]/[run]";

export interface UserPageProps {
    runs: Run[];
    username: string;
    hasGameTime: boolean;
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
                                                    isUrl={true}
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

const filterRunsByGame = (runs: Run[], game: string): Run[] => {
    return runs.filter((run) => run.game === game);
};

export default User;
