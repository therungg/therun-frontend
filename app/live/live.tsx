"use client";

import { LiveIcon, LiveUserRun } from "~src/components/live/live-user-run";
import React, { useEffect, useState } from "react";
import searchStyles from "~src/components/css/Search.module.scss";
import runStyles from "~src/components/css/LiveRun.module.scss";
import homeStyles from "~src/components/css/Home.module.scss";
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
                                        variant={"outline-primary"}
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
                {currentlyViewing && updatedLiveDataMap[currentlyViewing] && (
                    <RecommendedStream
                        liveRun={updatedLiveDataMap[currentlyViewing]}
                    />
                )}
            </div>
            <div>
                <div className={runStyles.searchContainer}>
                    <div
                        className="input-group"
                        style={{ marginLeft: "0" }} /*ToDo:*/
                    >
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
