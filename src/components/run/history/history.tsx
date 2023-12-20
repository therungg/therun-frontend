import { Attempt, RunHistory, SplitsHistory } from "~src/common/types";
import {
    Difference,
    DurationToFormatted,
    getFormattedString,
    IsoToFormatted,
    timeToMillis,
} from "../../util/datetime";
import { Accordion, Card, Col, Pagination, Row, Table } from "react-bootstrap";
import React, { useEffect, useState } from "react";
import styles from "../../css/Session.module.scss";
import runStyles from "../../css/Runs.module.scss";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Switch from "react-switch";
import moment from "moment/moment";

interface RunHistoryWithCurrentPb extends RunHistory {
    currentPb?: RunHistory;
}

// This page is an unmaintainable monster, and needs to be refactored
// TODO:: FIX

export const History = ({
    history,
    splits,
}: {
    history: RunHistoryWithCurrentPb[];
    splits: SplitsHistory[];
}) => {
    const [runsPast, setRunsPast] = useState("all");

    const [sortColumn, setSortColumn] = useState("ended-at");
    const [sortAsc, setSortAsc] = useState(true);

    const [showFilters, setShowFilters] = useState(true);
    const [hasDateFilter, setHasDateFilter] = useState(false);

    const startFilter = history.filter((h) => !!h.startedAt);

    const start = new Date(
        new Date(startFilter[0].startedAt).setHours(0, 0, 0),
    );
    const end = new Date(
        new Date(startFilter[startFilter.length - 1].endedAt).setHours(
            23,
            59,
            59,
        ),
    );

    const [startDate, setStartDate] = useState(start);
    const [endDate, setEndDate] = useState(end);

    const [totalTime, setTotalTime] = useState(true);
    const [splitFilter, setSplitFilter] = useState("none");
    const [splitFilterType, setSplitFilterType] = useState("under");
    const [splitFilterOne, setSplitFilterOne] = useState(0);
    const [splitFilterTwo, setSplitFilterTwo] = useState(0);
    const [displaySplitFilterOne, setDisplaySplitFilterOne] = useState("00:00");
    const [displaySplitFilterTwo, setDisplaySplitFilterTwo] = useState("00:00");

    const startDateFilter = (date) => {
        return date >= start && date < endDate;
    };

    const endDateFilter = (date) => {
        return date >= startDate && date < end;
    };

    history = history.filter((h) => !!Date.parse(h.endedAt));

    const totalCount = history.length;

    let currentPb = null;

    history = history.map((h: RunHistory) => {
        h.currentPb = currentPb;

        if (
            h.time &&
            h.splits.length == splits.length &&
            parseInt(h.time) >= parseInt(splits[splits.length - 1].total.time)
        ) {
            if (currentPb == null || parseInt(h.time) < currentPb.time) {
                currentPb = h;
            }
        }

        return h;
    });

    if (hasDateFilter) {
        history = history.filter(
            (h) =>
                new Date(h.startedAt) <= endDate &&
                new Date(h.endedAt) >= startDate,
        );
    }

    history = history.map((h) => {
        h.splits = h.splits.filter((s) => s !== null);

        return h;
    });

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

    if (history.length > 0 && runsPast != "all") {
        if (runsPast == "finished") {
            history = history.filter((run) => !!run.time);
        } else if (runsPast == "pb") {
            history = history.filter((run) => !!run.time);

            if (history.length > 0) {
                let current = parseInt(history[0].time);

                history = history.filter((run) => {
                    if (parseInt(run.time) <= current) {
                        current = parseInt(run.time);
                        return true;
                    }
                    return false;
                });
            }
        } else {
            history = history.filter(
                (run) => run.splits.length > parseInt(runsPast),
            );
        }
    }

    const updateSplitFilters = (
        newSplitFilter: string,
        newTotalTime: boolean,
    ) => {
        if (newSplitFilter === "none") return;

        if (newSplitFilter === "duration")
            return updateSplitFiltersForDuration();

        if (newSplitFilter === "full") newSplitFilter = splits.length - 1;

        let min = 0;
        let max = 100000000000000000;
        const relevantHistory = history.filter(
            (h) =>
                h.splits.length > newSplitFilter && !!h.splits[newSplitFilter],
        );

        relevantHistory.forEach((h) => {
            const useTime = newTotalTime
                ? parseInt(h.splits[newSplitFilter].totalTime)
                : parseInt(h.splits[newSplitFilter].splitTime);

            if (!useTime) return;

            if (useTime > min) min = useTime;
            if (useTime < max) max = useTime;
        });

        setSplitFilterOne(max);
        setSplitFilterTwo(min);

        setDisplaySplitFilterOne(getFormattedString(max.toString()));
        setDisplaySplitFilterTwo(getFormattedString(min.toString()));
    };

    const updateSplitFiltersForDuration = () => {
        let min = 0;
        let max = 100000000000000000;
        const relevantHistory = history.filter((h) => !!h.duration && !!h.time);

        relevantHistory.forEach((h) => {
            const useTime = parseInt(h.duration);
            if (useTime > min) min = useTime;
            if (useTime < max) max = useTime;
        });

        setSplitFilterOne(max);
        setSplitFilterTwo(min);

        setDisplaySplitFilterOne(getFormattedString(max.toString()));
        setDisplaySplitFilterTwo(getFormattedString(min.toString()));
    };

    if (history.length > 0 && splitFilter !== "none" && splitFilterOne !== 0) {
        let currentSplitFilter = splitFilter;
        if (currentSplitFilter === "full")
            currentSplitFilter = splits.length - 1;

        history = history.filter((run) => {
            let include = false;

            if (
                !run.splits[currentSplitFilter] &&
                splitFilter !== "full" &&
                splitFilter !== "duration"
            ) {
                return false;
            }

            if (run.splits.length === 0) return false;

            if (
                (splitFilter === "full" || splitFilter === "duration") &&
                !run.time
            ) {
                return false;
            }

            let time = "";

            if (splitFilter === "duration") {
                time = run.duration;
            } else {
                const situationalCurrentSplitFilter =
                    splitFilter === "full"
                        ? run.splits.length - 1
                        : currentSplitFilter;

                time = totalTime
                    ? run.splits[situationalCurrentSplitFilter as number]
                          .totalTime
                    : run.splits[situationalCurrentSplitFilter as number]
                          .splitTime;
            }

            if (!parseInt(time) && parseInt(time) == 0) return false;

            if (time == "0") return false;

            if (splitFilterType === "under") {
                include = parseInt(time) <= splitFilterTwo;
            }

            if (splitFilterType === "over") {
                include = parseInt(time) >= splitFilterOne;
            }

            if (splitFilterType === "between") {
                include =
                    parseInt(time) <= splitFilterTwo &&
                    parseInt(time) >= splitFilterOne;
            }

            return include;
        });
    }

    history.sort((a, b) => {
        let res = 1;

        if (sortColumn === "time") {
            if (a.time || b.time) {
                if (a.time && !b.time) return 1;
                if (b.time && !a.time) return -1;
                res = parseInt(a.time) > parseInt(b.time) ? -1 : 1;
            }
        }
        if (sortColumn === "ended-at") {
            res = a.endedAt > b.endedAt ? 1 : -1;
        }

        if (sortColumn === "reset-at") {
            res = a.splits.length > b.splits.length ? 1 : -1;
        }

        if (sortColumn == "split") {
            if (splitFilter === "duration") {
                const aTime = a.duration;
                const bTime = b.duration;

                res = parseInt(aTime) > parseInt(bTime) ? -1 : 1;
            } else {
                const aTime = totalTime
                    ? a.splits[
                          splitFilter === "full"
                              ? a.splits.length - 1
                              : splitFilter
                      ].totalTime
                    : a.splits[
                          splitFilter === "full"
                              ? a.splits.length - 1
                              : splitFilter
                      ].splitTime;
                const bTime = totalTime
                    ? b.splits[
                          splitFilter === "full"
                              ? b.splits.length - 1
                              : splitFilter
                      ].totalTime
                    : b.splits[
                          splitFilter === "full"
                              ? b.splits.length - 1
                              : splitFilter
                      ].splitTime;

                res = parseInt(aTime) > parseInt(bTime) ? -1 : 1;
            }
        }

        if (!sortAsc) res *= -1;
        return res;
    });

    const [nRuns, setNRuns] = useState(history.length);

    history = history.slice(-nRuns);

    const last = Math.ceil(history.length / 10);
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

    let filterTextRunPast;
    let filterTextDate;
    let filterTextLastNRuns;
    let filterTextSplitFilter;

    if (runsPast !== "all") {
        if (runsPast === "finished") {
            filterTextRunPast = "Finished runs";
        } else if (runsPast === "pb") {
            filterTextRunPast = "Personal bests";
        } else {
            filterTextRunPast = `Past ${splits[runsPast as number].name}`;
        }
    } else {
        filterTextRunPast = null;
    }

    if (hasDateFilter) {
        filterTextDate = `${moment(startDate).format("L")} - ${moment(
            endDate,
        ).format("L")}`;
    }

    if (nRuns < totalCount) {
        filterTextLastNRuns = `Last ${nRuns} runs`;
    }

    let splitName = "";

    if (splitFilter !== "none") {
        splitName =
            splitFilter === "full"
                ? "Full run time"
                : splitFilter === "duration"
                  ? "Run duration"
                  : splits[splitFilter as number].name;

        filterTextSplitFilter = `${splitName} ${splitFilterType} `;

        switch (splitFilterType) {
            case "between":
                filterTextSplitFilter += `${getFormattedString(
                    splitFilterOne,
                )} and ${getFormattedString(splitFilterTwo)}`;
                break;
            case "under":
                filterTextSplitFilter += getFormattedString(splitFilterTwo);
                break;
            case "over":
                filterTextSplitFilter += getFormattedString(splitFilterOne);
                break;
        }
    }

    const hasFilters =
        !!filterTextRunPast ||
        !!filterTextDate ||
        !!filterTextSplitFilter ||
        !!filterTextLastNRuns;

    const removeRunPastFilter = () => {
        setRunsPast("all");
    };

    const removeRunDateFilter = () => {
        setStartDate(start);
        setEndDate(end);
        setHasDateFilter(false);
    };

    const removeLastNFilter = () => {
        setNRuns(totalCount);
    };

    const removeSplitFilter = () => {
        setSplitFilter("none");
    };

    return (
        <div className="history-page">
            <Row style={{ marginBottom: "0.5rem" }}>
                <Col xl={6}>
                    <h2 style={{ whiteSpace: "nowrap" }}>Run History</h2>
                </Col>
                <Col
                    xl={6}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    <div
                        style={{
                            alignSelf: "center",
                            fontSize: "1.5rem",
                            textDecoration:
                                "underline var(--bs-body-color) dotted",
                            cursor: "pointer",
                        }}
                        onClick={() => {
                            setShowFilters(!showFilters);
                        }}
                    >
                        Filters <Filter />
                    </div>
                </Col>
            </Row>
            {hasFilters && (
                <Row>
                    <Col xl={10} style={{ display: "flex" }}>
                        <div
                            style={{
                                marginRight: "1rem",
                                marginBottom: "0.25rem",
                            }}
                        >
                            Active filters:
                        </div>
                        {filterTextSplitFilter && (
                            <div
                                className={styles.filter}
                                onClick={removeSplitFilter}
                            >
                                {filterTextSplitFilter} <XCircle />
                            </div>
                        )}
                        {filterTextDate && (
                            <div
                                className={styles.filter}
                                onClick={removeRunDateFilter}
                            >
                                {filterTextDate} <XCircle />
                            </div>
                        )}
                        {filterTextLastNRuns && (
                            <div
                                className={styles.filter}
                                onClick={removeLastNFilter}
                            >
                                {filterTextLastNRuns} <XCircle />
                            </div>
                        )}
                        {filterTextRunPast && (
                            <div
                                className={styles.filter}
                                onClick={removeRunPastFilter}
                            >
                                {filterTextRunPast} <XCircle />
                            </div>
                        )}
                    </Col>
                    <Col
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <div
                            className={styles.filter}
                            onClick={() => {
                                removeSplitFilter();
                                removeRunDateFilter();
                                removeLastNFilter();
                                removeRunPastFilter();
                            }}
                            style={{ marginRight: 0 }}
                        >
                            Clear all filters <XCircle />
                        </div>
                    </Col>
                </Row>
            )}
            {showFilters && (
                <div
                    style={{
                        border: "1px var(--bs-secondary-bg) solid",
                        marginBottom: "1rem",
                        paddingTop: "1rem",
                    }}
                >
                    <Row>
                        <Col xl={4}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    fontSize: "1.5rem",
                                    marginBottom: "-0.5rem",
                                }}
                            >
                                Split Times
                            </div>
                            <hr />
                            <div style={{ padding: "0.5rem 1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <label
                                        htmlFor={"switch"}
                                        style={{
                                            marginRight: "0.5rem",
                                            alignSelf: "center",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {" "}
                                        {"Split filter: "}
                                    </label>

                                    <div style={{ alignSelf: "center" }}>
                                        <select
                                            className={"form-select"}
                                            onChange={(e) => {
                                                setSplitFilter(
                                                    e.currentTarget.value,
                                                );
                                                let currentTotalTime =
                                                    totalTime;

                                                if (
                                                    e.currentTarget.value ===
                                                        "full" ||
                                                    e.currentTarget.value ===
                                                        "duration"
                                                ) {
                                                    currentTotalTime = true;
                                                    setTotalTime(
                                                        currentTotalTime,
                                                    );
                                                }

                                                updateSplitFilters(
                                                    e.currentTarget.value,
                                                    currentTotalTime,
                                                );
                                            }}
                                            value={splitFilter}
                                        >
                                            <option key={"none"} value={"none"}>
                                                No filter!
                                            </option>
                                            <option
                                                key={"finalsplit"}
                                                value={"full"}
                                            >
                                                Full run
                                            </option>
                                            <option
                                                key={"duration"}
                                                value={"duration"}
                                            >
                                                Run Duration
                                            </option>
                                            <option disabled>
                                                ------------------------------------
                                            </option>
                                            {splits.map((split, k) => {
                                                return (
                                                    <option
                                                        key={`split${k}`}
                                                        value={k}
                                                    >
                                                        {split.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>

                                {/*<div style={{display: 'flex', marginBottom: '1rem'}}>*/}
                                {/*    <label htmlFor={'switch'}*/}
                                {/*           style={{*/}
                                {/*               marginRight: '10px',*/}
                                {/*               alignSelf: 'center',*/}
                                {/*               whiteSpace: 'nowrap'*/}
                                {/*           }}> Single Split </label>*/}
                                {/*    <div style={{alignSelf: 'center'}}>*/}
                                {/*        <Switch className={'normal-switch'} checkedIcon={false}*/}
                                {/*                uncheckedIcon={false}*/}
                                {/*                name={'switch'} onChange={(checked) => {*/}
                                {/*            setTotalTime(checked);*/}
                                {/*            updateSplitFilters(splitFilter, checked);*/}
                                {/*        }} checked={totalTime}/>*/}
                                {/*    </div>*/}
                                {/*    <label htmlFor={'switch'}*/}
                                {/*           style={{*/}
                                {/*               marginLeft: '10px',*/}
                                {/*               alignSelf: 'center',*/}
                                {/*               whiteSpace: 'nowrap'*/}
                                {/*           }}> Range of Splits </label>*/}
                                {/*</div>*/}
                                {splitFilter !== "none" &&
                                    splitFilter !== "full" && (
                                        <div
                                            style={{
                                                display: "flex",
                                                marginBottom: "1rem",
                                            }}
                                        >
                                            <label
                                                htmlFor={"switch"}
                                                style={{
                                                    marginRight: "10px",
                                                    alignSelf: "center",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {" "}
                                                Segment time{" "}
                                            </label>
                                            <div
                                                style={{ alignSelf: "center" }}
                                            >
                                                <Switch
                                                    className={"normal-switch"}
                                                    checkedIcon={false}
                                                    uncheckedIcon={false}
                                                    name={"switch"}
                                                    onChange={(checked) => {
                                                        setTotalTime(checked);
                                                        updateSplitFilters(
                                                            splitFilter,
                                                            checked,
                                                        );
                                                    }}
                                                    checked={totalTime}
                                                />
                                            </div>
                                            <label
                                                htmlFor={"switch"}
                                                style={{
                                                    marginLeft: "10px",
                                                    alignSelf: "center",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {" "}
                                                Total time{" "}
                                            </label>
                                        </div>
                                    )}
                                {splitFilter !== "none" && (
                                    <div
                                        style={{
                                            display: "flex",
                                            marginBottom: "1rem",
                                        }}
                                    >
                                        <label
                                            htmlFor={"switch"}
                                            style={{
                                                marginRight: "0.5rem",
                                                alignSelf: "center",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {" "}
                                            {"Time "}
                                        </label>
                                        <select
                                            className={"form-select"}
                                            value={splitFilterType}
                                            style={{ width: "8rem" }}
                                            onChange={(e) => {
                                                setSplitFilterType(
                                                    e.currentTarget.value,
                                                );
                                            }}
                                        >
                                            {["under", "over", "between"].map(
                                                (split) => {
                                                    return (
                                                        <option
                                                            key={split}
                                                            value={split}
                                                        >
                                                            {split}
                                                        </option>
                                                    );
                                                },
                                            )}
                                        </select>

                                        {(splitFilterType === "between" ||
                                            splitFilterType === "over") && (
                                            <input
                                                type={"text"}
                                                className={runStyles.datePicker}
                                                style={{
                                                    cursor: "revert",
                                                    margin: "0 0.5rem",
                                                    width: "7rem",
                                                }}
                                                value={displaySplitFilterOne}
                                                onChange={(e) => {
                                                    const res = timeToMillis(
                                                        e.target.value,
                                                    );
                                                    setSplitFilterOne(res);
                                                    setDisplaySplitFilterOne(
                                                        e.target.value,
                                                    );
                                                }}
                                            />
                                        )}
                                        {(splitFilterType === "between" ||
                                            splitFilterType === "under") && (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                            >
                                                {splitFilterType ===
                                                    "between" && "and"}

                                                <input
                                                    type={"text"}
                                                    className={
                                                        runStyles.datePicker
                                                    }
                                                    style={{
                                                        cursor: "revert",
                                                        margin: "0 0.5rem",
                                                        width: "7rem",
                                                    }}
                                                    value={
                                                        displaySplitFilterTwo
                                                    }
                                                    onChange={(e) => {
                                                        const res =
                                                            timeToMillis(
                                                                e.target.value,
                                                            );
                                                        setSplitFilterTwo(res);
                                                        setDisplaySplitFilterTwo(
                                                            e.target.value,
                                                        );
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Col>
                        <Col xl={4}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    fontSize: "1.5rem",
                                    marginBottom: "-0.5rem",
                                }}
                            >
                                Date
                            </div>
                            <hr />

                            <div style={{ padding: "0.5rem 1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <label
                                        htmlFor={"switch"}
                                        style={{
                                            marginRight: "0.5rem",
                                            alignSelf: "center",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {" "}
                                        {"Started between:"}
                                    </label>
                                    <div style={{ alignSelf: "center" }}>
                                        <DatePicker
                                            className={runStyles.datePicker}
                                            selected={startDate}
                                            onChange={(date) => {
                                                setStartDate(date);
                                                setHasDateFilter(true);
                                            }}
                                            filterDate={startDateFilter}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            alignSelf: "center",
                                            margin: "0 0.5rem",
                                        }}
                                    >
                                        and
                                    </div>
                                    <div style={{ alignSelf: "center" }}>
                                        <DatePicker
                                            className={runStyles.datePicker}
                                            selected={endDate}
                                            onChange={(date) => {
                                                setEndDate(date);
                                                setHasDateFilter(true);
                                            }}
                                            filterDate={endDateFilter}
                                        />
                                    </div>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        marginBottom: "1rem",
                                        alignItems: "center",
                                    }}
                                >
                                    Only show the last
                                    <input
                                        type={"number"}
                                        className={runStyles.datePicker}
                                        style={{
                                            cursor: "revert",
                                            margin: "0 0.5rem",
                                            width: "5rem",
                                        }}
                                        value={nRuns}
                                        onChange={(e) => {
                                            setNRuns(parseInt(e.target.value));
                                        }}
                                    />
                                    runs
                                </div>
                            </div>
                        </Col>
                        <Col xl={4}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    fontSize: "1.5rem",
                                    marginBottom: "-0.5rem",
                                }}
                            >
                                Run Length
                            </div>
                            <hr />
                            <div style={{ padding: "0.5rem 1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        marginBottom: "1rem",
                                    }}
                                >
                                    <label
                                        htmlFor={"switch"}
                                        style={{
                                            marginRight: "0.5rem",
                                            alignSelf: "center",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {" "}
                                        {"Completed split: "}
                                    </label>
                                    <div style={{ alignSelf: "center" }}>
                                        <select
                                            className={"form-select"}
                                            onChange={(e) => {
                                                setRunsPast(
                                                    e.currentTarget.value,
                                                );
                                            }}
                                            value={runsPast}
                                        >
                                            <option key={"all"} value={"all"}>
                                                Show all runs
                                            </option>
                                            <option
                                                key={"finished"}
                                                value={"finished"}
                                            >
                                                Show finished runs only
                                            </option>
                                            <option key={"pb"} value={"pb"}>
                                                Show personal bests only
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
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>
            )}

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
                                className={getSortableClassName("time")}
                                onClick={() => changeSort("time")}
                            >
                                <b> Final time</b>
                            </Col>
                            <Col>
                                <b>Duration</b>
                            </Col>
                            <Col
                                className={getSortableClassName("reset-at")}
                                onClick={() => changeSort("reset-at")}
                            >
                                <b>Reset at</b>
                            </Col>
                            <Col
                                className={`${
                                    styles.optionalColumn
                                } ${getSortableClassName("ended-at")}`}
                                onClick={() => changeSort("ended-at")}
                            >
                                <b>Ended at</b>
                            </Col>
                            {!!splitName && (
                                <Col
                                    className={`${
                                        styles.optionalColumn
                                    } ${getSortableClassName("split")}`}
                                    onClick={() => changeSort("split")}
                                >
                                    <b>{splitName}</b>
                                </Col>
                            )}
                        </Row>
                    </div>
                    <div style={{ width: "1.25rem", float: "left" }} />
                </div>
            </Card>
            <Accordion>
                {[...history]
                    .reverse()
                    .slice((active - 1) * 10, active * 10)
                    .map((run) => {
                        let filterString = "";
                        if (splitFilter === "duration") {
                            filterString = getFormattedString(run.duration);
                        } else if (splitName) {
                            filterString = getFormattedString(
                                totalTime
                                    ? run.splits[
                                          splitFilter === "full"
                                              ? run.splits.length - 1
                                              : splitFilter
                                      ].totalTime
                                    : run.splits[
                                          splitFilter === "full"
                                              ? run.splits.length - 1
                                              : splitFilter
                                      ].splitTime,
                                true,
                            );
                        }

                        return (
                            <Accordion.Item
                                key={
                                    run.endedAt +
                                    run.time +
                                    run.startedAt +
                                    run.duration
                                }
                                eventKey={run.endedAt}
                            >
                                <Accordion.Header>
                                    <div style={{ width: "100%" }}>
                                        <Row>
                                            {/* <Col xs={4}>
                                            <Line data={data} type={"line"}/>
                                        </Col> */}
                                            <Col>
                                                <div
                                                    style={
                                                        run.time
                                                            ? { color: "green" }
                                                            : { color: "red" }
                                                    }
                                                >
                                                    {run.time
                                                        ? getFormattedString(
                                                              run.time,
                                                          )
                                                        : "Reset"}
                                                </div>
                                            </Col>
                                            <Col>
                                                {run.time
                                                    ? getFormattedString(
                                                          run.time,
                                                      )
                                                    : getFormattedString(
                                                          run.duration,
                                                      )}
                                            </Col>
                                            <Col>
                                                {run.time
                                                    ? "Finished run!"
                                                    : run.splits.length ==
                                                        splits.length
                                                      ? splits[
                                                            splits.length - 1
                                                        ].name
                                                      : splits[
                                                            run.splits.length
                                                        ].name}
                                            </Col>
                                            <Col
                                                className={
                                                    styles.optionalColumn
                                                }
                                            >
                                                <IsoToFormatted
                                                    iso={run.endedAt}
                                                />
                                            </Col>
                                            {!!splitName && (
                                                <Col
                                                    className={
                                                        styles.optionalColumn
                                                    }
                                                >
                                                    {filterString}
                                                </Col>
                                            )}
                                        </Row>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body
                                    style={{ margin: 0, padding: 0 }}
                                >
                                    <Table
                                        className="table-striped table"
                                        style={{ marginBottom: "0" }}
                                    >
                                        <thead>
                                            <tr>
                                                <th
                                                    style={{ width: "34%" }}
                                                ></th>
                                                <th style={{ width: "33%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Compared to Current PB (
                                                        <DurationToFormatted
                                                            duration={
                                                                splits[
                                                                    splits.length -
                                                                        1
                                                                ].total.time
                                                            }
                                                        />
                                                        )
                                                    </div>
                                                </th>
                                                <th style={{ width: "33%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Compared to PB at the
                                                        time (
                                                        <DurationToFormatted
                                                            duration={
                                                                run.currentPb
                                                                    ?.time
                                                            }
                                                        />
                                                        )
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                    </Table>
                                    <Table
                                        className="table-striped table"
                                        style={{ marginBottom: "0" }}
                                    >
                                        <thead>
                                            <tr>
                                                <th style={{ width: "20%" }}>
                                                    Split
                                                </th>
                                                <th style={{ width: "7%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Segment
                                                    </div>
                                                </th>
                                                <th style={{ width: "7%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Total
                                                    </div>
                                                </th>
                                                <th style={{ width: "11%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        +- Current PB
                                                    </div>
                                                </th>
                                                <th style={{ width: "11%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Segment Time
                                                    </div>
                                                </th>
                                                <th style={{ width: "11%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Total Time
                                                    </div>
                                                </th>
                                                <th style={{ width: "11%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        +- PB at the time
                                                    </div>
                                                </th>
                                                <th style={{ width: "11%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Segment Time
                                                    </div>
                                                </th>
                                                <th style={{ width: "11%" }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        Total Time
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {run.splits
                                                .filter((split) => !!split)
                                                .map((split, key) => {
                                                    const splitAtTheTime =
                                                        run.currentPb?.splits[
                                                            key
                                                        ];
                                                    return (
                                                        <tr key={key}>
                                                            <td>
                                                                {
                                                                    splits[key]
                                                                        .name
                                                                }
                                                            </td>
                                                            <td>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    {split.splitTime >
                                                                    0 ? (
                                                                        <DurationToFormatted
                                                                            duration={
                                                                                split.splitTime
                                                                            }
                                                                            withMillis={
                                                                                true
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    borderRight:
                                                                        "3px solid var(--bs-tertiary-bg)",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    {split.totalTime >
                                                                    0 ? (
                                                                        <DurationToFormatted
                                                                            duration={
                                                                                split.totalTime
                                                                            }
                                                                            withMillis={
                                                                                true
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    {split.totalTime >
                                                                    0 ? (
                                                                        <Difference
                                                                            one={
                                                                                split.totalTime
                                                                            }
                                                                            two={
                                                                                splits[
                                                                                    key
                                                                                ]
                                                                                    .total
                                                                                    .time
                                                                            }
                                                                            withMillis={
                                                                                true
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    <DurationToFormatted
                                                                        duration={
                                                                            splits[
                                                                                key
                                                                            ]
                                                                                .single
                                                                                .time
                                                                        }
                                                                        withMillis={
                                                                            true
                                                                        }
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td
                                                                style={{
                                                                    borderRight:
                                                                        "1px solid var(--bs-tertiary-bg)",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    <DurationToFormatted
                                                                        duration={
                                                                            splits[
                                                                                key
                                                                            ]
                                                                                .total
                                                                                .time
                                                                        }
                                                                        withMillis={
                                                                            true
                                                                        }
                                                                    />
                                                                </div>
                                                            </td>

                                                            <td>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    {splitAtTheTime &&
                                                                    split.totalTime >
                                                                        0 ? (
                                                                        <Difference
                                                                            one={
                                                                                split.totalTime
                                                                            }
                                                                            two={
                                                                                splitAtTheTime?.totalTime
                                                                            }
                                                                            withMillis={
                                                                                true
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    <DurationToFormatted
                                                                        duration={
                                                                            splitAtTheTime?.splitTime
                                                                        }
                                                                        withMillis={
                                                                            true
                                                                        }
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        justifyContent:
                                                                            "center",
                                                                    }}
                                                                >
                                                                    <DurationToFormatted
                                                                        duration={
                                                                            splitAtTheTime?.totalTime
                                                                        }
                                                                        withMillis={
                                                                            true
                                                                        }
                                                                    />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
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
                {active * 10 < history.length ? active * 10 : history.length}{" "}
                out of {history.length} runs{" "}
                {totalCount !== history.length &&
                    ` (${totalCount} without filter)`}
            </div>
        </div>
    );
};

const buildItems = (active: number, last: number) => {
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
            </Pagination.Item>,
        );
    }

    if (active < last - 2) {
        items.push(<Pagination.Ellipsis />);
    }

    items.push(<Pagination.Next key={"next"} />);
    items.push(<Pagination.Last key={"last"} />);

    return items;
};

export const getLineGraphData = (run: RunHistory, splits: SplitsHistory[]) => {
    return {
        labels: run.splits
            .filter((attempt) => !!attempt)
            .map((attempt: Attempt, key) => {
                return splits[key].name;
            }),
        datasets: [
            {
                label: "Recent runs",
                fill: false,
                lineTension: 0.1,
                backgroundColor: "rgba(75,192,192,0.4)",
                borderColor: "rgba(75,192,192,1)",
                borderCapStyle: "butt",
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: "miter",
                pointBorderColor: "rgba(75,192,192,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: "rgba(75,192,192,1)",
                pointHoverBorderColor: "rgba(220,220,220,1)",
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: run.splits
                    .filter((attempt) => !!attempt)
                    .map((attempt: Attempt) => attempt.time),
            },
        ],
    };
};

export const Filter = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="bi bi-funnel-fill"
            viewBox="0 0 16 16"
        >
            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2z" />
        </svg>
    );
};

export const XCircle = ({ color = "currentColor" }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill={color}
            className="bi bi-x-circle"
            style={{ marginLeft: "0.2rem", paddingBottom: "0.2rem" }}
            viewBox="0 0 16 16"
        >
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
    );
};
