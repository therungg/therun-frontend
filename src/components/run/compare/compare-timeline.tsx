import { Col, Row } from "react-bootstrap";
import Switch from "react-switch";
import { useState } from "react";
import { RunHistory } from "../../../common/types";
import { getFormattedString } from "../../util/datetime";
import { Line } from "react-chartjs-2";

export const CompareTimeline = ({
    runsOne,
    runsTwo,
    userOne,
    userTwo,
}: {
    runsOne: RunHistory[];
    runsTwo: RunHistory[];
    userOne: string;
    userTwo: string;
}) => {
    const [pbOnly, setPbOnly] = useState(false);

    const attempts = runsOne.filter(
        (attempt: RunHistory) => !!attempt.time && parseInt(attempt.time) > 0,
    );
    const pbs = getPbs(attempts);
    let runToShow = pbOnly ? pbs : attempts;

    if (pbs.length > 0 && !pbOnly) {
        const maxTime = parseInt(pbs[pbs.length - 1].time) * 3;

        runToShow = runToShow.filter((run) => {
            return parseInt(run.time) < maxTime;
        });
    }

    const attemptsTwo = runsTwo.filter(
        (attempt: RunHistory) => !!attempt.time && parseInt(attempt.time) > 0,
    );
    const pbsTwo = getPbs(attemptsTwo);
    let runToShowTwo = pbOnly ? pbsTwo : attemptsTwo;

    if (pbsTwo.length > 0 && !pbOnly) {
        const maxTimeTwo = parseInt(pbsTwo[pbsTwo.length - 1].time) * 3;

        runToShowTwo = runToShowTwo.filter((run) => {
            return parseInt(run.time) < maxTimeTwo;
        });
    }

    const labelRun =
        runToShow.length > runToShowTwo.length ? runToShow : runToShowTwo;

    const data = {
        labels: labelRun.map((attempt: RunHistory, key: number) => {
            return `Run #${key + 1}`;
        }),
        datasets: [
            {
                label: userOne,
                fill: false,
                lineTension: 0.1,
                backgroundColor: "green",
                borderColor: "green",
                borderCapStyle: "butt",
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: "miter",
                pointBorderColor: "green",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "green",
                pointHoverBorderColor: "green",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: runToShow.map((attempt: RunHistory) => attempt.time),
            },
            {
                label: userTwo,
                fill: false,
                lineTension: 0.1,
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
                pointHoverBorderColor: "red",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: runToShowTwo.map((attempt: RunHistory) => attempt.time),
            },
        ],
    };

    const options = {
        plugins: {
            tooltip: {
                callbacks: {
                    label(l: { raw: string }) {
                        return getFormattedString(l.raw);
                    },
                },
            },
            legend: { display: true },
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
    };

    return (
        <div>
            <Row>
                <Col>
                    <h2>Runs Timeline</h2>
                </Col>
                <Col className="d-flex justify-content-end">
                    <div className="d-flex justify-content-end align-self-center">
                        <label
                            htmlFor={"switch"}
                            style={{
                                marginRight: "10px",
                                alignSelf: "center",
                            }}
                        >
                            {" "}
                            {"Show only PBs"}{" "}
                        </label>
                        <Switch
                            name={"switch"}
                            onChange={(checked) => {
                                setPbOnly(checked);
                            }}
                            checked={pbOnly}
                        />
                    </div>
                </Col>
            </Row>
            <Col style={{ minWidth: "15rem" }}>
                <Line data={data} type={"line"} options={options} />
            </Col>
        </div>
    );
};

export const getPbs = (runs: RunHistory[]) => {
    let currentLowest: number | null = null;

    return runs.filter((attempt: RunHistory) => {
        if (currentLowest == null || parseInt(attempt.time) < currentLowest) {
            currentLowest = parseInt(attempt.time);
            return true;
        }
        return false;
    });
};
