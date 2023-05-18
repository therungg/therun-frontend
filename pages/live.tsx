"use client";
import { GetServerSideProps } from "next";
import { getAllLiveRuns } from "../lib/live-runs";
import {
    Flag,
    LiveIcon,
    LiveRun,
    LiveUserRun,
} from "../components/live/live-user-run";
import useWebSocket from "react-use-websocket";
import React, { useEffect, useState } from "react";
import searchStyles from "../components/css/Search.module.scss";
import styles from "../components/css/Games.module.scss";
import runStyles from "../components/css/LiveRun.module.scss";
import homeStyles from "../components/css/Home.module.scss";
import { Button, Col, Row } from "react-bootstrap";
import {
    getSplitStatus,
    RecommendedStream,
} from "../components/live/recommended-stream";
import {
    DifferenceFromOne,
    DurationAsTimer,
} from "../components/util/datetime";
import Timer from "../vendor/timer/src/index";

export type LiveDataMap = {
    [user: string]: LiveRun;
};

interface LiveProps {
    liveDataMap: LiveDataMap;
    username?: string;
    showTitle?: boolean;
    forceGame?: any;
    forceCategory?: any;
}

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
    const { lastMessage } = useWebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL);

    useEffect(() => {
        if (lastMessage !== null) {
            const data = JSON.parse(lastMessage.data);

            if (
                !forceGame ||
                data.type == "DELETE" ||
                (!forceCategory &&
                    forceGame.toLowerCase() == data.run.game.toLowerCase()) ||
                (forceGame.toLowerCase() == data.run.game.toLowerCase() &&
                    forceCategory.toLowerCase() ==
                        data.run.category.toLowerCase())
            ) {
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
                {currentlyViewing && updatedLiveDataMap[currentlyViewing] && (
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

export const LivesplitTimer = ({
    liveRun,
    dark,
    withDiff = true,
    className = null,
    timerClassName = null,
    splitTime = false,
}) => {
    const [timerStart, setTimerStart] = useState(0);
    React.useEffect(() => {
        const time =
            new Date().getTime() - new Date(liveRun.insertedAt).getTime() + 400;
        setTimerStart(time + (splitTime ? liveRun.currentTime : 0));
    }, [liveRun.insertedAt, splitTime]);

    const [id, setId] = useState(0);

    const formatHours = (value: number): string => {
        if (value < 0) return "-00";

        return String(value).padStart(2, "0");
    };

    const formatMinutes = (value: number): string => {
        if (value < 0) return "00";

        return String(value).padStart(2, "0");
    };

    const formatSeconds = (value: number): string => {
        return String(value).padStart(2, "0");
    };

    useEffect(() => {
        setId(id + 1);
    }, [liveRun]);

    if (!className) className = runStyles.timerBody;
    if (!timerClassName) timerClassName = runStyles.timer;

    const lastSplitStatus = getSplitStatus(
        liveRun,
        liveRun.splits ? liveRun.splits.length - 1 : 0
    );

    return (
        <div className={className}>
            <div>
                {liveRun.currentSplitIndex == liveRun.splits.length &&
                    liveRun.splits[liveRun.splits.length - 1].splitTime && (
                        <div>
                            {splitTime && (
                                <div style={{ display: "flex" }}>
                                    <div>
                                        <div
                                            className={timerClassName}
                                            style={{ display: "flex" }}
                                        >
                                            <div>
                                                <b>
                                                    <i>
                                                        <DurationAsTimer
                                                            duration={
                                                                lastSplitStatus?.singleTime
                                                            }
                                                        />
                                                    </i>
                                                </b>
                                            </div>
                                        </div>
                                        {withDiff && (
                                            <DifferenceFromOne
                                                diff={liveRun.delta}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {!splitTime && (
                                <div style={{ display: "flex" }}>
                                    <div style={{ marginRight: "0.5rem" }}>
                                        <Flag height={30} dark={dark} />
                                    </div>
                                    <div>
                                        <div
                                            className={timerClassName}
                                            style={{ display: "flex" }}
                                        >
                                            <div>
                                                <b>
                                                    <i>
                                                        <DurationAsTimer
                                                            duration={
                                                                lastSplitStatus?.time
                                                            }
                                                        />
                                                    </i>
                                                </b>
                                            </div>
                                        </div>
                                        {withDiff && (
                                            <DifferenceFromOne
                                                diff={liveRun.delta}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                {liveRun.currentSplitIndex < liveRun.splits.length &&
                    !liveRun.hasReset && (
                        <div key={liveRun.user + id}>
                            <div className={timerClassName}>
                                <Timer initialTime={timerStart}>
                                    <Timer.Hours formatValue={formatHours} />:
                                    <Timer.Minutes
                                        formatValue={formatMinutes}
                                    />
                                    :
                                    <Timer.Seconds
                                        formatValue={formatSeconds}
                                    />
                                </Timer>
                            </div>
                            {withDiff && (
                                <DifferenceFromOne
                                    diff={liveRun.delta}
                                    withMillis={true}
                                />
                            )}
                        </div>
                    )}

                {liveRun.hasReset && (
                    <div>
                        <div className={timerClassName}>
                            {splitTime ? "-" : "Reset"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const liveRunIsInSearch = (liveRun: LiveRun, search: string) => {
    search = search
        .toLowerCase()
        .replaceAll(" ", "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
    let inSearch = false;

    [liveRun.user, liveRun.game, liveRun.category].forEach((val) => {
        if (inSearch) return;

        const correctValue = val
            .toLowerCase()
            .replaceAll(" ", "")
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");

        if (correctValue.includes(search)) inSearch = true;
    });

    return inSearch;
};

export const liveRunArrayToMap = (liveData: LiveRun[]) => {
    liveData.sort((a, b) => {
        if (a.importance > b.importance) return -1;
        if (a.importance == b.importance) return 0;
        return 1;
    });

    const map = {};

    liveData.forEach((l) => {
        let user = l.user.toString();

        const firstLetter = user[0];

        //TODO:: This breaks the sorting if not done this way. Figure out why.
        if (firstLetter <= "9" && firstLetter >= "0") {
            user = ` ${user}`;
        }

        map[user] = l;
    });

    return map;
};

export const getRecommendedStream = (
    liveDataMap: LiveDataMap,
    username?: string
): string => {
    let recommendedStream = "";
    const lowercaseUsername = username?.toLowerCase();

    if (lowercaseUsername) {
        const user = Object.values(liveDataMap).find(
            (data) => data.user && data.user.toLowerCase() === lowercaseUsername
        );
        recommendedStream = user?.user || "";
    }

    if (!recommendedStream) {
        const streamingRun = Object.values(liveDataMap).find(
            (data) => data.currentlyStreaming && data.currentSplitIndex > -1
        );
        if (streamingRun) recommendedStream = streamingRun.user;
    }

    if (!recommendedStream) {
        const firstRun = Object.values(liveDataMap)[0];
        if (firstRun) recommendedStream = firstRun.user;
    }

    return recommendedStream;
};

export const getServerSideProps: GetServerSideProps = async () => {
    const liveData: LiveRun[] = await getAllLiveRuns();
    return {
        props: { liveDataMap: liveRunArrayToMap(liveData) },
    };
};

export default Live;
