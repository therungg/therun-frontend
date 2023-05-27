import { RunHistory, SplitsHistory } from "../../../common/types";
import {
    GoldHistory,
    GoldProgressionGraph,
    GoldSplit,
} from "../splits/gold-progression-graph";
import { Col, Pagination, Row, Table } from "react-bootstrap";
import { DurationToFormatted, IsoToFormatted } from "../../util/datetime";
import moment from "moment/moment";
import { useEffect, useState } from "react";
import { buildItems } from "../run-sessions/game-sessions";
import paginationStyles from "../../css/Pagination.module.scss";
import { BestAchievedGraph } from "../splits/best-achieved-graph";
import { UnderlineTooltip } from "../../tooltip";
import { isOutlier } from "../splits/split-stats";
import { convertSplitName, SplitName } from "../../transformers/split-name";

// This whole page is a shitshow. It's slow, crashes on large split files (30k+ splits) due to the json parse stringify stuff,
// and the undoing split merge is fully broken. Have to fix somewhere along the line.
// Also, it's unreadable
// TODO:: Fix
export const Golds = ({
    history,
    splits,
}: {
    history: RunHistory[];
    splits: SplitsHistory[];
}) => {
    const [splitFilter, setSplitFilter] = useState("no-filter");
    const [sortColumn, setSortColumn] = useState("date");
    const [sortAsc, setSortAsc] = useState(true);
    const [useHistory, setUseHistory] = useState(
        history.length > 20000
            ? [...history]
            : JSON.parse(JSON.stringify(history))
    );
    const [useSplits, setUseSplits] = useState(
        JSON.parse(JSON.stringify(splits))
    );
    const [hasMergedSplits, setHasMergedSplits] = useState(false);

    const subsplits = useSplits.filter((split: SplitsHistory) => {
        return split.name.toString().startsWith("-");
    });

    const hasSubsplits =
        subsplits.length > 0 && subsplits.length < useSplits.length;

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

    let allGoldsSorted: GoldHistory = [];

    const goldRuns: GoldHistory = useSplits.map((split, arrayKey) => {
        const key = split.id;

        if (key == undefined) return <></>;

        const golds: GoldHistory = [];

        useHistory
            .filter(
                (run) =>
                    run.splits.length > key - 1 && run.startedAt != undefined
            )
            .forEach((run) => {
                if (run.startedAt == undefined) return false;

                const currentSplit = run.splits[key];

                const combinedSplitNames = [split.name];

                if (split.mergedSplits !== undefined) {
                    combinedSplitNames.push(...split.mergedSplits);
                }

                const bestPossibleTime = combinedSplitNames
                    .map((search) => {
                        return parseInt(
                            splits.find((thisSplit) => thisSplit.name == search)
                                .single.bestPossibleTime
                        );
                    })
                    .reduce((a, partial) => a + partial, 0);

                if (!currentSplit || currentSplit.splitTime == "0")
                    return false;

                if (parseInt(currentSplit.splitTime) < bestPossibleTime)
                    return false;

                if (
                    isOutlier(
                        parseInt(split.single.averageTime),
                        parseInt(split.single.stdDev),
                        parseInt(currentSplit.splitTime),
                        true
                    )
                ) {
                    return false;
                }

                if (
                    golds.length == 0 ||
                    parseInt(golds[golds.length - 1].time) >
                        parseInt(currentSplit.splitTime)
                ) {
                    const gold: GoldSplit = {
                        time: currentSplit.splitTime,
                        date: run.startedAt,
                        totalTime: currentSplit.totalTime,
                        split: split.name,
                        splitKey: arrayKey,
                        nthGold: golds.length,
                        mergedSplits: split.mergedSplits,
                    };
                    golds.push(gold);
                    allGoldsSorted.push(gold);
                }
            });

        return golds as GoldHistory;
    });

    const totalCount = allGoldsSorted.length;

    allGoldsSorted.sort((a, b) => {
        let res = 1;

        if (sortColumn === "date") {
            if (!a.date) return 1;
            if (!b.date) return -1;

            if (a.date === b.date) {
                return a.splitKey < b.splitKey ? 1 : -1;
            }
            const aDuration = moment(a.date).diff(moment(b.date)).toString();

            res = parseInt(aDuration) < 0 ? 1 : -1;
        }

        if (sortColumn === "split") {
            if (a.splitKey == b.splitKey) res = 0;
            else res = a.splitKey > b.splitKey ? 1 : -1;
        }

        if (sortColumn === "improved") {
            const aprevSplit = goldRuns[a.splitKey as number][a.nthGold - 1];
            const bprevSplit = goldRuns[b.splitKey as number][b.nthGold - 1];

            const adiff = aprevSplit
                ? parseInt(a.time) - parseInt(aprevSplit.time)
                : null;
            const bdiff = bprevSplit
                ? parseInt(b.time) - parseInt(bprevSplit.time)
                : null;

            if (adiff === bdiff) return 0;

            if (adiff === null || bdiff === null) return 1;

            res = adiff > bdiff ? -1 : 1;
        }

        if (!sortAsc) res *= -1;
        return res;
    });

    if (splitFilter !== "no-filter") {
        allGoldsSorted = allGoldsSorted.filter(
            (gold) => gold.split === splitFilter
        );
    }

    const last = Math.ceil(allGoldsSorted.length / 10);
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

    const removeSplit = (n: number) => {
        removeSplitNFromHistory(n);
        removeSplitNFromSplits(n);
        setHasMergedSplits(true);
    };

    const removeSplitNFromHistory = (n: number) => {
        const newHistory = useHistory.map((runHistory: RunHistory) => {
            const prevSplit = runHistory.splits[n];
            const currentSplit = runHistory.splits[n + 1];

            if (!currentSplit || !prevSplit) {
                if (prevSplit) {
                    runHistory.splits.splice(n, 1);
                }
                return runHistory;
            }

            if (prevSplit.splitTime == "0" || currentSplit.splitTime == "0") {
                currentSplit.splitTime = "0";
            } else if (
                parseInt(prevSplit.splitTime) <
                    parseInt(useSplits[n].single.bestPossibleTime) ||
                parseInt(currentSplit.splitTime) <
                    parseInt(useSplits[n + 1].single.bestPossibleTime)
            ) {
                currentSplit.splitTime = "0";
            } else {
                currentSplit.splitTime = (
                    parseInt(prevSplit.splitTime) +
                    parseInt(currentSplit.splitTime)
                ).toString();
            }

            runHistory.splits.splice(n, 1);

            return runHistory;
        });

        setUseHistory(newHistory);
    };

    const removeSplitNFromSplits = (n: number) => {
        const name = useSplits[n].name;

        if (!useSplits[n + 1].mergedSplits) {
            useSplits[n + 1].mergedSplits = [];
        }

        useSplits[n + 1].mergedSplits.push(name);

        if (useSplits[n].mergedSplits) {
            useSplits[n + 1].mergedSplits.push(...useSplits[n].mergedSplits);
        }

        useSplits.splice(n, 1);

        const newUseSplits = useSplits.map((s, k) => {
            if (k >= n) s.id--;

            return s;
        });

        setUseSplits(newUseSplits);
    };

    const collapseSubsplits = async () => {
        let firstSubSplit = useSplits.findIndex((split: SplitsHistory) =>
            split.name.toString().startsWith("-")
        );

        while (firstSubSplit !== -1) {
            removeSplit(firstSubSplit);
            // await new Promise(r => setTimeout(r, 5));
            firstSubSplit = useSplits.findIndex((split: SplitsHistory) =>
                split.name.toString().startsWith("-")
            );
        }
    };

    return (
        <div>
            <Row>
                <Col md={6} sm={12}>
                    <h2 style={{ width: "18rem" }}>
                        {splitFilter == "no-filter" ? (
                            "Gold Explorer"
                        ) : (
                            <a
                                href={"#"}
                                onClick={() => {
                                    setSplitFilter("no-filter");
                                }}
                            >
                                Gold Explorer
                            </a>
                        )}
                    </h2>
                </Col>
                <Col>
                    <div
                        style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            marginBottom: "0.5rem",
                        }}
                    >
                        <select
                            style={{ width: "20rem" }}
                            className={"form-select"}
                            onChange={(e) => {
                                setSplitFilter(e.target.value);
                                setActive(1);
                            }}
                            value={splitFilter}
                        >
                            <option
                                key={"no-filter"}
                                title={"No split filter"}
                                value={"no-filter"}
                            >
                                No split filter
                            </option>
                            <option
                                key={"empty"}
                                title={"------------------------------------"}
                                value={"no-filter"}
                                disabled
                            >
                                ------------------------------------
                            </option>
                            {useSplits.map((split, n) => {
                                return (
                                    <option
                                        key={split.name + n}
                                        value={split.name}
                                    >
                                        {convertSplitName(split.name)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </Col>
            </Row>
            <hr />
            <Row>
                <Col xl={6} lg={12}>
                    <Row>
                        <Col>
                            <h3>Stats</h3>
                        </Col>
                        {splitFilter == "no-filter" && hasMergedSplits && (
                            <Col
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    color: "var(--color-link)",
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    setUseSplits(
                                        JSON.parse(JSON.stringify(splits))
                                    );
                                    setUseHistory(
                                        JSON.parse(JSON.stringify(history))
                                    );
                                    setHasMergedSplits(false);
                                }}
                            >
                                <UnderlineTooltip
                                    title={"Undo"}
                                    content={
                                        "Undo all merged splits and go back to all splits"
                                    }
                                    element={<Undo />}
                                />
                            </Col>
                        )}
                        {splitFilter == "no-filter" &&
                            !hasMergedSplits &&
                            hasSubsplits && (
                                <Col
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        alignItems: "center",
                                        color: "var(--color-link)",
                                        cursor: "pointer",
                                    }}
                                    onClick={async () => {
                                        await collapseSubsplits();
                                    }}
                                >
                                    <UnderlineTooltip
                                        title={"Merge subsplits"}
                                        content={
                                            "This will merge all splits within a subsplit to the subsplit"
                                        }
                                        element={<Collapse />}
                                    />
                                </Col>
                            )}
                    </Row>
                    <Table responsive striped bordered hover>
                        <thead>
                            <tr>
                                <th>Split</th>
                                <th>Time</th>
                                <th># Golds</th>
                                <th>Achieved at</th>
                                <th
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <UnderlineTooltip
                                        title={"Grouping splits"}
                                        content={
                                            "This tool allows you to group multiple splits together. " +
                                            "When you press the arrow behind a split, it will be grouped with the split after it." +
                                            " The gold will then be recalculated, and you will see the best time you got these two splits in a run." +
                                            " This allows you to group the run into custom segments. " +
                                            "Clicking Reset merged splits resets all splits."
                                        }
                                        element={"Merge"}
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {goldRuns
                                .filter((golds: GoldSplit[]) => {
                                    if (splitFilter == "no-filter") return true;
                                    const best = golds[golds.length - 1];

                                    return best && splitFilter == best.split;
                                })
                                .map((golds: GoldSplit[], n, a) => {
                                    const best = golds[golds.length - 1];

                                    if (!best) return <></>;
                                    return (
                                        <tr
                                            key={
                                                best.split + n + best.totalTime
                                            }
                                        >
                                            <td style={{ display: "flex" }}>
                                                {splitFilter === "no-filter" ? (
                                                    <a
                                                        href={"#"}
                                                        onClick={() => {
                                                            setSplitFilter(
                                                                best.split
                                                            );
                                                        }}
                                                    >
                                                        <SplitName
                                                            splitName={
                                                                best.split
                                                            }
                                                        />
                                                    </a>
                                                ) : (
                                                    <SplitName
                                                        splitName={best.split}
                                                    />
                                                )}
                                                {best.mergedSplits && (
                                                    <div
                                                        style={{
                                                            marginLeft:
                                                                "0.2rem",
                                                        }}
                                                    >
                                                        <UnderlineTooltip
                                                            title={
                                                                "Merged Splits"
                                                            }
                                                            content={
                                                                <div>
                                                                    {best.mergedSplits.map(
                                                                        (
                                                                            name
                                                                        ) => (
                                                                            <div
                                                                                key={
                                                                                    name
                                                                                }
                                                                            >
                                                                                {
                                                                                    name
                                                                                }
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            }
                                                            element={
                                                                best.mergedSplits &&
                                                                `+ ${best.mergedSplits.length}`
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <DurationToFormatted
                                                    duration={best.time}
                                                    withMillis={true}
                                                />
                                            </td>
                                            <td>{golds.length - 1}</td>
                                            <td>
                                                <IsoToFormatted
                                                    iso={moment(best.date)
                                                        .add(
                                                            best.totalTime,
                                                            "milliseconds"
                                                        )
                                                        .toISOString()}
                                                />
                                            </td>
                                            {n < a.length - 1 && (
                                                <td
                                                    style={{}}
                                                    onClick={() => {
                                                        removeSplit(n);
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            cursor: "pointer",
                                                            color: "var(--color-link)",
                                                            justifyContent:
                                                                "center",
                                                        }}
                                                    >
                                                        <DownArrow />
                                                    </div>
                                                </td>
                                            )}
                                            {n == a.length - 1 && <td></td>}
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </Table>
                    {splitFilter !== "no-filter" && (
                        <Row>
                            <Col xl={6} lg={12}>
                                <div>
                                    <GoldProgressionGraph
                                        history={useHistory}
                                        split={useSplits.find(
                                            (split) =>
                                                split.name === splitFilter
                                        )}
                                    />
                                </div>
                            </Col>
                            <Col>
                                <div>
                                    <BestAchievedGraph
                                        history={useHistory}
                                        split={useSplits.find(
                                            (split) =>
                                                split.name === splitFilter
                                        )}
                                    />
                                </div>
                            </Col>
                        </Row>
                    )}
                </Col>
                <Col xl={6} lg={12}>
                    <h3>History</h3>
                    <Table responsive striped bordered hover>
                        <thead>
                            <tr>
                                <th
                                    className={getSortableClassName("date")}
                                    onClick={() => changeSort("date")}
                                >
                                    Date
                                </th>
                                <th
                                    className={getSortableClassName("split")}
                                    onClick={() => changeSort("split")}
                                >
                                    Split
                                </th>
                                <th
                                    className={getSortableClassName("date")}
                                    onClick={() => changeSort("date")}
                                >
                                    Time
                                </th>
                                <th
                                    className={getSortableClassName("improved")}
                                    onClick={() => changeSort("improved")}
                                >
                                    Improved
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {allGoldsSorted
                                .slice((active - 1) * 10, active * 10)
                                .map((gold) => {
                                    const prevSplit =
                                        goldRuns[gold.splitKey as number][
                                            gold.nthGold - 1
                                        ];

                                    const diff = prevSplit
                                        ? parseInt(gold.time) -
                                          parseInt(prevSplit.time)
                                        : null;

                                    return (
                                        <tr
                                            key={
                                                gold.date +
                                                gold.splitKey +
                                                gold.totalTime
                                            }
                                        >
                                            <td>
                                                <IsoToFormatted
                                                    iso={moment(gold.date)
                                                        .add(
                                                            gold.totalTime,
                                                            "milliseconds"
                                                        )
                                                        .toISOString()}
                                                />
                                            </td>
                                            <td>{gold.split}</td>
                                            <td>
                                                <DurationToFormatted
                                                    duration={gold.time}
                                                    withMillis={true}
                                                />
                                            </td>
                                            <td>
                                                {diff === null ? (
                                                    "First split"
                                                ) : (
                                                    <div
                                                        style={{
                                                            color: "var(--color-link)",
                                                        }}
                                                    >
                                                        {"-"}
                                                        <DurationToFormatted
                                                            duration={diff.toString()}
                                                            withMillis={true}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </Table>

                    <div className={paginationStyles.paginationWrapper}>
                        <Pagination onClick={onPaginationClick} size="lg">
                            {items}
                        </Pagination>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        Showing {(active - 1) * 10 + 1} -{" "}
                        {active * 10 < allGoldsSorted.length
                            ? active * 10
                            : allGoldsSorted.length}{" "}
                        out of {allGoldsSorted.length} golds{" "}
                        {totalCount !== allGoldsSorted.length &&
                            ` (${totalCount} without filter)`}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

const DownArrow = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            fill="currentColor"
            className="bi bi-arrow-down-circle-fill"
            viewBox="0 0 16 16"
        >
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.5 4.5a.5.5 0 0 0-1 0v5.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V4.5z" />
        </svg>
    );
};

const Undo = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="bi bi-arrow-counterclockwise"
            viewBox="0 0 16 16"
        >
            <path
                fillRule="evenodd"
                d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"
            />
            <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" />
        </svg>
    );
};

const Collapse = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            className="bi bi-arrows-collapse"
            viewBox="0 0 16 16"
        >
            <path
                fillRule="evenodd"
                d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8zm7-8a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 4.293V.5A.5.5 0 0 1 8 0zm-.5 11.707-1.146 1.147a.5.5 0 0 1-.708-.708l2-2a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 11.707V15.5a.5.5 0 0 1-1 0v-3.793z"
            />
        </svg>
    );
};

export default Golds;
