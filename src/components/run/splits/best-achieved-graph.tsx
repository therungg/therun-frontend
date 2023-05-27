import { RunHistory, SplitsHistory } from "../../../common/types";
import { Line } from "react-chartjs-2";
import { getFormattedString, getMonthDay } from "../../util/datetime";
import { Row } from "react-bootstrap";
import { isOutlier } from "./split-stats";

export type GoldHistory = GoldSplit[];

export interface GoldSplit {
    time: string;
    date: string;
    split?: string;
    splitKey?: number;
    nthGold?: number;
    totalTime?: string;
}

export const BestAchievedGraph = ({
    history,
    split,
}: {
    history: RunHistory[];
    split: SplitsHistory;
}) => {
    const key = split.id;

    if (key == undefined) return <></>;

    const golds: GoldHistory = [];

    history
        .filter((run) => run.splits.length > key - 1)
        .forEach((run) => {
            const currentSplit = run.splits[key];

            if (
                !currentSplit ||
                currentSplit.splitTime == "0" ||
                parseInt(currentSplit.totalTime) < parseInt(split.total.time) ||
                isOutlier(
                    parseInt(split.total.averageTime),
                    parseInt(split.total.stdDev),
                    parseInt(currentSplit.totalTime)
                )
            ) {
                return;
            }

            if (
                golds.length == 0 ||
                parseInt(golds[golds.length - 1].time) >
                    parseInt(currentSplit.totalTime)
            ) {
                golds.push({
                    time: currentSplit.totalTime,
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
                <h3>Best ever over time</h3>
            </Row>
            <Row>
                <Line data={data} type={"line"} options={options} />
            </Row>
        </>
    );
};
