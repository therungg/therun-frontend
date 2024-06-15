import { RunHistory } from "../../../common/types";
import { getFormattedString, getMonthDay } from "../../util/datetime";
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState } from "react";
import { Col, Row } from "react-bootstrap";
import Switch from "react-switch";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    BarElement,
    CategoryScale,
    Legend,
);

const amount = 100000;

type LineProps = React.ComponentProps<typeof Line>;

export const RecentRuns = ({
    history,
    pb,
}: {
    history: RunHistory[];
    pb: string;
}) => {
    const [pbOnly, setPbOnly] = useState(false);

    let attempts = history
        .filter(
            (attempt: RunHistory) =>
                !!attempt.time && parseInt(attempt.time) > 0,
        )
        .slice()
        .reverse()
        .slice(0, amount)
        .reverse();
    let currentLowest: number | null = null;

    const pbs = attempts.filter((attempt: RunHistory) => {
        if (
            currentLowest == null ||
            (currentLowest > 0 && parseInt(attempt.time) < currentLowest)
        ) {
            currentLowest = parseInt(attempt.time);
            return true;
        }
        return false;
    });

    if (pbs.length > 0) {
        const parsedPb = parseInt(pb);
        const minAttemptPb = parsedPb * 3;

        attempts = attempts.filter((attempt) => {
            return (
                parseInt(attempt.time) < minAttemptPb &&
                parseInt(attempt.time) >= parsedPb - 1
            );
        });
    }

    const runToShow = pbOnly ? pbs : attempts;

    const data = {
        labels: runToShow.map((attempt: RunHistory) => {
            return getMonthDay(attempt.endedAt);
        }),
        datasets: [
            {
                label: "Recent runs",
                fill: false,
                backgroundColor:
                    getComputedStyle(document.documentElement).getPropertyValue(
                        // TODO: Get rid of this
                        // eslint-disable-next-line sonarjs/no-duplicate-string
                        "--bs-link-color",
                    ) || "",
                borderColor: getComputedStyle(
                    document.documentElement,
                ).getPropertyValue("--bs-link-color"),
                borderCapStyle: "butt",
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: "miter",
                pointBorderColor: getComputedStyle(
                    document.documentElement,
                ).getPropertyValue("--bs-link-color"),
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: getComputedStyle(
                    document.documentElement,
                ).getPropertyValue("--bs-link-color"),
                pointHoverBorderColor: getComputedStyle(
                    document.documentElement,
                ).getPropertyValue("--bs-link-color"),
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: runToShow.map((attempt: RunHistory) => attempt.time),
            },
        ],
    } as LineProps["data"];

    const options = {
        plugins: {
            tooltip: {
                callbacks: {
                    label(l: { raw: string }) {
                        return getFormattedString(l.raw);
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
                        return getFormattedString(value);
                    },
                },
            },
        },
    } as LineProps["options"];

    return (
        <div>
            <Row>
                <Col>
                    <h2>Finished Runs</h2>
                </Col>
                <Col style={{ display: "flex", justifyContent: "end" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "end",
                            alignSelf: "center",
                        }}
                    >
                        <label
                            htmlFor="switch"
                            style={{
                                marginRight: "10px",
                                alignSelf: "center",
                            }}
                        >
                            {" "}
                            {pbOnly ? "Show only PBs" : "Show All"}{" "}
                        </label>
                        <Switch
                            name="switch"
                            onChange={(checked) => {
                                setPbOnly(checked);
                            }}
                            checked={pbOnly}
                        />
                    </div>
                </Col>
            </Row>
            <Line data={data} options={options} />
        </div>
    );
};
