import { Col, Row } from "react-bootstrap";
import React from "react";
import {
    Difference,
    DifferenceFromOne,
    DurationToFormatted,
} from "../util/datetime";
import { LiveRun } from "~app/live/live.types";

type CurrentRunDetailsProps = {
    liveRun: LiveRun;
};

export const CurrentRunDetails = ({ liveRun }: CurrentRunDetailsProps) => {
    const { currentSplitIndex, currentSplitName, pb, bestPossible, splits } =
        liveRun;

    const latestSplitIndex = splits.findIndex(
        (split, index) => split.splitTime && index >= currentSplitIndex - 1
    );

    const fasterSplits =
        latestSplitIndex >= 0
            ? splits[latestSplitIndex].recentCompletionsTotal.filter(
                  (split) =>
                      split < (splits[latestSplitIndex].splitTime as number)
              ).length
            : 0;
    const allSplits =
        latestSplitIndex >= 0
            ? splits[latestSplitIndex].recentCompletionsTotal.length
            : 0;
    const percentile =
        allSplits === 0 ? null : (fasterSplits / allSplits) * 100;

    return (
        <div>
            <Row>
                <Col xs={7}>Current Split</Col>
                <Col
                    xs={5}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    <div
                        style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {currentSplitName || splits[0].name}
                    </div>
                </Col>
            </Row>
            <Row>
                <Col xs={7}>+- PB</Col>
                <Col
                    xs={5}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    <DurationToFormatted duration={pb} />
                    &nbsp;
                    {currentSplitIndex > 0 ? (
                        <Difference
                            one={splits[currentSplitIndex - 1].splitTime}
                            two={splits[currentSplitIndex - 1].pbSplitTime}
                        />
                    ) : (
                        <DifferenceFromOne diff={0} />
                    )}
                </Col>
            </Row>
            <Row>
                <Col xs={7}>Best Possible Time</Col>
                <Col
                    xs={5}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    <DurationToFormatted duration={bestPossible} />
                    &nbsp;
                    <Difference one={bestPossible} two={pb} />
                </Col>
            </Row>
            <Row>
                <Col xs={7}>Top % run</Col>
                <Col
                    xs={5}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                >
                    {percentile === 0
                        ? "Best run ever!"
                        : percentile === null
                        ? "-"
                        : `Top ${percentile.toFixed(1)}% run`}
                </Col>
            </Row>
        </div>
    );
};

export default CurrentRunDetails;
