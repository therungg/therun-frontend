import { RunHistory, SplitsHistory } from "../../../common/types";
import { Line } from "react-chartjs-2";
import { getFormattedString, getMonthDay } from "../../util/datetime";
import { Row } from "react-bootstrap";
import { isOutlier } from "./split-stats";
import { useEffect, useState } from "react";

type redHistory = redSplit[];

interface redSplit {
    time: string;
    date: string;
}

export const SplitOverTimeGraph = ({
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

    if (key == undefined) return <></>;

    const splits: redHistory = [];

    const splitsByDate: Map<string, string[]> = new Map<string, string[]>();

    // const splitTimeKey = total ? 'totalTime' : 'splitTime';
    // const groupKey = total ? 'total' : 'single';

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
            )
                return;

            if (!run.startedAt) return false;

            if (
                parseInt(currentSplit[splitTimeKey]) <
                parseInt(split[groupKey].bestPossibleTime)
            )
                return;

            const date = run.startedAt.substring(0, 10);
            const time = currentSplit[splitTimeKey];

            if (!splitsByDate.get(date)) splitsByDate.set(date, []);

            const newSplits = splitsByDate.get(date);
            newSplits.push(time);

            splitsByDate.set(date, newSplits);

            // splits.push({time, date})
        });

    for (const [date, times] of splitsByDate.entries()) {
        const sum = times
            .map((time) => parseInt(time))
            .reduce((a, b) => a + b, 0);
        const avg = sum / times.length || 0;

        splits.push({ time: avg.toString(), date });
    }

    if (!splits) return <></>;

    const data = {
        labels: splits.map((currentRedSplit: redSplit) => {
            return getMonthDay(currentRedSplit.date);
        }),
        datasets: [
            {
                label: "Splits",
                fill: false,
                lineTension: 1,
                borderWidth: 0.5,
                backgroundColor: "red",
                borderColor: "red",
                borderCapStyle: "butt",
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: "miter",
                pointBorderColor: "red",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "red",
                pointHoverBorderColor: "black",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: splits.map(
                    (currentRedSplit: redSplit) => currentRedSplit.time,
                ),
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
                        return getFormattedString(value, true);
                    },
                },
            },
        },
    };

    return (
        <>
            <Row>
                <h3>Average time per day</h3>
            </Row>
            <Row>
                <Line data={data} type={"line"} options={options} />
            </Row>
        </>
    );
};
