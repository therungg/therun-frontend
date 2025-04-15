import { LiveRun } from "~app/(old-layout)/live/live.types";
import React, { useEffect, useState } from "react";
import { getSplitsHistoryUrl } from "../run/get-splits-history";
import { Runs } from "~app/(old-layout)/[username]/[game]/[run]/run";
import { UserLink } from "../links/links";
import moment from "moment/moment";
import { GeneralStats } from "./general-stats";
import { SplitDetails } from "./split-details";
import { CurrentRunDetails } from "./current-run-details";

interface LiverunStatsPanelProps {
    liveRun: LiveRun;
    selectedSplit: number;
}

export const LiverunStatsPanel: React.FunctionComponent<
    LiverunStatsPanelProps
> = ({ liveRun, selectedSplit }) => {
    const [useGameTime, setUseGameTime] = useState(liveRun.gameTime);
    const [gameData, setGameData] = useState<{ [user: string]: Runs }>({});
    const [dataLoading, setDataLoading] = useState(false);
    const [selectedStats, setSelectedStats] = useState("current-run-detail");

    const data = liveRun.gameData;

    useEffect(() => {
        if (
            data &&
            !dataLoading &&
            !gameData[liveRun.user] &&
            data.historyFilename
        ) {
            setUseGameTime(liveRun.gameTime);
            setDataLoading(true);
            fetch(getSplitsHistoryUrl(data.historyFilename, useGameTime), {
                mode: "cors",
            })
                .then((res) => res.json())
                .then((newData: Runs) => {
                    const currentGameData = gameData;
                    currentGameData[liveRun.user] = newData;

                    setGameData(currentGameData);

                    setDataLoading(false);
                })
                .catch(() => {
                    setDataLoading(false);
                    liveRun.gameTime = !useGameTime;
                    setUseGameTime(!useGameTime);
                });
        }
    }, [dataLoading, gameData, liveRun]);

    if (!liveRun.gameData) {
        return <div>Could not load game data.. Sorry!</div>;
    }

    if (!dataLoading && !gameData[liveRun.user]) {
        return <>Could not load game data.. Sorry!</>;
    }

    if (dataLoading) {
        return <>Loading detailed data...</>;
    }

    const { runs, splits, sessions } = gameData[liveRun.user] as Runs;

    const currentSessionStarted =
        sessions.length > 0 && moment(sessions[sessions.length - 1].startedAt);

    return (
        <>
            <div className="text-truncate fs-big">
                <UserLink username={liveRun.user} /> - {liveRun.game}
            </div>
            <div>
                <a
                    href={`/${liveRun.gameData.url}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    View full stats
                </a>
            </div>
            <div className="my-2">
                <select
                    className="form-select"
                    value={selectedStats}
                    onChange={(e) => {
                        setSelectedStats(e.target.value);
                    }}
                >
                    <option
                        key="current-run-detail"
                        title="Current Run Detail"
                        value="current-run-detail"
                    >
                        Current Run Details
                    </option>
                    <option key="general" title="General Stats" value="general">
                        General Stats
                    </option>
                    <option
                        key="split-detail"
                        title="Split Detail"
                        value="split-detail"
                    >
                        Split Times
                    </option>
                </select>
            </div>
            <hr className="mb-2" />

            {selectedStats == "general" && (
                <GeneralStats
                    liveRun={liveRun}
                    sessions={sessions}
                    currentSessionStarted={currentSessionStarted}
                />
            )}

            {selectedStats == "split-detail" && (
                <SplitDetails
                    liveRun={liveRun}
                    splits={splits}
                    history={runs}
                    selectedSplit={selectedSplit}
                />
            )}
            {selectedStats == "current-run-detail" && (
                <CurrentRunDetails liveRun={liveRun} />
            )}
        </>
    );
};
