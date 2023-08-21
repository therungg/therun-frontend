import styles from "../css/LiveRun.module.scss";
import { Col, Row } from "react-bootstrap";
import SplitName from "../transformers/split-name";
import { Difference, DurationToFormatted } from "../util/datetime";
import { getSplitStatus } from "./recommended-stream";
import React, { useEffect, useState } from "react";
import { LiveRun } from "~app/live/live.types";
import { LiveSplitTimerComponent } from "~app/live/live-split-timer.component";

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

    return (
        <div className="bg-body-tertiary h-340p border border-tertiary">
            <Row className="overflow-hidden h-15 px-4 py-0">
                <Col xs={6}>
                    <div className="text-truncate" title={activeLiveRun.game}>
                        {activeLiveRun.game}
                    </div>
                    <div
                        className="text-truncate"
                        title={activeLiveRun.category}
                    >
                        {activeLiveRun.category}
                    </div>
                </Col>
                <Col>
                    <div className="d-flex justify-content-center align-items-center h-100">
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
                                        activeLiveRun.splits[0].comparisons
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
            <hr className="border-bottom m-0" />
            <div
                id={"scrollBox"}
                className="bg-body-secondary overflow-y-auto h-55 w-100"
            >
                <table className="w-100">
                    <tbody>
                        {activeLiveRun.splits.map((split, k) => {
                            if (k >= activeLiveRun.splits.length - 1) return;

                            const splitStatus = getSplitStatus(
                                activeLiveRun,
                                k
                            );

                            return (
                                <tr
                                    key={split.name + k + activeLiveRun.user}
                                    className={`w-100 ${styles.splitRow} ${
                                        splitStatus.isActive
                                            ? styles.splitRowActive
                                            : ""
                                    }`}
                                    onClick={() => {
                                        setSelectedSplit(k);
                                    }}
                                >
                                    <td className="d-flex align-items-center">
                                        <div
                                            className={`text-truncate px-2 ${styles.splitName}`}
                                        >
                                            <SplitName splitName={split.name} />
                                        </div>
                                    </td>
                                    <td className="w-18">
                                        <div className="text-end pe-1">
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
                                                    isGold={splitStatus.isGold}
                                                    human={false}
                                                />
                                            ) : splitStatus.status ==
                                                  "skipped" ||
                                              !activeLiveRun.splits[k]
                                                  .comparisons[comparison] ||
                                              (k > 0 &&
                                                  !activeLiveRun.splits[k - 1]
                                                      .comparisons[
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
                                                                  .splits[k - 1]
                                                                  .comparisons[
                                                                  comparison
                                                              ]
                                                    }
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="w-18">
                                        <div className="text-end pe-1">
                                            {splitStatus.status == "skipped" ? (
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
            <hr className="border-bottom m-0" />
            <div className="overflow-hidden overflow-y-auto h-30">
                <table className="w-100">
                    <tbody>
                        <tr
                            className={
                                activeLiveRun.currentSplitIndex + 1 ==
                                activeLiveRun.splits.length
                                    ? styles.finalSplitRow
                                    : ""
                            }
                            onClick={() => {
                                setSelectedSplit(
                                    activeLiveRun.splits.length - 1
                                );
                            }}
                        >
                            <td className="ps-2 pe-1">
                                <div className={styles.splitName}>
                                    {
                                        activeLiveRun.splits[
                                            activeLiveRun.splits.length - 1
                                        ].name
                                    }
                                </div>
                            </td>
                            <td className="w-18 px-1">
                                <div className="text-end">
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
                            <td className="w-18 ps-1 pe-2">
                                <div className="text-end">
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
                <hr className="border-bottom m-0" />
                <Row className="mh-100 h-55p my-1 px-2">
                    <Col xs="auto" className="d-flex h-100 align-items-center">
                        <div>
                            <div className="d-flex align-items-end">
                                <div className="fs-small">Possible:&nbsp;</div>
                                <div className="d-flex align-items-end justify-content-end w-100">
                                    <DurationToFormatted
                                        duration={activeLiveRun.bestPossible}
                                        withMillis={false}
                                        human={false}
                                    />
                                </div>
                            </div>
                            <div className="d-flex align-items-end">
                                <div className="fs-small">Timesave:&nbsp;</div>
                                <div className="d-flex align-items-end justify-content-end w-100">
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
                    <Col xs="auto" className="ms-auto">
                        <Row>
                            <LiveSplitTimerComponent
                                liveRun={activeLiveRun}
                                dark={dark}
                                className={`d-flex justify-content-end align-items-center h-90`}
                                timerClassName="text-end fs-big"
                                withDiff={false}
                            />
                        </Row>
                        <Row>
                            <LiveSplitTimerComponent
                                liveRun={activeLiveRun}
                                dark={dark}
                                className={`d-flex align-items-center h-100`}
                                timerClassName="text-end fs-medium lh-1"
                                withDiff={false}
                                splitTime={true}
                            />
                        </Row>
                    </Col>
                </Row>
            </div>
        </div>
    );
};
