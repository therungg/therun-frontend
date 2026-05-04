'use client';

import React, {
    createRef,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import { CategoryLeaderboard } from '~app/(new-layout)/games/[game]/game.types';
import { LiveDataMap } from '~app/(new-layout)/live/live.types';
import {
    getRecommendedStream,
    liveRunIsInSearch,
} from '~app/(new-layout)/live/utilities';
import { EventLeaderboards } from '~app/(new-layout)/tournaments/[tournament]/event-leaderboards.component';
import { isLiveDataEligibleForTournament } from '~app/(new-layout)/tournaments/[tournament]/is-live-data-eligible-for-tournament.component';
import { liveRunArrayToMap } from '~app/(new-layout)/tournaments/[tournament]/live-run-array-to-map.component';
import { LiveUserRun } from '~src/components/live/live-user-run';
import { RecommendedStream } from '~src/components/live/recommended-stream';
import { SkeletonLiveRun } from '~src/components/skeleton/live/skeleton-live-run';
import type { Tournament } from '~src/components/tournament/tournament-info';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { detectTournamentState } from '~src/lib/tournament-periods';
import styles from '../tournament-detail.module.scss';

export interface LiveTabContentProps {
    tournament: Tournament;
    initialLiveDataMap: LiveDataMap;
    username?: string;
    tournamentLeaderboards: CategoryLeaderboard | null;
    qualifierData?: Tournament | null;
}

export const LiveTabContent: React.FC<LiveTabContentProps> = ({
    tournament,
    initialLiveDataMap,
    username,
    tournamentLeaderboards,
    qualifierData,
}) => {
    const [updatedLiveDataMap, setUpdatedLiveDataMap] =
        useState(initialLiveDataMap);
    const [selectedSort, setSelectedSort] = useState('pb');
    const [search, setSearch] = useState('');

    const recommendedStream = getRecommendedStream(
        initialLiveDataMap,
        username,
    );
    const [currentlyViewing, setCurrentlyViewing] = useState(recommendedStream);

    const [loadingUserData, setLoadingUserData] = useState(true);

    const gameSearchRef = createRef<HTMLInputElement>();

    const handleSortChange: React.ChangeEventHandler<HTMLSelectElement> =
        useCallback(
            (event) => {
                setSelectedSort(event.target.value);
            },
            [setSelectedSort],
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

                if (newData.type == 'UPDATE') {
                    newMap[user] = newData.run;
                }

                if (newData.type == 'DELETE') {
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

    const filteredLive = useMemo(
        () =>
            Object.values(updatedLiveDataMap).filter((run) =>
                liveRunIsInSearch(run, search),
            ),
        [updatedLiveDataMap, search],
    );

    // Reserved for future state-specific rendering (pre/heat/gap/post).
    // Today: render identical UI regardless of state.
    void detectTournamentState(tournament);

    return (
        <>
            {(loadingUserData ||
                (currentlyViewing && updatedLiveDataMap[currentlyViewing])) && (
                <div className={styles.liveStream}>
                    <div className={styles.section}>
                        <header className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                Stream
                                {!loadingUserData && currentlyViewing && (
                                    <span className={styles.sectionEyebrow}>
                                        Watching {currentlyViewing}
                                    </span>
                                )}
                            </h2>
                        </header>
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
                    </div>
                </div>
            )}

            <div className={styles.liveLayout}>
                <aside className={styles.liveLeaderboards}>
                    <div className={styles.section}>
                        <header className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                Leaderboards
                            </h2>
                        </header>
                        <EventLeaderboards
                            tournament={tournament}
                            gameTime={!!tournament.gameTime}
                            qualifierData={qualifierData}
                            tournamentLeaderboards={
                                tournamentLeaderboards as CategoryLeaderboard
                            }
                        />
                    </div>
                </aside>

                <div className={styles.liveMain}>
                    <div className={styles.section}>
                        <header className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                Live runs
                                <span className={styles.sectionEyebrow}>
                                    {filteredLive.length} live
                                </span>
                            </h2>
                        </header>

                        <div className={styles.controlsRow}>
                            <select
                                className={styles.controlSelect}
                                onChange={handleSortChange}
                                value={selectedSort}
                            >
                                <option value="time">
                                    Sort by current time
                                </option>
                                <option value="pb">
                                    Sort by tournament PB
                                </option>
                                <option value="personalBest">
                                    Sort by personal best
                                </option>
                                <option value="name">Sort by name</option>
                            </select>
                            <div className={styles.controlSearch}>
                                <SearchIcon
                                    size={14}
                                    className={styles.controlSearchIcon}
                                />
                                <input
                                    ref={gameSearchRef}
                                    type="search"
                                    className={styles.controlSearchInput}
                                    placeholder="Filter by user…"
                                    onChange={(e) => setSearch(e.target.value)}
                                    value={search}
                                />
                            </div>
                        </div>

                        {filteredLive.length === 0 ? (
                            <div className={styles.emptyState}>
                                {search
                                    ? 'No live runners match your search.'
                                    : 'Unfortunately, nobody is running live now…'}
                            </div>
                        ) : (
                            <div className={styles.liveRunsGrid}>
                                {filteredLive.map((liveRun) => (
                                    <div
                                        key={liveRun.user}
                                        onClick={() =>
                                            setCurrentlyViewing(liveRun.user)
                                        }
                                    >
                                        <LiveUserRun
                                            liveRun={liveRun}
                                            currentlyActive={currentlyViewing}
                                            showGameCategory={false}
                                            leaderboard={
                                                tournamentLeaderboards?.pbLeaderboard
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
