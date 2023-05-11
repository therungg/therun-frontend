import { RunHistory, SplitsHistory } from "../../../common/types";
import { Line } from "react-chartjs-2";
import { getFormattedString, getMonthDay } from "../../util/datetime";
import { Row } from "react-bootstrap";
import { isOutlier } from "./split-stats";
import { useEffect, useState } from "react";

export type GoldHistory = GoldSplit[];

export interface GoldSplit {
    time: string;
    date: string;
    split?: string;
    splitKey?: number;
    nthGold?: number;
    totalTime?: string;
    mergedSplits?: string[];
    mergedSplitKeys?: string[];
}

export const GoldProgressionGraph = ({
    history,
    split,
    total = false,
}: {
    history: RunHistory[];
    split: SplitsHistory;
    total?: boolean;
}) => {
    const [splitTimeKey, setSplitTimeKey] = useState(
        total ? "totalTime" : "splitTime"
    );
    const [groupKey, setGroupKey] = useState(total ? "total" : "single");

    useEffect(() => {
        setSplitTimeKey(total ? "totalTime" : "splitTime");
        setGroupKey(total ? "total" : "single");
    }, [total]);

    const key = split.id;

    if (key == undefined) return <></>;

    const golds: GoldHistory = [];

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
                    parseInt(currentSplit[splitTimeKey])
                )
            ) {
                return;
            }

            if (
                parseInt(currentSplit[splitTimeKey]) <
                parseInt(split[groupKey].bestPossibleTime)
            )
                return;

            if (
                golds.length == 0 ||
                parseInt(golds[golds.length - 1].time) >
                    parseInt(currentSplit[splitTimeKey])
            ) {
                golds.push({
                    time: currentSplit[splitTimeKey],
                    date: run.startedAt,
                });
            }
        });

    if (!golds) return <></>;

    const data = {
        labels: golds.map((gold: GoldSplit) => {
            return gold.date ? getMonthDay(gold.date) : "Unknown";
        }),
        datasets: [
            {
                label: "Gold splits",
                fill: false,
                lineTension: 0.1,
                backgroundColor: "gold",
                borderColor: "gold",
                borderCapStyle: "butt",
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: "miter",
                pointBorderColor: "gold",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "gold",
                pointHoverBorderColor: "black",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: golds.map((gold: GoldSplit) => gold.time),
            },
        ],
    };

    const options = {
        plugins: {
            tooltip: {
                callbacks: {
                    label(l: { raw: string }) {
                        return getFormattedString(l.raw, true);
                    },
                },
            },
            legend: { display: false },
            title: {
                display: false,
                text: "Recent runs",
                position: "top",
            },
        },
        scales: {
            y: {
                ticks: {
                    callback(value: string) {
                        return getFormattedString(value, true) || "Unknown";
                    },
                },
            },
        },
    };

    return (
        <>
            <Row>
                <h3>Gold split over time</h3>
            </Row>
            <Row>
                <Line data={data} type={"line"} options={options} />
            </Row>
        </>
    );
};
