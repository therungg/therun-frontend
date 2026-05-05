/* eslint-disable */
'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import {
    ChatLeftQuote,
    Funnel,
    Search as SearchIcon,
} from 'react-bootstrap-icons';
import { FilterControl } from '~app/(new-layout)/live/filter-control';
import {
    FilterState,
    LiveDataMap,
    LiveProps,
    SortOption,
} from '~app/(new-layout)/live/live.types';
import { SortControl } from '~app/(new-layout)/live/sort-control';
import {
    filterLiveRuns,
    getRecommendedStream,
    isWebsocketDataProcessable,
    liveRunArrayToMap,
    liveRunIsInSearch,
    parseFilterParams,
    serializeFilterParams,
    sortLiveRuns,
} from '~app/(new-layout)/live/utilities';
import { CommentaryDrawer } from '~src/components/live/commentary-drawer/commentary-drawer';
import {
    CommentaryDrawerProvider,
    useCommentaryDrawerContext,
} from '~src/components/live/commentary-drawer/commentary-drawer-context';
import { LiveIcon, LiveUserRun } from '~src/components/live/live-user-run';
import { RecommendedStream } from '~src/components/live/recommended-stream';
import { SkeletonLiveRun } from '~src/components/skeleton/live/skeleton-live-run';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { getLiveRunForUser } from '~src/lib/live-runs';

type StaleReason = 'reset' | 'finished' | 'offline';

const GRACE_PERIODS: Record<StaleReason, number> = {
    reset: 15_000,
    finished: 60_000,
    offline: 10_000,
};

const SWAP_COUNTDOWN_S = 5;

export const Live = ({
    liveDataMap,
    username,
    showTitle = true,
    forceGame = null,
    forceCategory = null,
    canViewCommentary = false,
}: LiveProps) => {
    const [updatedLiveDataMap, setUpdatedLiveDataMap] = useState(liveDataMap);
    const [search, setSearch] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('importance');
    const [filters, setFilters] = useState<FilterState>({
        liveOnTwitch: false,
        ongoing: false,
        pbPace: false,
    });
    const [currentlyViewing, setCurrentlyViewing] = useState(
        getRecommendedStream(liveDataMap, username),
    );

    const [loadingUserData, setLoadingUserData] = useState(true);
    const lastMessage = useLiveRunsWebsocket();

    // Stale detection state
    const [staleReason, setStaleReason] = useState<StaleReason | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const staleReasonRef = useRef<StaleReason | null>(null);
    const graceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const countdownIntervalRef =
        useRef<ReturnType<typeof setInterval>>(undefined);
    const countdownRef = useRef<number | null>(null);
    const updatedLiveDataMapRef = useRef(updatedLiveDataMap);
    updatedLiveDataMapRef.current = updatedLiveDataMap;
    const currentlyViewingRef = useRef(currentlyViewing);
    currentlyViewingRef.current = currentlyViewing;

    const clearStaleTimers = useCallback(() => {
        if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = undefined;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = undefined;
        }
        countdownRef.current = null;
    }, []);

    const clearStaleState = useCallback(() => {
        clearStaleTimers();
        staleReasonRef.current = null;
        setStaleReason(null);
        setCountdown(null);
    }, [clearStaleTimers]);

    const selectNextRun = useCallback(() => {
        clearStaleState();

        const map = updatedLiveDataMapRef.current;
        const currentUser = currentlyViewingRef.current;

        // Find next active run (not the current stale one)
        const candidates = Object.values(map).filter(
            (run) =>
                run.user !== currentUser &&
                !run.hasReset &&
                run.currentSplitIndex >= 0 &&
                run.currentSplitIndex < run.splits.length,
        );

        if (candidates.length > 0) {
            candidates.sort((a, b) => b.importance - a.importance);
            setCurrentlyViewing(candidates[0].user);
        } else {
            const fallback = getRecommendedStream(map, undefined);
            if (fallback && fallback !== currentUser) {
                setCurrentlyViewing(fallback);
            }
        }
    }, [clearStaleState]);

    const markStale = useCallback(
        (reason: StaleReason) => {
            // Don't re-mark — use ref to avoid closure staleness
            if (staleReasonRef.current) return;

            staleReasonRef.current = reason;
            setStaleReason(reason);
            clearStaleTimers();

            // After grace period, start countdown
            graceTimerRef.current = setTimeout(() => {
                countdownRef.current = SWAP_COUNTDOWN_S;
                setCountdown(SWAP_COUNTDOWN_S);

                countdownIntervalRef.current = setInterval(() => {
                    countdownRef.current = (countdownRef.current ?? 1) - 1;
                    setCountdown(countdownRef.current);

                    if (countdownRef.current <= 0) {
                        selectNextRun();
                    }
                }, 1000);
            }, GRACE_PERIODS[reason]);
        },
        [clearStaleTimers, selectNextRun],
    );

    // Clear stale state when user manually selects a different run
    const handleSelectRun = useCallback(
        (user: string) => {
            clearStaleState();
            setCurrentlyViewing(user);
            window.scrollTo(0, 0);
        },
        [clearStaleState],
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => clearStaleTimers();
    }, [clearStaleTimers]);

    useEffect(() => {
        if (lastMessage !== null) {
            if (
                isWebsocketDataProcessable(
                    lastMessage,
                    forceGame,
                    forceCategory,
                )
            ) {
                const user = lastMessage.user;
                const newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap),
                );

                if (lastMessage.type == 'UPDATE') {
                    newMap[user] = lastMessage.run;

                    // Detect stale for the currently viewed run
                    if (user === currentlyViewing) {
                        const run = lastMessage.run;
                        if (run.hasReset || run.currentSplitIndex < 0) {
                            markStale('reset');
                        } else if (run.currentSplitIndex >= run.splits.length) {
                            markStale('finished');
                        }
                    }
                }

                if (lastMessage.type == 'DELETE') {
                    delete newMap[user];

                    if (currentlyViewing == user) {
                        markStale('offline');
                    }
                }

                setUpdatedLiveDataMap(liveRunArrayToMap(Object.values(newMap)));
            }
        }
    }, [lastMessage]);

    useEffect(() => {
        setSearch(forceCategory || '');
    }, [forceCategory]);

    useEffect(() => {
        if (
            currentlyViewing ||
            !updatedLiveDataMap[currentlyViewing] ||
            updatedLiveDataMap[currentlyViewing].isMinified
        ) {
            const liveRunFromUser = async (user: string) => {
                setLoadingUserData(true);

                const newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap),
                );

                newMap[currentlyViewing] = await getLiveRunForUser(user);

                setUpdatedLiveDataMap(liveRunArrayToMap(Object.values(newMap)));
                setLoadingUserData(false);
            };

            liveRunFromUser(currentlyViewing);
        } else {
            setLoadingUserData(false);
        }
    }, [currentlyViewing]);

    // Check if the loaded run is already stale when currentlyViewing changes
    const markStaleRef = useRef(markStale);
    markStaleRef.current = markStale;
    useEffect(() => {
        if (
            !loadingUserData &&
            currentlyViewing &&
            updatedLiveDataMap[currentlyViewing]
        ) {
            const run = updatedLiveDataMap[currentlyViewing];
            if (run.hasReset || run.currentSplitIndex < 0) {
                markStaleRef.current('reset');
            } else if (run.currentSplitIndex >= run.splits.length) {
                markStaleRef.current('finished');
            }
        }
    }, [loadingUserData, currentlyViewing]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync filters and sort from URL params on mount
    useEffect(() => {
        const parsedFilters = parseFilterParams(window.location.search);
        setFilters(parsedFilters);

        const params = new URLSearchParams(window.location.search);
        const sortParam = params.get('sort');
        if (
            sortParam &&
            ['importance', 'runtime', 'runner', 'game', 'delta'].includes(
                sortParam,
            )
        ) {
            setSortOption(sortParam as SortOption);
        }
    }, []);

    // Update URL when filters change
    useEffect(() => {
        const serialized = serializeFilterParams(filters);
        const params = new URLSearchParams(window.location.search);

        if (serialized) {
            params.set('filters', serialized);
        } else {
            params.delete('filters');
        }

        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;

        window.history.replaceState({}, '', newUrl);
    }, [filters]);

    // Update URL when sort option changes
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        if (sortOption && sortOption !== 'importance') {
            params.set('sort', sortOption);
        } else {
            params.delete('sort');
        }

        const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;

        window.history.replaceState({}, '', newUrl);
    }, [sortOption]);

    return (
        <CommentaryDrawerProvider>
            {showTitle && (
                <Row className="g-3 mb-3 align-items-center">
                    <Col xs="auto" className="flex-grow-1">
                        <h1>
                            Live Runs <LiveIcon height={18} />
                        </h1>
                    </Col>
                    <Col
                        xs="auto"
                        className="d-flex flex-grow-1 justify-content-end gap-2"
                    >
                        {canViewCommentary && <CommentaryTriggerButton />}
                        <a href={'/livesplit'}>
                            <Button
                                variant={'primary'}
                                className="btn-lg px-3 w-240p h-3r fw-medium"
                            >
                                How does this work?
                            </Button>
                        </a>
                    </Col>
                </Row>
            )}
            {loadingUserData && <SkeletonLiveRun />}
            {!loadingUserData &&
                currentlyViewing &&
                updatedLiveDataMap[currentlyViewing] && (
                    <Row className="g-3 mb-3">
                        <RecommendedStream
                            liveRun={updatedLiveDataMap[currentlyViewing]}
                            staleReason={staleReason}
                            countdown={countdown}
                        />
                    </Row>
                )}
            <Row className="g-3 mb-3">
                <Col>
                    <div
                        className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center justify-content-lg-between px-3 py-2 rounded-3 shadow-sm gap-3 gap-lg-4"
                        style={{
                            background: 'var(--bs-body-bg)',
                            border: '1px solid var(--bs-border-color)',
                        }}
                    >
                        <div className="d-flex flex-column flex-sm-row align-items-stretch gap-3 flex-grow-1">
                            <div style={{ minWidth: '200px' }}>
                                <SortControl
                                    value={sortOption}
                                    onChange={setSortOption}
                                />
                            </div>
                            <div className="flex-grow-1">
                                <div className="input-group">
                                    <span
                                        className="input-group-text bg-transparent border-end-0"
                                        onClick={() => {
                                            const searchElement =
                                                document.getElementById(
                                                    'gameSearch',
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
                                        className="form-control border-start-0 bg-transparent"
                                        placeholder="Filter by game/category/user"
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                        }}
                                        value={search}
                                        id="gameSearch"
                                        style={{
                                            boxShadow: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 justify-content-start justify-content-lg-end">
                            <span className="position-relative flex-shrink-0">
                                <Funnel size={16} className="text-muted" />
                                {(() => {
                                    const count = [
                                        filters.liveOnTwitch,
                                        filters.ongoing,
                                        filters.pbPace,
                                    ].filter(Boolean).length;
                                    return count > 0 ? (
                                        <span
                                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary"
                                            style={{
                                                fontSize: '0.6rem',
                                                padding: '0.15em 0.4em',
                                            }}
                                        >
                                            {count}
                                        </span>
                                    ) : null;
                                })()}
                            </span>
                            <FilterControl
                                filters={filters}
                                onChange={setFilters}
                            />
                        </div>
                    </div>
                </Col>
            </Row>
            <Row xs={1} md={2} lg={2} xl={3} className="g-3">
                {Object.values(updatedLiveDataMap).length == 0 && (
                    <div>Unfortunately, nobody is running live now...</div>
                )}

                {Object.values(updatedLiveDataMap).length > 0 &&
                    Object.values(updatedLiveDataMap)
                        .filter((liveRun) => liveRunIsInSearch(liveRun, search))
                        .filter((liveRun) => filterLiveRuns(liveRun, filters))
                        .length == 0 && (
                        <div>
                            No runs matched your search
                            {(filters.liveOnTwitch ||
                                filters.ongoing ||
                                filters.pbPace) &&
                                ' and filters'}
                            !
                        </div>
                    )}

                {sortLiveRuns(
                    Object.values(updatedLiveDataMap)
                        .filter((liveRun) => liveRunIsInSearch(liveRun, search))
                        .filter((liveRun) => filterLiveRuns(liveRun, filters)),
                    sortOption,
                ).map((liveRun) => {
                    return (
                        <Col
                            key={liveRun.user}
                            onClick={() => handleSelectRun(liveRun.user)}
                        >
                            <LiveUserRun
                                liveRun={liveRun}
                                currentlyActive={currentlyViewing}
                                key={liveRun.user}
                            />
                        </Col>
                    );
                })}
            </Row>
            {canViewCommentary && (
                <CommentaryDrawer
                    liveDataMap={updatedLiveDataMap}
                    currentlyViewing={currentlyViewing}
                />
            )}
        </CommentaryDrawerProvider>
    );
};

const CommentaryTriggerButton = () => {
    const ctx = useCommentaryDrawerContext();
    return (
        <Button
            variant="outline-secondary"
            className="btn-lg px-3 h-3r fw-medium d-inline-flex align-items-center gap-2"
            onClick={ctx.toggle}
            aria-label="Open commentary view"
        >
            <ChatLeftQuote /> Commentary
        </Button>
    );
};
