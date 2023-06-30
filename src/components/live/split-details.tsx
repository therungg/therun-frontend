import { LiveRun } from "~app/live/live.types";
import { RunHistory, SplitsHistory } from "../../common/types";
import SplitName from "../transformers/split-name";
import { getSplitStatus } from "./recommended-stream";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import { useEffect, useState } from "react";

export const SplitDetails = ({
    liveRun,
    splits,
    history,
    selectedSplit,
}: {
    liveRun: LiveRun;
    history: RunHistory[];
    splits: SplitsHistory[];
    selectedSplit: number;
}) => {
    if (selectedSplit < 0) selectedSplit = 0;
    if (selectedSplit >= liveRun.splits.length - 1)
        selectedSplit = liveRun.splits.length - 1;

    const [splitStatus, setSplitStatus] = useState(
        getSplitStatus(liveRun, selectedSplit)
    );

    useEffect(() => {
        let currentSelectedSplit = selectedSplit;

        if (selectedSplit < 0) currentSelectedSplit = 0;
        if (selectedSplit >= liveRun.splits.length - 1)
            currentSelectedSplit = liveRun.splits.length - 1;

        setSplitStatus(getSplitStatus(liveRun, currentSelectedSplit));
    }, [selectedSplit, liveRun]);

    if (splits.length < 1) {
        return <div>No splits? Ok then</div>;
    }

    splits = splits.map((split, key) => {
        split.key = key;

        const reachedSplitRuns = history.filter((run) => {
            return run.splits.length >= key;
        });

        const completedSplitRuns = reachedSplitRuns.filter((run) => {
            return run.splits.length > key;
        });

        const savedTimeRuns = completedSplitRuns.filter((run) => {
            return (
                run.splits[key] &&
                run.splits[key].splitTime <= split.single.time
            );
        });

        split.completed = completedSplitRuns.length / reachedSplitRuns.length;
        split.timeSave = savedTimeRuns.length / reachedSplitRuns.length;

        const values = split.values.map((val) => parseInt(val));

        values.sort((a, b) => a - b);

        const tenPercent = Math.round(values.length / 10);
        const fiftyPercent = Math.round(values.length / 2);

        split.bestDiff =
            parseInt(split.single.time) -
            parseInt(split.single.bestAchievedTime);
        split.tenPercentDiff = parseInt(split.single.time) - values[tenPercent];
        split.fiftyPercentDiff =
            parseInt(split.single.time) - values[fiftyPercent];

        return split;
    });

    return (
        <div>
            <div style={{ display: "flex" }}>
                <span
                    style={{
                        width: "100%",
                        fontSize: "1.3rem",
                        marginBottom: "0.5rem",
                    }}
                >
                    <SplitName splitName={splits[selectedSplit].name} />
                </span>
                {liveRun.splits[selectedSplit].splitTime && (
                    <span
                        style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        Current run:&nbsp;
                        <DurationToFormatted
                            duration={liveRun.splits[selectedSplit].splitTime}
                            withMillis={true}
                        />
                    </span>
                )}
            </div>
            <Table
                striped
                bordered
                hover
                responsive
                style={{ marginBottom: "0.3rem" }}
            >
                <thead>
                    <tr>
                        <th style={{ width: "22%" }}></th>
                        <th style={{ width: "26%" }}>PB</th>
                        <th style={{ width: "26%" }}>Possible</th>
                        <th style={{ width: "26%" }}>Best Ever</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Segment</td>
                        <td>
                            {splitStatus?.comparisons["Personal Best"] && (
                                <DurationToFormatted
                                    withMillis={true}
                                    duration={
                                        splitStatus?.comparisons[
                                            "Personal Best"
                                        ]?.singleTime
                                    }
                                />
                            )}
                        </td>
                        <td>
                            {splitStatus?.comparisons["Best Segments"] && (
                                <DurationToFormatted
                                    withMillis={true}
                                    duration={
                                        splitStatus?.comparisons[
                                            "Best Segments"
                                        ]?.singleTime
                                    }
                                />
                            )}
                        </td>
                        <td>
                            {splitStatus?.comparisons["Best Segments"] && (
                                <DurationToFormatted
                                    withMillis={true}
                                    duration={
                                        splitStatus?.comparisons[
                                            "Best Segments"
                                        ]?.singleTime
                                    }
                                />
                            )}
                        </td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>
                            {splitStatus?.comparisons["Personal Best"] && (
                                <DurationToFormatted
                                    withMillis={true}
                                    duration={
                                        splitStatus?.comparisons[
                                            "Personal Best"
                                        ]?.totalTime
                                    }
                                />
                            )}
                        </td>
                        <td>
                            {splitStatus?.comparisons["Best Segments"] && (
                                <DurationToFormatted
                                    withMillis={true}
                                    duration={
                                        splitStatus?.comparisons[
                                            "Best Segments"
                                        ]?.totalTime
                                    }
                                />
                            )}
                        </td>
                        <td>
                            {splitStatus?.comparisons["Best Segments"] && (
                                <DurationToFormatted
                                    withMillis={true}
                                    duration={
                                        splitStatus?.comparisons[
                                            "Best Split Times"
                                        ]?.totalTime
                                    }
                                />
                            )}
                        </td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};
