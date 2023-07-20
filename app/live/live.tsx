"use client";

import { LiveIcon, LiveUserRun } from "~src/components/live/live-user-run";
import React, { useEffect, useState } from "react";
import searchStyles from "~src/components/css/Search.module.scss";
import { Button, Col, Row } from "react-bootstrap";
import { RecommendedStream } from "~src/components/live/recommended-stream";
import { useReconnectWebsocket } from "~src/components/websocket/use-reconnect-websocket";
import {
    getRecommendedStream,
    isWebsocketDataProcessable,
    liveRunArrayToMap,
    liveRunIsInSearch,
} from "~app/live/utilities";
import { LiveDataMap, LiveProps } from "~app/live/live.types";
import { getLiveRunForUser } from "~src/lib/live-runs";
import { SkeletonLiveRun } from "~src/components/skeleton/live/skeleton-live-run";

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
        getRecommendedStream(liveDataMap, username)
    );

    const [loadingUserData, setLoadingUserData] = useState(true);
    const lastMessage = useReconnectWebsocket();

    useEffect(() => {
        if (lastMessage !== null) {
            const data = JSON.parse(lastMessage.data);

            if (isWebsocketDataProcessable(data, forceGame, forceCategory)) {
                const user = data.user;
                const newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap)
                );

                if (data.type == "UPDATE") {
                    newMap[user] = data.run;
                }

                if (data.type == "DELETE") {
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
            !updatedLiveDataMap[currentlyViewing] ||
            updatedLiveDataMap[currentlyViewing].isMinified
        ) {
            const liveRunFromUser = async (user: string) => {
                setLoadingUserData(true);

                const newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap)
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
                <Row className="g-3 mb-4">
                    <Col className="col-auto flex-grow-1">
                        <h1>
                            Live Runs <LiveIcon height={18} />
                        </h1>
                    </Col>
                    <Col className="col-auto text-end">
                        <a href={"/upload-key"}>
                            <Button
                                variant={"outline-primary"}
                                className="fs-larger h-100 px-3 mw-250p"
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
                    <Row className="g-3 mb-4">
                        <RecommendedStream
                            liveRun={updatedLiveDataMap[currentlyViewing]}
                        />
                    </Row>
                )}
            <Row className="g-3 mb-3">
                <div className="input-group">
                    <span
                        className="material-symbols-outlined input-group-text"
                        onClick={() => {
                            const searchElement =
                                document.getElementById("gameSearch");
                            if (document.activeElement !== searchElement) {
                                searchElement.focus();
                            }
                        }}
                    >
                        search
                    </span>
                    <input
                        type="search"
                        className={`form-control ${searchStyles.search}`}
                        placeholder="Filter by game/category/user"
                        style={{ marginBottom: "0" }}
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
                        liveRunIsInSearch(liveRun, search)
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
