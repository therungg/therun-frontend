'use client';

import Link from 'next/link';
import React, { useEffect, useReducer, useState } from 'react';
import { Col, Row, Tab, Tabs } from 'react-bootstrap';
import { TwitchEmbed } from 'react-twitch-embed';
import type { User as IUser, User } from 'types/session.types';
import { GlobalGameData } from '~app/(old-layout)/[username]/[game]/[run]/run';
import { prepareSessions } from '~app/(old-layout)/[username]/prepare-sessions.component';
import { getRunmap } from '~app/(old-layout)/[username]/runmap.component';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import { UserStats as UserRaceStats } from '~app/(old-layout)/races/races.types';
import { Run, RunSession } from '~src/common/types';
import { GametimeForm } from '~src/components/gametime/gametime-form';
import { LiveIcon, LiveUserRun } from '~src/components/live/live-user-run';
import { HighlightedRun } from '~src/components/run/dashboard/highlighted-run';
import { SessionOverview } from '~src/components/run/user-detail/session-overview';
import { UserOverview } from '~src/components/run/user-detail/user-overview';
import { UserRaceStatsTable } from '~src/components/run/user-detail/user-race-stats';
import { UserStats } from '~src/components/run/user-detail/user-stats';
import Stats from '~src/components/user/stats';
import { Userform } from '~src/components/user/userform';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import type { UserData } from '~src/lib/get-session-data';

export interface UserPageProps {
    runs: Run[];
    username: string;
    hasGameTime: boolean;
    defaultGameTime: boolean;
    session: IUser;
    userData: UserData;
    allGlobalGameData: GlobalGameData[];
    liveData?: LiveRun;
    raceStats?: UserRaceStats;
}

export const UserProfile = ({
    runs,
    username,
    userData,
    hasGameTime,
    defaultGameTime,
    session,
    allGlobalGameData,
    liveData,
    raceStats,
}: UserPageProps) => {
    const [useGameTime, setUseGameTime] = useState(
        hasGameTime && defaultGameTime,
    );
    const [currentGame, setCurrentGame] = useState('all-games');
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const [liveRun, setLiveRun] = useState(liveData);

    const lastMessage = useLiveRunsWebsocket(username);

    useEffect(() => {
        if (lastMessage !== null) {
            if (lastMessage.type === 'UPDATE') {
                setLiveRun(lastMessage.run);
            }

            if (lastMessage.type === 'DELETE') {
                setLiveRun(undefined);
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
        currentGame === 'all-games'
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
            <Row className="mb-3">
                <Col md={12} lg={9}>
                    <Userform
                        username={username}
                        session={session}
                        userData={userData}
                    />
                </Col>
                {hasGameTime && (
                    <Col
                        md={12}
                        lg={3}
                        className="d-flex mt-4 mt-md-0 justify-content-md-end"
                    >
                        <GametimeForm
                            useGameTime={useGameTime}
                            setUseGameTime={setUseGameTime}
                        />
                    </Col>
                )}
            </Row>
            {allRunsRunMap.size > 1 && (
                <Row>
                    <Col md={8} />
                    <Col
                        xs={12}
                        md={4}
                        className="my-3 my-md-0 game-filter-mb game-filter-mw"
                    >
                        <select
                            className="form-select"
                            onChange={(e) => {
                                setCurrentGame(e.target.value.split('#')[0]);
                            }}
                        >
                            <option
                                key="all-games"
                                title="All Games"
                                value="all-games"
                            >
                                No Game Filter
                            </option>
                            {Array.from(allRunsRunMap.keys())
                                .filter((game: string, i, arr: string[]) => {
                                    if (i === 0) return true;

                                    const previous = arr[i - 1];

                                    return (
                                        game.split('#')[0] !==
                                        previous.split('#')[0]
                                    );
                                })
                                .map((game: string) => {
                                    return (
                                        <option key={game} value={game}>
                                            {game.split('#')[0]}
                                        </option>
                                    );
                                })}
                        </select>
                    </Col>
                </Row>
            )}
            <Tabs
                defaultActiveKey="overview"
                className={`position-relative z-1 mb-3 pt-0 w-100 mw-md-66${
                    allRunsRunMap.size > 1 ? ' with-filter' : ''
                }`}
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
                                <div className="mb-3">
                                    <h2>
                                        Currently Live!&nbsp;
                                        <Link href="/live" prefetch={false}>
                                            <LiveIcon />
                                        </Link>
                                    </h2>

                                    <div>
                                        <a
                                            href={`/live/${username}`}
                                            className="link-without-style"
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
                            {raceStats && (
                                <div>
                                    <span className="justify-content-between d-flex">
                                        <div className="d-flex">
                                            <h2>Races</h2>
                                            <span
                                                style={{
                                                    color: 'var(--bs-gold)',
                                                }}
                                                className="ms-2"
                                            >
                                                New!
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            <a href={`${username}/races`}>
                                                User Race Profile
                                            </a>
                                        </div>
                                    </span>
                                    <UserRaceStatsTable raceStats={raceStats} />
                                </div>
                            )}
                            {highlightedRun && (
                                <HighlightedRun run={highlightedRun} />
                            )}
                        </Col>
                    </Row>
                </Tab>

                <Tab title="Activity" eventKey="stats">
                    <Row>
                        <Col>
                            <Stats username={username} />
                        </Col>
                    </Row>
                </Tab>
                <Tab title="Sessions" eventKey="sessions">
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
                <Tab title="Twitch stream" eventKey="stream">
                    <h2>Twitch stream</h2>

                    <TwitchEmbed
                        channel={username}
                        width="100%"
                        height="800px"
                        muted
                        withChat={true}
                    />
                </Tab>
            </Tabs>
        </>
    );
};

const NoRuns = (username: string, session: User, userData: UserData) => {
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
                user has uploaded runs, but this page still shows, please{' '}
                <Link href="/contact" prefetch={false}>
                    contact me!
                </Link>
            </div>
        </>
    );
};

const filterRunsByGame = (runs: Run[], game: string): Run[] => {
    return runs.filter((run) => run.game === game);
};
