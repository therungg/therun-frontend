import styles from "../css/LiveRun.module.scss";
import { Col, Row } from "react-bootstrap";
import SplitName from "../transformers/split-name";
import { Difference, DurationToFormatted } from "../util/datetime";
import { LivesplitTimer } from "../../pages/live";
import { getSplitStatus } from "./recommended-stream";
import { LiveRun } from "./live-user-run";
import React, { useEffect, useState } from "react";

export const SplitsViewer = ({
    activeLiveRun,
    currentSplitSplitStatus,
    dark,
    setSelectedSplit,
}: {
    activeLiveRun: LiveRun;
    currentSplitSplitStatus: any;
    dark: boolean;
    setSelectedSplit: any;
}) => {
    const [comparison, setComparison] = useState(
        activeLiveRun.currentComparison || "Personal Best"
    );
    const [manuallyChangedComparison, setManuallyChangedComparison] =
        useState(false);

    useEffect(() => {
        if (!manuallyChangedComparison) {
            setComparison(activeLiveRun.currentComparison || "Personal Best");
        }
    }, [activeLiveRun.currentComparison]);

    useEffect(() => {
        setComparison(activeLiveRun.currentComparison || "Personal Best");
    }, [activeLiveRun.user]);

    if (!activeLiveRun.splits) return <></>;

    // This isn't pretty, but does the job. Maybe refactor in the future.
    // TODO:: Fix
    return (
        <div className={styles.splitsContainerContainer}>
            <div className={styles.splitsHeader}>
                <div className={styles.maxHeight}>
                    <Row className={styles.maxHeight}>
                        <Col
                            className={styles.splitsHeaderGameContainer}
                            xs={6}
                        >
                            <div
                                className={styles.splitsHeaderGame}
                                title={activeLiveRun.game}
                            >
                                {activeLiveRun.game}
                            </div>
                            <div
                                className={styles.splitsHeaderGame}
                                title={activeLiveRun.category}
                            >
                                {activeLiveRun.category}
                            </div>
                        </Col>
                        <Col className={styles.splitsHeaderComparisonContainer}>
                            <div className={styles.splitsHeaderComparison}>
                                <select
                                    className={"form-select"}
                                    value={comparison}
                                    onChange={(e) => {
                                        setComparison(e.target.value);
                                        setManuallyChangedComparison(true);
                                    }}
                                >
                                    {(
                                        Array.from(
                                            Object.keys(
                                                activeLiveRun.splits[0]
                                                    .comparisons
                                            )
                                        ) || ["Personal Best"]
                                    ).map((comp) => {
                                        return (
                                            <option
                                                key={comp}
                                                title={comp}
                                                value={comp}
                                            >
                                                {comp}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
            <hr className={styles.seperator} />
            <div className={styles.splitsBox} id={"scrollBox"}>
                <div>
                    <table className={styles.splitsTable}>
                        <tbody>
                            {activeLiveRun.splits.map((split, k) => {
                                if (k >= activeLiveRun.splits.length - 1)
                                    return;

                                const splitStatus = getSplitStatus(
                                    activeLiveRun,
                                    k
                                );

                                return (
                                    <tr
                                        key={
                                            split.name + k + activeLiveRun.user
                                        }
                                        className={styles.splitRow}
                                        style={{
                                            backgroundColor:
                                                splitStatus.isActive
                                                    ? "var(--color-split-active)"
                                                    : "",
                                        }}
                                        onClick={() => {
                                            setSelectedSplit(k);
                                        }}
                                    >
                                        <td
                                            className={
                                                styles.splitNameContainer
                                            }
                                        >
                                            <div className={styles.splitName}>
                                                <SplitName
                                                    splitName={split.name}
                                                />
                                            </div>
                                        </td>
                                        <td
                                            className={
                                                styles.splitTimeContainer
                                            }
                                        >
                                            <div className={styles.splitTime}>
                                                {splitStatus.status ==
                                                "completed" ? (
                                                    <Difference
                                                        one={split.splitTime}
                                                        two={
                                                            split.comparisons[
                                                                comparison
                                                            ]
                                                        }
                                                        withMillis={false}
                                                        isGold={
                                                            splitStatus.isGold
                                                        }
                                                        human={false}
                                                    />
                                                ) : splitStatus.status ==
                                                      "skipped" ||
                                                  !activeLiveRun.splits[k]
                                                      .comparisons[
                                                      comparison
                                                  ] ||
                                                  (k > 0 &&
                                                      !activeLiveRun.splits[
                                                          k - 1
                                                      ].comparisons[
                                                          comparison
                                                      ]) ? (
                                                    "-"
                                                ) : (
                                                    <DurationToFormatted
                                                        withMillis={false}
                                                        duration={
                                                            k == 0
                                                                ? activeLiveRun
                                                                      .splits[0]
                                                                      .comparisons[
                                                                      comparison
                                                                  ]
                                                                : activeLiveRun
                                                                      .splits[k]
                                                                      .comparisons[
                                                                      comparison
                                                                  ] -
                                                                  activeLiveRun
                                                                      .splits[
                                                                      k - 1
                                                                  ].comparisons[
                                                                      comparison
                                                                  ]
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className={
                                                styles.splitTimeContainer
                                            }
                                        >
                                            <div className={styles.splitTime}>
                                                {splitStatus.status ==
                                                "skipped" ? (
                                                    "-"
                                                ) : splitStatus.status ==
                                                  "completed" ? (
                                                    <b>
                                                        <DurationToFormatted
                                                            human={false}
                                                            duration={
                                                                split.splitTime
                                                            }
                                                            withMillis={false}
                                                        />
                                                    </b>
                                                ) : (
                                                    <DurationToFormatted
                                                        human={false}
                                                        duration={
                                                            split.comparisons[
                                                                comparison
                                                            ]
                                                        }
                                                        withMillis={false}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            <hr className={styles.seperator} />
            <div className={styles.splitTimerContainer}>
                <div>
                    <table className={styles.splitsTable}>
                        <tbody>
                            <tr
                                className={styles.finalSplitRow}
                                onClick={() => {
                                    setSelectedSplit(
                                        activeLiveRun.splits.length - 1
                                    );
                                }}
                                style={{
                                    backgroundColor:
                                        activeLiveRun.currentSplitIndex + 1 ==
                                        activeLiveRun.splits.length
                                            ? "blue"
                                            : "",
                                }}
                            >
                                <td className={styles.splitNameContainer}>
                                    <div className={styles.splitName}>
                                        {
                                            activeLiveRun.splits[
                                                activeLiveRun.splits.length - 1
                                            ].name
                                        }
                                    </div>
                                </td>
                                <td className={styles.splitTimeContainer}>
                                    <div className={styles.splitTime}>
                                        {activeLiveRun.splits[
                                            activeLiveRun.splits.length - 1
                                        ].splitTime ? (
                                            <Difference
                                                one={
                                                    activeLiveRun.splits[
                                                        activeLiveRun.splits
                                                            .length - 1
                                                    ].splitTime
                                                }
                                                two={
                                                    activeLiveRun.splits[
                                                        activeLiveRun.splits
                                                            .length - 1
                                                    ].comparisons[comparison]
                                                }
                                            />
                                        ) : activeLiveRun.splits.length < 2 ? (
                                            "-"
                                        ) : (
                                            <DurationToFormatted
                                                duration={
                                                    activeLiveRun.splits[
                                                        activeLiveRun.splits
                                                            .length - 1
                                                    ].comparisons[comparison] -
                                                    activeLiveRun.splits[
                                                        activeLiveRun.splits
                                                            .length - 2
                                                    ].comparisons[comparison]
                                                }
                                            />
                                        )}
                                    </div>
                                </td>
                                <td className={styles.splitTimeContainer}>
                                    <div className={styles.splitTime}>
                                        <b>
                                            <DurationToFormatted
                                                duration={
                                                    activeLiveRun.splits[
                                                        activeLiveRun.splits
                                                            .length - 1
                                                    ].splitTime ||
                                                    activeLiveRun.splits[
                                                        activeLiveRun.splits
                                                            .length - 1
                                                    ].comparisons[comparison]
                                                }
                                            />
                                        </b>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <hr className={styles.seperator} />
                <div className={styles.splitsFooterContainer}>
                    <Row className={styles.maxHeight}>
                        <Col
                            xs={8}
                            className={styles.splitsFooterStatsContainer}
                        >
                            <div className={styles.splitsFooterStats}>
                                <div
                                    className={
                                        styles.splitsFooterPossibleContainer
                                    }
                                >
                                    <div
                                        className={styles.splitsFooterPossible}
                                    >
                                        Possible:&nbsp;
                                    </div>

                                    <div
                                        className={styles.splitsFooterStatsTime}
                                    >
                                        <DurationToFormatted
                                            duration={
                                                activeLiveRun.bestPossible
                                            }
                                            withMillis={false}
                                            human={false}
                                        />
                                    </div>
                                </div>
                                <div
                                    className={
                                        styles.splitsFooterPossibleContainer
                                    }
                                >
                                    <div
                                        className={styles.splitsFooterTimeSave}
                                    >
                                        Timesave:
                                    </div>

                                    <div
                                        className={styles.splitsFooterStatsTime}
                                    >
                                        {activeLiveRun.currentSplitIndex < 0 ? (
                                            "-"
                                        ) : (
                                            <DurationToFormatted
                                                duration={
                                                    currentSplitSplitStatus?.possibleTimeSave
                                                }
                                                withMillis={true}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                        <Col xs={4}>
                            <div className={styles.splitsFooterTimerContainer}>
                                <Row
                                    className={
                                        styles.splitsFooterTimerMainContainer
                                    }
                                >
                                    <LivesplitTimer
                                        liveRun={activeLiveRun}
                                        dark={dark}
                                        className={styles.splitsTimerContainer}
                                        timerClassName={styles.splitsTimer}
                                        withDiff={false}
                                    />
                                </Row>
                                <Row>
                                    <LivesplitTimer
                                        liveRun={activeLiveRun}
                                        dark={dark}
                                        className={
                                            styles.splitIndividualContainer
                                        }
                                        timerClassName={
                                            styles.splitIndividualTimer
                                        }
                                        withDiff={false}
                                        splitTime={true}
                                    />
                                </Row>
                            </div>
                        </Col>
                    </Row>
                </div>
            </div>
        </div>
    );
};
