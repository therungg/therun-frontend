"use client";

import { LiveIcon, LiveUserRun } from "~src/components/live/live-user-run";
import React, { useEffect, useState } from "react";
import searchStyles from "~src/components/css/Search.module.scss";
import styles from "~src/components/css/Games.module.scss";
import runStyles from "~src/components/css/LiveRun.module.scss";
import homeStyles from "~src/components/css/Home.module.scss";
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
    const lastMessage = useLiveRunsWebsocket();

    useEffect(() => {
        if (lastMessage !== null) {
            if (
                isWebsocketDataProcessable(
                    lastMessage,
                    forceGame,
                    forceCategory
                )
            ) {
                const user = lastMessage.user;
                const newMap: LiveDataMap = JSON.parse(
                    JSON.stringify(updatedLiveDataMap)
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
        <div>
            {showTitle && (
                <Row>
                    <Col sm={7} xs={12}>
                        <h1>
                            Live Runs <LiveIcon height={18} />
                        </h1>
                    </Col>
                    <Col sm={5} xs={12}>
                        <div className={runStyles.uploadKeyButton}>
                            <div
                                className={homeStyles.learnMoreButtonContainer}
                            >
                                <a href={"/upload-key"}>
                                    <Button
                                        variant={"primary"}
                                        className={homeStyles.learnMoreButton}
                                        style={{ width: "15rem" }}
                                    >
                                        How does this work?
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </Col>
                </Row>
            )}

            <div className={runStyles.recommendedStreamContainer}>
                {loadingUserData && <SkeletonLiveRun />}
                {!loadingUserData &&
                    currentlyViewing &&
                    updatedLiveDataMap[currentlyViewing] && (
                        <RecommendedStream
                            liveRun={updatedLiveDataMap[currentlyViewing]}
                        />
                    )}
            </div>
            <div>
                <div className={runStyles.searchContainer}>
                    <div
                        className={`${searchStyles.searchContainer} ${styles.filter}`}
                        style={{ marginLeft: "0" }}
                    >
                        <span
                            className={"material-symbols-outlined"}
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
                </div>
            </div>
            <Row>
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
                                xl={4}
                                lg={6}
                                md={12}
                                key={liveRun.user}
                                style={{ marginBottom: "1rem" }}
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
        </div>
    );
};
