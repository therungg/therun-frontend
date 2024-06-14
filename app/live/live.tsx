"use client";

import { LiveIcon, LiveUserRun } from "~src/components/live/live-user-run";
import React, { useEffect, useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { RecommendedStream } from "~src/components/live/recommended-stream";
import { useLiveRunsWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import {
    getRecommendedStream,
    isWebsocketDataProcessable,
    liveRunArrayToMap,
    liveRunIsInSearch,
} from "~app/live/utilities";
import { LiveDataMap, LiveProps } from "~app/live/live.types";
import { getLiveRunForUser } from "~src/lib/live-runs";
import { SkeletonLiveRun } from "~src/components/skeleton/live/skeleton-live-run";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const Live = ({
    liveDataMap,
    username,
    showTitle = true,
    forceGame = null,
    forceCategory = null,
}: LiveProps) => {
    const [updatedLiveDataMap, setUpdatedLiveDataMap] = useState(liveDataMap);
    const [search, setSearch] = useState("");
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

                if (lastMessage.type == "UPDATE") {
                    newMap[user] = lastMessage.run;
                }

                if (lastMessage.type == "DELETE") {
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
        setSearch(forceCategory || "");
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
                        <a href={"/livesplit"}>
                            <Button
                                variant={"primary"}
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
                    <Row className="g-3">
                        <RecommendedStream
                            liveRun={updatedLiveDataMap[currentlyViewing]}
                        />
                    </Row>
                )}
            <Row className="g-3 my-3">
                <div className="input-group mw-search">
                    <span
                        className="input-group-text"
                        onClick={() => {
                            const searchElement =
                                document.getElementById("gameSearch");
                            if (document.activeElement !== searchElement) {
                                searchElement.focus();
                            }
                        }}
                    >
                        <SearchIcon size={18} />
                    </span>
                    <input
                        type="search"
                        className="form-control"
                        placeholder="Filter by game/category/user"
                        onChange={(e) => {
                            setSearch(e.target.value);
                        }}
                        value={search}
                        id="gameSearch"
                    />
                </div>
            </Row>
            <Row xs={1} lg={2} xl={3} className="g-3">
                {Object.values(updatedLiveDataMap).length == 0 && (
                    <div>Unfortunately, nobody is running live now...</div>
                )}

                {Object.values(updatedLiveDataMap).length > 0 &&
                    Object.values(updatedLiveDataMap).filter((liveRun) =>
                        liveRunIsInSearch(liveRun, search),
                    ).length == 0 && <div>No runs matched your search!</div>}

                {Object.values(updatedLiveDataMap)
                    .filter((liveRun) => liveRunIsInSearch(liveRun, search))
                    .map((liveRun) => {
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
