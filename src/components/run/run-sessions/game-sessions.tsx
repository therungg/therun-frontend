import { RunHistory, RunSession, SplitsHistory } from "~src/common/types";
import {
    Difference,
    DurationToFormatted,
    IsoToFormatted,
} from "../../util/datetime";
import { Accordion, Card, Col, Pagination, Row, Table } from "react-bootstrap";
import { useEffect, useState } from "react";
import moment from "moment/moment";
import styles from "../../css/Session.module.scss";

export const GameSessions = ({
    sessions,
    runs,
    splits,
    gameTime = false,
}: {
    sessions: RunSession[];
    runs: RunHistory[];
    splits: SplitsHistory[];
    gameTime: boolean;
}) => {
    const [runsPast, setRunsPast] = useState("all");

    const [sortColumn, setSortColumn] = useState("ended-at");
    const [sortAsc, setSortAsc] = useState(true);

    const changeSort = (column: string) => {
        if (sortColumn === column) {
            setSortAsc(!sortAsc);
        } else {
            setSortColumn(column);
            setSortAsc(true);
        }
    };

    const getSortableClassName = (column: string): string => {
        let classNames = "sortable";

        if (sortColumn === column) {
            classNames += " active";
            classNames += sortAsc ? " asc" : " desc";
        }

        return classNames;
    };

    const totalCount = sessions.length;

    if (runsPast != "all") {
        if (runsPast == "finished") {
            sessions = sessions.filter(
                (session) => session.finishedRuns.length > 0
            );
        } else {
            sessions = sessions.filter((session) => {
                const sessionRuns = runs.filter((run, index) => {
                    return (
                        index >= session.runIds.first &&
                        index <= session.runIds.last
                    );
                });

                for (const run of sessionRuns) {
                    if (run.splits.length > parseInt(runsPast)) return true;
                }

                return false;
            });
        }
    }

    sessions.sort((a, b) => {
        let res = 1;

        if (sortColumn === "duration") {
            const aDuration = moment(a.endedAt)
                .diff(moment(a.startedAt))
                .toString();
            const bDuration = moment(b.endedAt)
                .diff(moment(b.startedAt))
                .toString();

            res = parseInt(aDuration) > parseInt(bDuration) ? 1 : -1;
        }
        if (sortColumn === "start") {
            res = a.startedAt > b.startedAt ? 1 : -1;
        }

        if (sortColumn === "started") {
            const aRuns = a.runIds.last - a.runIds.first + 1;
            const bRuns = b.runIds.last - b.runIds.first + 1;

            res = aRuns - bRuns;
        }

        if (sortColumn === "finished") {
            res = a.finishedRuns.length - b.finishedRuns.length;
        }

        if (sortColumn === "times") {
            if (a.finishedRuns.length == 0 && b.finishedRuns.length == 0)
                return -1;

            if (b.finishedRuns.length == 0) {
                return 1;
            }

            if (a.finishedRuns.length == 0) {
                return -1;
            }

            const aBestRun = a.finishedRuns.reduce((prev, curr) => {
                return parseInt(prev) < parseInt(curr)
                    ? parseInt(prev)
                    : parseInt(curr);
            });

            const bBestRun = b.finishedRuns.reduce((prev, curr) => {
                return parseInt(prev) < parseInt(curr)
                    ? parseInt(prev)
                    : parseInt(curr);
            });

            res = bBestRun - aBestRun;
        }

        if (!sortAsc) res *= -1;
        return res;
    });

    const last = Math.ceil(sessions.length / 10);
    const [active, setActive] = useState(1);
    const [items, setItems] = useState(buildItems(active, last));

    useEffect(() => {
        setItems(buildItems(active, last));
    }, [active, last]);

    const onPaginationClick = (event): void => {
        let target = "";

        if (event.target.text) {
            target = event.target.text;
        } else if (event.target.innerHTML) {
            target = event.target.innerHTML;
        }

        if (!target) return;

        if (target.includes("«")) {
            setActive(1);
        } else if (target.includes("‹")) {
            setActive(active == 1 ? 1 : active - 1);
        } else if (target.includes("›")) {
            setActive(active == last ? last : active + 1);
        } else if (target.includes("»")) {
            setActive(last);
        } else {
            if (parseInt(target)) setActive(parseInt(target));
        }
    };

    return (
        <div className="history-page">
            <Row>
                <Col className={"col-xl-6"}>
                    <h2>Speedrun Sessions</h2>
                </Col>
                <Col
                    className={"col-xl-6"}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    <label
                        htmlFor={"switch"}
                        style={{
                            marginRight: "1rem",
                            alignSelf: "center",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {" "}
                        {"Only show sessions with a run past: "}
                    </label>
                    <div style={{ alignSelf: "center" }}>
                        <select
                            className={"form-select"}
                            onChange={(e) => {
                                setRunsPast(e.currentTarget.value);
                            }}
                        >
                            <option key={"all"} value={"all"}>
                                Show all sessions
                            </option>
                            <option key={"finished"} value={"finished"}>
                                Finished runs only
                            </option>
                            <option disabled>
                                ------------------------------------
                            </option>
                            {splits.map((split, k) => {
                                return (
                                    <option key={k} value={k}>
                                        {split.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </Col>
            </Row>

            <Card body>
                <div>
                    <div
                        style={{
                            float: "left",
                            width: "98%",
                            whiteSpace: "nowrap",
                        }}
                    >
                        <Row>
                            {/* <Col xs={4}>
                                <b>+- Current PB</b>
                            </Col> */}
                            <Col
                                className={`${
                                    styles.optionalColumn
                                } ${getSortableClassName("start")}`}
                                onClick={() => changeSort("start")}
                            >
                                <b>Started At</b>
                            </Col>
                            <Col
                                className={`${
                                    styles.optionalColumn
                                } ${getSortableClassName("start")}`}
                                onClick={() => changeSort("start")}
                            >
                                <b>Ended At</b>
                            </Col>
                            <Col
                                className={getSortableClassName("duration")}
                                onClick={() => changeSort("duration")}
                            >
                                <b>Duration</b>
                            </Col>
                            <Col
                                className={`${
                                    styles.optionalColumn
                                } ${getSortableClassName("started")}`}
                                onClick={() => changeSort("started")}
                            >
                                <b>Started #</b>
                            </Col>
                            <Col
                                className={getSortableClassName("finished")}
                                onClick={() => changeSort("finished")}
                            >
                                <b>Finished #</b>
                            </Col>
                            <Col
                                className={getSortableClassName("times")}
                                onClick={() => changeSort("times")}
                            >
                                <b>Times</b>
                            </Col>
                        </Row>
                    </div>
                    <div style={{ width: "1.25rem", float: "left" }} />
                </div>
            </Card>
            <Accordion>
                {[...sessions]
                    .reverse()
                    .slice((active - 1) * 10, active * 10)
                    .map((session) => {
                        const sessionRuns = runs.filter((run, index) => {
                            return (
                                index >= session.runIds.first &&
                                index <= session.runIds.last
                            );
                        });

                        const totalRuns =
                            session.runIds.last - session.runIds.first + 1;
                        const bestTimePerSplit: number[] = [];
                        let resetPerSplit: number[] = [];
                        let currentAmount = totalRuns;

                        sessionRuns.forEach((run) => {
                            const splitCount = run.splits.length;
                            if (!resetPerSplit[splitCount])
                                resetPerSplit[splitCount] = 0;
                            resetPerSplit[splitCount]++;

                            run.splits.forEach((split, key) => {
                                if (!split) {
                                    return;
                                }

                                if (
                                    split.totalTime != "0" &&
                                    (!bestTimePerSplit[key] ||
                                        bestTimePerSplit[key] >
                                            parseInt(split.totalTime))
                                ) {
                                    bestTimePerSplit[key] = Number(
                                        split.totalTime
                                    );
                                }
                            });
                        });

                        resetPerSplit = Array.from(
                            resetPerSplit,
                            (item) => item || 0
                        );

                        return (
                            <Accordion.Item
                                key={session.endedAt}
                                eventKey={session.endedAt}
                            >
                                <Accordion.Header>
                                    <div style={{ width: "100%" }}>
                                        <Row>
                                            {/* <Col xs={4}>
                                            <Line data={data} type={"line"}/>
                                        </Col> */}
                                            <Col
                                                className={
                                                    styles.optionalColumn
                                                }
                                            >
                                                <IsoToFormatted
                                                    iso={session.startedAt}
                                                />
                                            </Col>
                                            <Col
                                                className={
                                                    styles.optionalColumn
                                                }
                                            >
                                                <IsoToFormatted
                                                    iso={session.endedAt}
                                                />
                                            </Col>
                                            <Col>
                                                <DurationToFormatted
                                                    duration={moment(
                                                        session.endedAt
                                                    )
                                                        .diff(
                                                            moment(
                                                                session.startedAt
                                                            )
                                                        )
                                                        .toString()}
                                                />
                                            </Col>
                                            <Col
                                                className={
                                                    styles.optionalColumn
                                                }
                                            >
                                                {totalRuns}
                                            </Col>
                                            <Col>
                                                {session.finishedRuns.length}
                                            </Col>
                                            <Col>
                                                {session.finishedRuns
                                                    .sort(
                                                        (a, b) =>
                                                            parseInt(a) -
                                                            parseInt(b)
                                                    )
                                                    .map((time: string) => {
                                                        return (
                                                            <>
                                                                <DurationToFormatted
                                                                    key={time}
                                                                    duration={
                                                                        time
                                                                    }
                                                                    gameTime={
                                                                        gameTime
                                                                    }
                                                                />{" "}
                                                                <br />
                                                            </>
                                                        );
                                                    })}
                                            </Col>
                                            {/*<Col>*/}

                                            {/*    {run.time ? getFormattedString(run.time): getFormattedString(run.duration)}*/}
                                            {/*</Col>*/}
                                            {/*<Col>*/}
                                            {/*    {*/}
                                            {/*        run.splits.length == splits.length ? "Finished run!" : splits[run.splits.length].name*/}
                                            {/*    }*/}
                                            {/*</Col>*/}
                                            {/*<Col>*/}
                                            {/*    {getFullDate(run.endedAt)}*/}
                                            {/*</Col>*/}
                                        </Row>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>Split</th>
                                                <th
                                                    style={{
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    Best time achieved
                                                </th>
                                                <th
                                                    className={
                                                        styles.optionalColumn
                                                    }
                                                    style={{
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    # Completed
                                                </th>
                                                <th
                                                    className={
                                                        styles.optionalColumn
                                                    }
                                                    style={{
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    # Resets
                                                </th>
                                                <th
                                                    style={{
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    Reset %
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resetPerSplit.map(
                                                (amount, index) => {
                                                    if (index === splits.length)
                                                        return;
                                                    const resetPercent =
                                                        (amount /
                                                            currentAmount) *
                                                        100;
                                                    currentAmount -= amount;
                                                    return (
                                                        <tr key={index}>
                                                            <td>
                                                                {index ===
                                                                splits.length
                                                                    ? "Finished!"
                                                                    : splits[
                                                                          index
                                                                      ].name}
                                                            </td>
                                                            <td>
                                                                {bestTimePerSplit.length <=
                                                                    index ||
                                                                !bestTimePerSplit[
                                                                    index
                                                                ] ? (
                                                                    "-"
                                                                ) : (
                                                                    <>
                                                                        <div
                                                                            style={{
                                                                                float: "left",
                                                                            }}
                                                                        >
                                                                            <DurationToFormatted
                                                                                duration={bestTimePerSplit[
                                                                                    index
                                                                                ].toString()}
                                                                                withMillis={
                                                                                    true
                                                                                }
                                                                                gameTime={
                                                                                    gameTime
                                                                                }
                                                                            />
                                                                        </div>
                                                                        <div
                                                                            style={{
                                                                                float: "left",
                                                                                marginLeft:
                                                                                    "1rem",
                                                                            }}
                                                                        >
                                                                            <Difference
                                                                                two={
                                                                                    splits[
                                                                                        index
                                                                                    ]
                                                                                        .total
                                                                                        .time
                                                                                }
                                                                                one={bestTimePerSplit[
                                                                                    index
                                                                                ].toString()}
                                                                                withMillis={
                                                                                    true
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </td>
                                                            <td
                                                                className={
                                                                    styles.optionalColumn
                                                                }
                                                            >
                                                                {currentAmount}{" "}
                                                                - (
                                                                {(
                                                                    (currentAmount /
                                                                        totalRuns) *
                                                                    100
                                                                ).toFixed(2)}
                                                                %)
                                                            </td>
                                                            <td
                                                                className={
                                                                    styles.optionalColumn
                                                                }
                                                            >
                                                                {amount}
                                                                {/*- ({(amount / totalRuns * 100).toFixed(2)}%)*/}
                                                            </td>
                                                            <td>
                                                                {resetPercent.toFixed(
                                                                    2
                                                                )}
                                                                %
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}
                                        </tbody>
                                    </Table>
                                </Accordion.Body>
                            </Accordion.Item>
                        );
                    })}
            </Accordion>

            <Pagination
                className="justify-content-center"
                onClick={onPaginationClick}
                size="lg"
            >
                {items}
            </Pagination>

            <div style={{ display: "flex", justifyContent: "center" }}>
                Showing {(active - 1) * 10 + 1} -{" "}
                {active * 10 < sessions.length ? active * 10 : sessions.length}{" "}
                out of {sessions.length} sessions{" "}
                {totalCount !== sessions.length &&
                    ` (${totalCount} without filter)`}
            </div>
        </div>
    );
};

export const buildItems = (active: number, last: number) => {
    const items = [
        <Pagination.First key="first" />,
        <Pagination.Prev key="prev" />,
    ];

    if (active > 3) {
        items.push(<Pagination.Ellipsis />);
    }

    const begin = active < 4 ? 1 : active > last - 2 ? last - 4 : active - 2;
    const end = active > last - 2 ? last + 1 : begin + 5;

    for (let number = begin; number < end; number++) {
        items.push(
            <Pagination.Item
                className="d-none d-md-block"
                key={number}
                active={number == active}
            >
                {number}
            </Pagination.Item>
        );
    }

    if (active < last - 2) {
        items.push(<Pagination.Ellipsis />);
    }

    items.push(<Pagination.Next key={"next"} />);
    items.push(<Pagination.Last key={"last"} />);

    return items;
};
