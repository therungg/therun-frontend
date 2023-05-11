import { Col, Row } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import React from "react";

export const GeneralStats = ({ liveRun, currentSessionStarted, sessions }) => {
    let bestFinishedRun = null;

    sessions[sessions.length - 1].finishedRuns.forEach((run) => {
        const asInt = parseInt(run);

        if (bestFinishedRun === null || asInt < bestFinishedRun) {
            bestFinishedRun = asInt;
        }
    });

    const gameData =
        !!liveRun.gameData.gameTimeData &&
        !!liveRun.gameData.gameTimeData.personalBest
            ? liveRun.gameData.gameTimeData
            : liveRun.gameData;

    return (
        <div>
            <div>
                <Row>
                    <Col xs={7}>Attempts (Finished)</Col>
                    <Col
                        xs={5}
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        {liveRun.gameData.attemptCount} (
                        {liveRun.gameData.finishedAttemptCount})
                    </Col>
                </Row>
                <Row>
                    <Col xs={7}>PB</Col>
                    <Col
                        xs={5}
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <DurationToFormatted duration={gameData.personalBest} />
                    </Col>
                </Row>
                <Row>
                    <Col xs={7}>SOB</Col>
                    <Col
                        xs={5}
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <DurationToFormatted duration={gameData.sumOfBests} />
                    </Col>
                </Row>
                <Row>
                    <Col xs={7}>Total Run Time</Col>
                    <Col
                        xs={5}
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <DurationToFormatted
                            duration={liveRun.gameData?.totalRunTime}
                        />
                    </Col>
                </Row>
            </div>
            {currentSessionStarted && (
                <div style={{ marginTop: "0.5rem" }}>
                    Current session started {currentSessionStarted.fromNow()},
                    attempted{" "}
                    {sessions[sessions.length - 1].runIds.last -
                        sessions[sessions.length - 1].runIds.first +
                        1}{" "}
                    runs, finished{" "}
                    {sessions[sessions.length - 1].finishedRuns.length}.
                </div>
            )}

            {sessions[sessions.length - 1].finishedRuns.length > 0 && (
                <div>
                    Best finished run:{" "}
                    <DurationToFormatted
                        duration={bestFinishedRun}
                        withMillis={true}
                    />
                </div>
            )}
        </div>
    );
};
