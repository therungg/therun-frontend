/* eslint-disable */
'use client';
import React, { useEffect, useState } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import { Funnel, Search as SearchIcon } from 'react-bootstrap-icons';
import { FilterControl } from '~app/(old-layout)/live/filter-control';
import {
    FilterState,
    LiveDataMap,
    LiveProps,
    SortOption,
} from '~app/(old-layout)/live/live.types';
import { SortControl } from '~app/(old-layout)/live/sort-control';
import {
    filterLiveRuns,
    getRecommendedStream,
    isWebsocketDataProcessable,
    liveRunArrayToMap,
    liveRunIsInSearch,
    parseFilterParams,
    serializeFilterParams,
    sortLiveRuns,
} from '~app/(old-layout)/live/utilities';
import { LiveIcon, LiveUserRun } from '~src/components/live/live-user-run';
import { RecommendedStream } from '~src/components/live/recommended-stream';
import { SkeletonLiveRun } from '~src/components/skeleton/live/skeleton-live-run';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { getLiveRunForUser } from '~src/lib/live-runs';

export const Live = ({
    liveDataMap,
    username,
    showTitle = true,
    forceGame = null,
    forceCategory = null,
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
                }

                if (lastMessage.type == 'DELETE') {
                    delete newMap[user];

                    if (currentlyViewing == user) {
                        setCurrentlyViewing(getRecommendedStream(newMap));
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

    // Sync filters from URL params on mount
    useEffect(() => {
        const parsedFilters = parseFilterParams(window.location.search);
        setFilters(parsedFilters);
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

    return (
        <>
            {showTitle && (
                <Row className="g-3 mb-3">
                    <Col xs="auto" className="flex-grow-1">
                        <h1>
                            Live Runs <LiveIcon height={18} />
                        </h1>
                    </Col>
                    <Col xs="auto" className="flex-grow-1 text-end">
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
                            <Funnel
                                size={16}
                                className="text-muted flex-shrink-0"
                            />
                            <FilterControl
                                filters={filters}
                                onChange={setFilters}
                            />
                        </div>
                    </div>
                </Col>
            </Row>
            <Row xs={1} lg={2} xl={3} className="g-3">
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
                            onClick={() => {
                                setCurrentlyViewing(liveRun.user);

                                window.scrollTo(0, 0);
                            }}
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
        </>
    );
};
