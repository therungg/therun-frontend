import { RunHistory, SplitsHistory } from "~src/common/types";
import { Accordion, Card, Col, Row } from "react-bootstrap";
import { Difference, DurationToFormatted } from "../../util/datetime";
import { GoldProgressionGraph } from "./gold-progression-graph";
import { SplitOverTimeGraph } from "./split-over-time-graph";
import Switch from "react-switch";
import { useState } from "react";
import { SplitGraph } from "./split-graph";
import styles from "../../css/SplitStats.module.scss";
import SplitName from "../../transformers/split-name";
import { UnderlineTooltip } from "../../tooltip";

export const SplitStats = ({
    history,
    splits,
    gameTime = false,
}: {
    history: RunHistory[];
    splits: SplitsHistory[];
    gameTime: boolean;
}) => {
    const [showDifference, setShowDifference] = useState(false);
    const [showTotal, setShowTotal] = useState(false);
    const [openAccs, setOpenAccs] = useState([]);
    const [selectedComparison, setSelectedComparison] = useState("Best ever");

    const idSplits = splits.map((split, key) => {
        split.id = key;

        return split;
    });

    const handleAccordionChange = async (event, key: number) => {
        const newOpenAccs = Array.from(openAccs);
        newOpenAccs[key] = !openAccs[key];
        setOpenAccs(newOpenAccs);
    };

    return (
        <>
            <Row>
                <Col xl={9}>
                    <h2 style={{ whiteSpace: "nowrap" }}>Splits Stats</h2>
                </Col>
                <Col
                    xl={3}
                    style={{ display: "flex", justifyContent: "flex-end" }}
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
                        Show times as +- PB{" "}
                    </label>
                    <div style={{ alignSelf: "center" }}>
                        <Switch
                            name={"switch"}
                            onChange={(checked) => {
                                setShowDifference(checked);
                            }}
                            checked={showDifference}
                        />
                    </div>
                </Col>
            </Row>
            <Card body>
                <div>
                    <div style={{ float: "left", width: "98%" }}>
                        <Row style={{ whiteSpace: "nowrap" }}>
                            <Col style={{ minWidth: "25%" }}>
                                <b>Split</b>
                            </Col>
                            <Col>
                                <b>PB</b>
                            </Col>
                            <Col className={styles.splitComparisonOption}>
                                <select
                                    style={{ padding: "0 2.25rem 0 0" }}
                                    className={
                                        `form-select` +
                                        ` ${styles.hideSelectArrow}`
                                    }
                                    value={selectedComparison}
                                    onChange={(e) => {
                                        setSelectedComparison(e.target.value);
                                    }}
                                >
                                    {[
                                        "Best ever",
                                        "Average",
                                        "Reached #",
                                        "Reset %",
                                        "Completion %",
                                        "Standard Deviation",
                                        "Consistency",
                                    ].map((alt) => {
                                        return (
                                            <option key={alt} value={alt}>
                                                {alt}
                                            </option>
                                        );
                                    })}
                                </select>
                            </Col>
                            <Col className={styles.splitDetailColumn}>
                                <b>Best ever</b>
                            </Col>
                            <Col className={styles.splitDetailColumn}>
                                <b>Average</b>
                            </Col>
                            <Col className={styles.splitDetailColumn}>
                                <b>Reached #</b>
                            </Col>
                            <Col className={styles.splitDetailColumn}>
                                <b>Reset %</b>
                            </Col>
                            <Col className={styles.splitDetailColumn}>
                                <b>Completion %</b>
                            </Col>
                            <Col className={styles.splitDetailColumn}>
                                <b>Stddev</b>
                            </Col>
                            <Col
                                className={styles.splitDetailColumn}
                                style={{ minWidth: "10%" }}
                            >
                                <b>Consistency</b>
                            </Col>
                        </Row>
                    </div>
                    <div style={{ width: "1.25rem", float: "left" }} />
                </div>
            </Card>
            {idSplits.map((split, key) => {
                const goldSingle = parseInt(split.single.bestPossibleTime);
                const goldTotal = parseInt(split.total.bestPossibleTime);

                split.values = split.values.filter((val) => {
                    return val >= goldSingle;
                });

                split.valuesTotal = split.valuesTotal.filter((val) => {
                    return val >= goldTotal;
                });

                const totalSplits = history.filter((run) => {
                    return run.splits.length > key;
                }).length;

                const reachedSplitCount = history.filter((run) => {
                    return run.splits.length >= key;
                }).length;

                const totalResetsOnSplit = history.filter((run) => {
                    return run.splits.length == key;
                }).length;

                const consistencyScore = calculateConsistencyScore(
                    parseInt(split.single.averageTime),
                    parseInt(split.single.stdDev),
                    totalResetsOnSplit / (totalResetsOnSplit + totalSplits)
                );

                return (
                    <div key={key}>
                        <Accordion>
                            <Accordion.Item key={key} eventKey={key.toString()}>
                                <Accordion.Header
                                    onClick={async (event) =>
                                        await handleAccordionChange(event, key)
                                    }
                                >
                                    <div style={{ width: "100%" }}>
                                        <Row>
                                            <Col
                                                style={{
                                                    whiteSpace: "nowrap",
                                                    minWidth: "25%",
                                                }}
                                            >
                                                <strong>
                                                    <SplitName
                                                        splitName={split.name}
                                                    />
                                                </strong>
                                            </Col>
                                            <Col>
                                                <DurationToFormatted
                                                    duration={split.single.time}
                                                    withMillis={true}
                                                />
                                            </Col>

                                            <OptionalColumns
                                                split={split}
                                                gameTime={gameTime}
                                                reachedSplitCount={
                                                    reachedSplitCount
                                                }
                                                consistencyScore={
                                                    consistencyScore
                                                }
                                                totalResetsOnSplit={
                                                    totalResetsOnSplit
                                                }
                                                totalSplits={totalSplits}
                                                showDifference={showDifference}
                                                history={history}
                                            />

                                            <OptionalColumns
                                                split={split}
                                                gameTime={gameTime}
                                                reachedSplitCount={
                                                    reachedSplitCount
                                                }
                                                consistencyScore={
                                                    consistencyScore
                                                }
                                                totalResetsOnSplit={
                                                    totalResetsOnSplit
                                                }
                                                totalSplits={totalSplits}
                                                showDifference={showDifference}
                                                history={history}
                                                selected={selectedComparison}
                                                optional={true}
                                            />
                                        </Row>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body>
                                    {!openAccs[key] ? (
                                        <>You should not see this</>
                                    ) : (
                                        <div>
                                            <div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent:
                                                            "flex-end",
                                                    }}
                                                >
                                                    <label
                                                        htmlFor={"switch"}
                                                        style={{
                                                            marginRight: "10px",
                                                            alignSelf: "center",
                                                            whiteSpace:
                                                                "nowrap",
                                                        }}
                                                    >
                                                        {" "}
                                                        <UnderlineTooltip
                                                            title={
                                                                "Total/split time"
                                                            }
                                                            content={
                                                                "These graphs can be in two forms: Total time or Split time. " +
                                                                "Total time means it will show you the full split time, including previous splits. Split time will only show the time for this specific segment."
                                                            }
                                                            element={
                                                                "Show total time"
                                                            }
                                                        />
                                                    </label>
                                                    <div
                                                        style={{
                                                            alignSelf: "center",
                                                        }}
                                                    >
                                                        <Switch
                                                            name={"switch"}
                                                            onChange={(
                                                                checked
                                                            ) => {
                                                                setShowTotal(
                                                                    checked
                                                                );
                                                            }}
                                                            checked={showTotal}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <Row>
                                                <Col
                                                    md={4}
                                                    className={`${styles.graph}`}
                                                >
                                                    <SplitOverTimeGraph
                                                        history={history}
                                                        split={split}
                                                        total={showTotal}
                                                    />
                                                </Col>
                                                <Col
                                                    md={4}
                                                    className={`${styles.graph}`}
                                                >
                                                    <GoldProgressionGraph
                                                        history={history}
                                                        split={split}
                                                        total={showTotal}
                                                    />
                                                </Col>
                                                <Col
                                                    md={4}
                                                    className={`${styles.graph}`}
                                                >
                                                    <SplitGraph
                                                        history={history}
                                                        split={split}
                                                        total={showTotal}
                                                    />
                                                </Col>
                                            </Row>
                                        </div>
                                    )}
                                </Accordion.Body>
                            </Accordion.Item>
                        </Accordion>
                    </div>
                );
            })}
        </>
    );
};

const calculateConsistencyScore = (
    avg: number,
    stddev: number,
    resetPercentage: number
): number => {
    if (stddev == 0 || avg == 0) return 0;

    const stddevScore = avg / stddev;

    return stddevScore * (1 - resetPercentage);
};

const consistencyScoreIndication = (score: number) => {
    let phrase: string = "";
    let color: string = "";

    if (score < 3) {
        phrase = "Weak";
        color = "#FF0000";
    } else if (score < 6) {
        phrase = "Could be better";
        color = "#CC5000";
    } else if (score < 11) {
        phrase = "Decent";
        color = "#AA9000";
    } else if (score < 22) {
        phrase = "Good";
        color = "#90AA00";
    } else if (score < 32) {
        phrase = "Very good";
        color = "#60CC00";
    } else if (score < 40) {
        phrase = "Excellent";
        color = "#30DD00";
    } else if (score < 100) {
        phrase = "Amazing";
        color = "#00FF00";
    } else {
        phrase = "Insane";
        color = "goldenrod";
    }

    return (
        <div key={color} className={styles.consistencyColor}>
            {phrase}
        </div>
    );
};

export const isOutlier = (
    avg: number,
    stddev: number,
    time: number,
    onlydown = false
) => {
    const maxdevs = 5;

    const down = time < avg - maxdevs * stddev;

    if (onlydown) return down;

    return down || time > avg + maxdevs * stddev;
};

export const OptionalColumns = ({
    showDifference,
    split,
    gameTime,
    reachedSplitCount,
    totalResetsOnSplit,
    totalSplits,
    consistencyScore,
    history,
    selected,
    optional = false,
}) => {
    const style = optional
        ? styles.splitDetailColumn
        : styles.splitDetailColumnHidden;
    return (
        <>
            <Col
                style={{ color: "goldenrod" }}
                className={selected == "Best ever" && optional ? "" : style}
            >
                {!showDifference ? (
                    <div style={{ float: "left" }}>
                        <DurationToFormatted
                            duration={split.single.bestPossibleTime}
                            withMillis={true}
                            gameTime={gameTime}
                        />
                    </div>
                ) : (
                    <div style={{ float: "left" }}>
                        <Difference
                            one={split.single.bestPossibleTime}
                            two={split.single.time}
                            withMillis={true}
                        />
                    </div>
                )}
            </Col>
            <Col className={selected == "Average" && optional ? "" : style}>
                {!showDifference ? (
                    <div style={{ float: "left" }}>
                        <DurationToFormatted
                            duration={split.single.averageTime}
                            withMillis={true}
                            gameTime={gameTime}
                        />
                    </div>
                ) : (
                    <div style={{ float: "left" }}>
                        <Difference
                            one={split.single.averageTime}
                            two={split.single.time}
                            withMillis={true}
                        />
                    </div>
                )}
            </Col>
            <Col className={selected == "Reached #" && optional ? "" : style}>
                {reachedSplitCount}
            </Col>
            <Col className={selected == "Reset %" && optional ? "" : style}>
                {(
                    (totalResetsOnSplit / (totalResetsOnSplit + totalSplits)) *
                    100
                ).toFixed(2)}
                %
            </Col>
            <Col
                className={selected == "Completion %" && optional ? "" : style}
            >
                {((totalSplits / history.length) * 100).toFixed(2)}%
            </Col>
            <Col
                className={
                    selected == "Standard Deviation" && optional ? "" : style
                }
            >
                <DurationToFormatted
                    duration={split.single.stdDev}
                    withMillis={true}
                />
            </Col>
            <Col
                style={{ minWidth: "10%" }}
                className={selected == "Consistency" && optional ? "" : style}
            >
                {consistencyScoreIndication(consistencyScore)}
            </Col>
        </>
    );
};
