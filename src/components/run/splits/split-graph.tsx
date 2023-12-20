import { Bar } from "react-chartjs-2";
import { RunHistory, SplitsHistory } from "../../../common/types";
import { isOutlier } from "./split-stats";
import { getFormattedString } from "../../util/datetime";
import { useEffect, useState } from "react";

export const SplitGraph = ({
    history,
    split,
    total = false,
}: {
    history: RunHistory[];
    split: SplitsHistory;
    total?: boolean;
}) => {
    const [splitTimeKey, setSplitTimeKey] = useState(
        total ? "totalTime" : "splitTime",
    );
    const [groupKey, setGroupKey] = useState(total ? "total" : "single");

    useEffect(() => {
        setSplitTimeKey(total ? "totalTime" : "splitTime");
        setGroupKey(total ? "total" : "single");
    }, [total]);
    const key = split.id;

    if (key == undefined) return <>aa</>;

    const splitGroups: Map<number, number> = new Map<number, number>();

    let lowestGroup: number;
    let highestGroup: number;

    history
        .filter((run) => run.splits.length > key - 1)
        .forEach((run) => {
            const currentSplit = run.splits[key];

            if (
                !currentSplit ||
                currentSplit[splitTimeKey] == "0" ||
                isOutlier(
                    parseInt(split[groupKey].averageTime),
                    parseInt(split[groupKey].stdDev),
                    parseInt(currentSplit[splitTimeKey]),
                )
            ) {
                return;
            }

            if (
                parseInt(currentSplit[splitTimeKey]) <
                parseInt(split[groupKey].bestPossibleTime)
            )
                return;

            const group = Math.floor(
                parseInt(currentSplit[splitTimeKey]) / 1000,
            );

            if (!lowestGroup || group < lowestGroup) lowestGroup = group;
            if (!highestGroup || group > highestGroup) highestGroup = group;

            if (!splitGroups.get(group)) splitGroups.set(group, 0);

            splitGroups.set(group, splitGroups.get(group) + 1);
        });

    let sorted = new Map(Array.from(splitGroups).sort());

    let current: number = lowestGroup;

    while (current < highestGroup) {
        if (!sorted.get(current)) sorted.set(current, 0);
        current++;
    }

    sorted = new Map(Array.from(sorted).sort((a, b) => a[0] - b[0]));

    return (
        <div>
            <h3>Split per second</h3>
            <Bar
                options={{
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "top" as const,
                            display: false,
                        },
                        title: {
                            display: false,
                            text: "Chart.js Bar Chart",
                        },
                    },
                }}
                data={{
                    labels: Array.from(sorted.keys()).map((seconds) =>
                        getFormattedString((seconds * 1000).toString()),
                    ),
                    datasets: [
                        {
                            barPercentage: 0.5,
                            barThickness: 6,
                            maxBarThickness: 8,
                            minBarLength: 0,
                            backgroundColor: "green",
                            data: Array.from(sorted.values()),
                        },
                    ],
                }}
            />
        </div>
    );
};
