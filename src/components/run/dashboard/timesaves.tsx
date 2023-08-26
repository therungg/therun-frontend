import { RunHistory, SplitsHistory } from "~src/common/types";
import { useState } from "react";
import { Col, Row, Table } from "react-bootstrap";
import { DurationToFormatted } from "../../util/datetime";
import { InfoTooltip, UnderlineTooltip } from "../../tooltip";
import Switch from "react-switch";
import SplitName from "../../transformers/split-name";

export const Timesaves = ({
    history,
    splits,
}: {
    history: RunHistory[];
    splits: SplitsHistory[];
}) => {
    const [lastN, setLastN] = useState(
        history.length < 500 ? history.length : 500
    );
    const [sortColumn, setSortColumn] = useState("best");
    const [sortAsc, setSortAsc] = useState(true);
    const [visual, setVisual] = useState(true);

    splits = splits.map((split, key) => {
        split.key = key;

        const reachedSplitRuns = history
            .filter((run) => {
                return run.splits.length >= key;
            })
            .slice(-lastN);

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

        const values = split.values.slice(-lastN).map((val) => parseInt(val));

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

    const totalPossibleTimesave = splits
        .map((split) => split.bestDiff)
        .reduce((partial, a) => {
            return partial + a;
        }, 0);

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

    splits.sort((a, b) => {
        let res = 1;

        if (sortColumn === "timesave") {
            res = a.timeSave < b.timeSave ? 1 : -1;
        }

        if (sortColumn === "split") {
            res = a.key > b.key ? 1 : -1;
        }
        if (sortColumn === "best") {
            res = a.bestDiff < b.bestDiff ? 1 : -1;
        }
        if (sortColumn === "10") {
            res = a.tenPercentDiff < b.tenPercentDiff ? 1 : -1;
        }
        if (sortColumn === "50") {
            res = a.fiftyPercentDiff < b.fiftyPercentDiff ? 1 : -1;
        }
        if (sortColumn === "#") {
            res = a.values.length < b.values.length ? 1 : -1;
        }

        if (!sortAsc) res *= -1;
        return res;
    });

    return (
        <div>
            <Row>
                <Col lg={4} md={12}>
                    <h2>Timesaves</h2>
                </Col>
                <Col
                    lg={4}
                    md={12}
                    className="d-flex justify-content-start align-items-center justify-content-lg-center"
                >
                    <div className="me-2">Table mode</div>
                    <Switch
                        onColor={getComputedStyle(
                            document.documentElement
                        ).getPropertyValue("--bs-link-color")}
                        offColor={getComputedStyle(
                            document.documentElement
                        ).getPropertyValue("--bs-tertiary-bg")}
                        name={"switch"}
                        onChange={(checked) => {
                            setVisual(checked);
                        }}
                        checked={visual}
                    />

                    <div className="ms-2">Visual mode</div>
                </Col>
                <Col>
                    <div className="d-flex justify-content-end align-items-center mb-2 w-100">
                        <UnderlineTooltip
                            title={"Sample size"}
                            content={
                                "The sample size limits the amount of recent runs the tool takes into account." +
                                " This can be useful, because it is often not relevant to see data for a run you did 5 years ago, for example. The default is 500."
                            }
                            element={"Sample size:"}
                        />
                        <input
                            type={"number"}
                            className="form-control w-8r ms-2 bg-body-secondary"
                            onChange={(e) => {
                                let val =
                                    e.target.value > history.length
                                        ? history.length
                                        : e.target.value.replace(/\D/g, "");
                                if (val < 0) val = 500;
                                setLastN(val);
                            }}
                            value={lastN}
                        />
                    </div>
                </Col>
            </Row>
            {visual && (
                <div className="mt-3">
                    {splits
                        .slice()
                        .sort((a, b) => (a.bestDiff < b.bestDiff ? 1 : -1))
                        .slice(0, 10)
                        .map((split, key) => {
                            return (
                                <div
                                    key={`splitvisual${split.name}`}
                                    className="rounded-4 px-4 mb-2"
                                    style={{
                                        backgroundImage: `linear-gradient(to right, var(--color-positive-${key}), var(--bs-body-bg))`,
                                    }}
                                >
                                    <Row className="mt-0 py-2 mb-1 gy-3 gy-lg-0 py-lg-1 align-items-center">
                                        <Col lg={4} md={6}>
                                            <div className="fw-bold fs-big mt-0">
                                                <SplitName
                                                    splitName={split.name}
                                                />
                                            </div>
                                        </Col>
                                        <Col
                                            xl={4}
                                            lg={4}
                                            md={6}
                                            className="fs-x-medium"
                                        >
                                            <div>
                                                <div>
                                                    Possible timesave:{" "}
                                                    <b>
                                                        -
                                                        <DurationToFormatted
                                                            duration={
                                                                split.bestDiff
                                                            }
                                                            withMillis={true}
                                                        />
                                                    </b>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col>
                                            <div>
                                                Time in PB:{" "}
                                                <b>
                                                    <DurationToFormatted
                                                        duration={
                                                            split.single.time
                                                        }
                                                        withMillis={true}
                                                    />
                                                </b>
                                            </div>
                                            <div>
                                                Chance to save time:{" "}
                                                <b>
                                                    {(
                                                        split.timeSave * 100
                                                    ).toFixed(2)}
                                                    %
                                                </b>
                                            </div>
                                            <div>
                                                % of total time to save:{" "}
                                                <b>
                                                    {(
                                                        (split.bestDiff /
                                                            totalPossibleTimesave) *
                                                        100
                                                    ).toFixed(2)}
                                                    %
                                                </b>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            );
                        })}
                </div>
            )}
            {!visual && (
                <Table responsive bordered striped hover>
                    <thead>
                        <tr>
                            <th
                                className={getSortableClassName("split")}
                                onClick={() => changeSort("split")}
                            >
                                Split
                            </th>
                            <th>PB Time</th>
                            <th
                                className={getSortableClassName("best")}
                                onClick={() => changeSort("best")}
                            >
                                Possible timesave
                                <InfoTooltip
                                    title={"Possible timesave"}
                                    content={
                                        <div>
                                            This is the difference between your
                                            PB split and the best split you have
                                            ever gotten. In other words, the
                                            best split you can have (unless you
                                            gold). Note that this ignores sample
                                            size. The percentage indicates how
                                            much of the total possible timesave
                                            in the run this timesave entails.
                                        </div>
                                    }
                                />
                            </th>
                            <th
                                className={`d-none d-lg-table-cell ${getSortableClassName(
                                    "timesave"
                                )}`}
                                onClick={() => changeSort("timesave")}
                            >
                                Timesave%
                                <InfoTooltip
                                    title={"Timesave percentage"}
                                    content={
                                        <div>
                                            The chance that you both complete
                                            and save time on the split
                                        </div>
                                    }
                                />
                            </th>
                            <th
                                className={`d-none d-lg-table-cell ${getSortableClassName(
                                    "10"
                                )}`}
                                onClick={() => changeSort("10")}
                            >
                                Best 10%
                                <InfoTooltip
                                    title={"Top 10% split"}
                                    content={
                                        <div>
                                            In 10% of your runs, you save this
                                            much time or more! In the other 90%,
                                            you save less time than this.
                                        </div>
                                    }
                                />
                            </th>
                            <th
                                className={`d-none d-lg-table-cell ${getSortableClassName(
                                    "50"
                                )}`}
                                onClick={() => changeSort("50")}
                            >
                                Best 50%
                                <InfoTooltip
                                    title={"Top 50% split"}
                                    content={
                                        <div>
                                            In 50% of your runs, you save this
                                            much time or more! In the other 50%,
                                            you save less time than this. This
                                            can also be seen as your average
                                            timesave.
                                        </div>
                                    }
                                />
                            </th>
                            <th
                                className={`d-none d-lg-table-cell ${getSortableClassName(
                                    "#"
                                )}`}
                                onClick={() => changeSort("#")}
                            >
                                Split#
                                <InfoTooltip
                                    title={"Number of splits"}
                                    content={
                                        <div>
                                            The amount of splits that are
                                            considered for these stats.
                                        </div>
                                    }
                                />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {splits.map((split) => {
                            return (
                                <tr key={split.name}>
                                    <td>
                                        <SplitName splitName={split.name} />
                                    </td>
                                    <td>
                                        <DurationToFormatted
                                            duration={split.single.time}
                                            withMillis={true}
                                        />
                                    </td>

                                    <td key={split.bestDiff}>
                                        <span
                                            style={{
                                                color:
                                                    split.bestDiff >= 0
                                                        ? "var(--bs-link-color)"
                                                        : "var(--bs-red)",
                                                marginRight: "1rem",
                                            }}
                                        >
                                            {split.bestDiff >= 0 ? "-" : "+"}
                                            <DurationToFormatted
                                                duration={split.bestDiff}
                                                withMillis={true}
                                            />
                                        </span>{" "}
                                        (
                                        {(
                                            (split.bestDiff /
                                                totalPossibleTimesave) *
                                            100
                                        ).toFixed(2)}
                                        %)
                                    </td>

                                    <td className="d-none d-lg-table-cell">
                                        {split.timeSave == 0
                                            ? "Need gold"
                                            : `${(split.timeSave * 100).toFixed(
                                                  2
                                              )}%`}
                                    </td>

                                    {[
                                        split.tenPercentDiff,
                                        split.fiftyPercentDiff,
                                    ].map((val, num) => {
                                        return (
                                            <td
                                                className="d-none d-lg-table-cell"
                                                key={val + num.toString()}
                                                style={{
                                                    color:
                                                        val >= 0
                                                            ? "var(--bs-link-color)"
                                                            : "var(--bs-red)",
                                                }}
                                            >
                                                {val >= 0 ? "-" : "+"}
                                                <DurationToFormatted
                                                    duration={val}
                                                    withMillis={true}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className="d-none d-lg-table-cell">
                                        {split.values.length}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            )}
        </div>
    );
};

export default Timesaves;
