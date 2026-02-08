'use client';

import Link from 'next/link';
import { useEffect, useReducer, useState } from 'react';
import type { User as IUser, User } from 'types/session.types';
import { GlobalGameData } from '~app/(old-layout)/[username]/[game]/[run]/run';
import { prepareSessions } from '~app/(old-layout)/[username]/prepare-sessions.component';
import { getRunmap } from '~app/(old-layout)/[username]/runmap.component';
import { LiveRun } from '~app/(old-layout)/live/live.types';
import {
    Race,
    RaceParticipant,
    UserStats as RaceUserStats,
    UserStats as UserRaceStats,
} from '~app/(old-layout)/races/races.types';
import { Run, RunSession } from '~src/common/types';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import type { UserData } from '~src/lib/get-session-data';
import { ActivityTab } from './components/activity-tab';
import { OverviewTab } from './components/overview-tab';
import { ProfileEditModal } from './components/profile-edit-modal';
import { ProfileHero } from './components/profile-hero';
import { ProfileTabs } from './components/profile-tabs';
import { RacesTab } from './components/races-tab';
import { StreamTab } from './components/stream-tab';

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
    detailedRaceStats?: RaceUserStats;
    raceParticipations?: RaceParticipant[];
    initialRaces?: Race[];
    categoryStatsMap?: RaceUserStats[][];
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
    detailedRaceStats,
    raceParticipations,
    initialRaces,
    categoryStatsMap,
}: UserPageProps) => {
    const [useGameTime, setUseGameTime] = useState(
        hasGameTime && defaultGameTime,
    );
    const [currentGame, setCurrentGame] = useState('all-games');
    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
    const [liveRun, setLiveRun] = useState(liveData);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEditModal, setShowEditModal] = useState(false);

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

    if (runs.length === 0)
        return (
            <NoRuns
                username={username}
                session={session}
                userData={userData}
                onEditClick={() => setShowEditModal(true)}
                showEditModal={showEditModal}
                onHideEditModal={() => setShowEditModal(false)}
            />
        );

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

    const uniqueGames = Array.from(allRunsRunMap.keys()).filter(
        (game: string, i, arr: string[]) => {
            if (i === 0) return true;
            const previous = arr[i - 1];
            return game.split('#')[0] !== previous.split('#')[0];
        },
    );

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'activity', label: 'Activity' },
        { key: 'races', label: 'Races' },
        { key: 'stream', label: 'Stream' },
    ];

    return (
        <>
            <ProfileHero
                username={username}
                userData={userData}
                runs={runs}
                liveRun={liveRun}
                raceStats={raceStats}
                session={session}
                onEditClick={() => setShowEditModal(true)}
            />

            <ProfileTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={tabs}
                hasGameTime={hasGameTime}
                useGameTime={useGameTime}
                setUseGameTime={setUseGameTime}
                gameCount={allRunsRunMap.size}
                games={uniqueGames}
                currentGame={currentGame}
                setCurrentGame={setCurrentGame}
            />

            {activeTab === 'overview' && (
                <OverviewTab
                    runs={runMap}
                    currentRuns={currentRuns}
                    username={username}
                    session={session}
                    useGameTime={useGameTime}
                    allGlobalGameData={allGlobalGameData}
                    liveRun={liveRun}
                    raceStats={raceStats}
                    highlightedRun={highlightedRun}
                    parentForceUpdate={forceUpdate}
                />
            )}

            {activeTab === 'activity' && (
                <ActivityTab
                    username={username}
                    sessions={
                        hasGameTime && useGameTime && gameTimeSessions
                            ? gameTimeSessions
                            : sessions
                    }
                    useGameTime={useGameTime}
                />
            )}

            {activeTab === 'races' && detailedRaceStats && (
                <RacesTab
                    username={username}
                    globalStats={detailedRaceStats}
                    categoryStatsMap={categoryStatsMap || []}
                    participations={raceParticipations || []}
                    initialRaces={initialRaces || []}
                />
            )}

            {activeTab === 'stream' && <StreamTab username={username} />}

            <ProfileEditModal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                username={username}
                session={session}
                userData={userData}
            />
        </>
    );
};

const NoRuns = ({
    username,
    session,
    userData,
    onEditClick,
    showEditModal,
    onHideEditModal,
}: {
    username: string;
    session: User;
    userData: UserData;
    onEditClick: () => void;
    showEditModal: boolean;
    onHideEditModal: () => void;
}) => {
    return (
        <>
            <ProfileHero
                username={username}
                userData={userData}
                runs={[]}
                session={session}
                onEditClick={onEditClick}
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
            <ProfileEditModal
                show={showEditModal}
                onHide={onHideEditModal}
                username={username}
                session={session}
                userData={userData}
            />
        </>
    );
};

const filterRunsByGame = (runs: Run[], game: string): Run[] => {
    return runs.filter((run) => run.game === game);
};
