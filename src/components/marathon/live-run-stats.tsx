import { LiveRun } from "../live/live-user-run";
import { Table } from "react-bootstrap";
import { useEffect, useState } from "react";
import {
    DifferenceFromOne,
    DurationToFormatted,
    IsoToFormatted,
} from "../util/datetime";
import {
    MarathonEvent,
    SendMarathonDataButton,
} from "./send-marathon-data-button";
import moment from "moment/moment";

interface LiveRunEvent extends MarathonEvent {
    data: LiveRunEventData;
    type: "live_data_event";
    name: "Live Run Data";
    description: "Contains data about the currently in progress run from this runner.";
}

interface LiveRunEventData {
    personalBest: number;
    sumOfBests: number;
    runStartedAt?: string;
    runStartedAtFromNow?: string;
    lastSplitTime: number;
    deltaToPersonalBest: number;
    initialPredictedTime: number | null;
    currentPredictedTime?: string;
    deltaCurrentToInitialPredictedTime: number;
    currentBestPossibleTime: number;
    currentSplitName: string;
    currentSplitIndex: number;
    totalSplitCount: number;
    nextSplitName: string | null;
    nextSplitIndex: number;
}

export const LiveRunStats = ({
    liveRun,
    sessionId,
}: {
    liveRun: LiveRun;
    sessionId: string;
}) => {
    const [currentLiveRun, setCurrentLiveRun] = useState(liveRun);

    useEffect(() => {
        setCurrentLiveRun(liveRun);
    }, [liveRun]);

    return (
        <div>
            <h2>Current Run Stats</h2>
            <Table responsive bordered hover striped>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Value</th>
                        <th>Send</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Personal Best</td>
                        <td>
                            <DurationToFormatted duration={liveRun.pb} />
                        </td>
                        <td>
                            <SendMarathonDataButton
                                buttonText={"Send"}
                                description={null}
                                sessionId={sessionId}
                                data={currentPbEvent(liveRun)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>(Current) Predicted Time</td>
                        <td>
                            <DurationToFormatted
                                duration={liveRun.currentPrediction}
                            />
                        </td>
                        <td>
                            <SendMarathonDataButton
                                buttonText={"Send"}
                                description={null}
                                sessionId={sessionId}
                                data={currentPredictionEvent(liveRun)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>+- Initial Predicted Time</td>
                        <td>
                            <DifferenceFromOne
                                diff={
                                    liveRun.currentPrediction -
                                    liveRun.splits[liveRun.splits.length - 1]
                                        .predictedTotalTime
                                }
                            />
                        </td>
                        <td>
                            <SendMarathonDataButton
                                buttonText={"Send"}
                                description={null}
                                sessionId={sessionId}
                                data={currentPredictionEvent(liveRun)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>(Current) Best Possible Time</td>
                        <td>
                            <DurationToFormatted
                                duration={liveRun.bestPossible}
                            />
                        </td>
                        <td>
                            <SendMarathonDataButton
                                buttonText={"Send"}
                                description={null}
                                sessionId={sessionId}
                                data={currentBestPossibleEvent(liveRun)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Sum of bests</td>
                        <td>
                            <DurationToFormatted duration={liveRun.sob} />
                        </td>
                        <td>
                            <SendMarathonDataButton
                                buttonText={"Send"}
                                description={null}
                                sessionId={sessionId}
                                data={currentSobEvent(liveRun)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Run Started At</td>
                        <td>
                            <IsoToFormatted iso={parseInt(liveRun.startedAt)} />
                        </td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>Split</td>
                        <td>
                            {currentLiveRun.currentSplitName} (
                            {currentLiveRun.currentSplitIndex + 1} /{" "}
                            {currentLiveRun.splits.length})
                        </td>
                        <td>
                            <SendMarathonDataButton
                                buttonText={"Send"}
                                description={null}
                                sessionId={sessionId}
                                data={currentSplitEvent(liveRun)}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td>Next Split</td>
                        <td>
                            {currentLiveRun.currentSplitIndex + 1 >=
                            currentLiveRun.splits.length
                                ? "Last split"
                                : currentLiveRun.splits[
                                      currentLiveRun.currentSplitIndex + 1
                                  ].name}
                        </td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <td>Delta (+/- PB)</td>
                        <td>
                            <DifferenceFromOne
                                diff={currentLiveRun.delta}
                                withMillis={true}
                            />
                        </td>
                        <td style={{ maxHeight: "1rem" }}>-</td>
                    </tr>
                </tbody>
            </Table>
        </div>
    );
};

export const liveRunEvent = (liveRun: LiveRun): LiveRunEvent => {
    return {
        type: "live_data_event",
        name: "Live Run Data",
        description:
            "Contains data about the currently in progress run from this runner.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            personalBest: liveRun.pb,
            sumOfBests: liveRun.sob,
            runStartedAt: liveRun.startedAt,
            runStartedAtFromNow: moment(parseInt(liveRun.startedAt)).fromNow(),
            lastSplitTime: liveRun.currentTime,
            deltaToPersonalBest: liveRun.delta,
            initialPredictedTime:
                liveRun.splits[liveRun.splits.length - 1].predictedTotalTime,
            currentPredictedTime: liveRun.currentPrediction,
            deltaCurrentToInitialPredictedTime:
                liveRun.currentPrediction -
                liveRun.splits[liveRun.splits.length - 1].predictedTotalTime,
            currentBestPossibleTime: liveRun.bestPossible,
            currentSplitName: liveRun.currentSplitName,
            currentSplitIndex: liveRun.currentSplitIndex,
            totalSplitCount: liveRun.splits.length,
            nextSplitIndex: liveRun.currentSplitIndex + 1,
            nextSplitName:
                liveRun.currentSplitIndex >= liveRun.splits.length - 1
                    ? null
                    : liveRun.splits[liveRun.currentSplitIndex + 1].name,
        },
    };
};

export const currentPbEvent = (liveRun: LiveRun): MarathonEvent => {
    return {
        type: "current_pb_event",
        name: "Current PB",
        description: "Contains the runners current PB.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            personalBest: liveRun.pb,
            deltaToPersonalBest: liveRun.delta,
        },
    };
};

export const currentPredictionEvent = (liveRun: LiveRun): MarathonEvent => {
    return {
        type: "current_prediction_event",
        name: "Current Prediction",
        description: "Contains the runners current predicted end time.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            initialPredictedTime:
                liveRun.splits[liveRun.splits.length - 1].predictedTotalTime,
            currentPredictedTime: liveRun.currentPrediction,
            deltaCurrentToInitialPredictedTime:
                liveRun.currentPrediction -
                liveRun.splits[liveRun.splits.length - 1].predictedTotalTime,
        },
    };
};

export const currentSobEvent = (liveRun: LiveRun): MarathonEvent => {
    return {
        type: "current_sob_event",
        name: "Current SOB",
        description: "Contains the runners current SOB.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            sumOfBests: liveRun.sob,
        },
    };
};

export const currentBestPossibleEvent = (liveRun: LiveRun): MarathonEvent => {
    return {
        type: "current_best_possible_event",
        name: "Current Best Possible Time",
        description: "Contains the runners current Best Possible Time.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            currentBestPossibleTime: liveRun.bestPossible,
            sumOfBests: liveRun.sob,
            personalBest: liveRun.pb,
        },
    };
};

export const currentSplitEvent = (liveRun: LiveRun): MarathonEvent => {
    return {
        type: "current_split_event",
        name: "Current Split",
        description: "Contains the runners current Split.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            currentSplitName: liveRun.currentSplitName,
            currentSplitIndex: liveRun.currentSplitIndex,
            totalSplitCount: liveRun.splits.length,
            nextSplitIndex: liveRun.currentSplitIndex + 1,
            nextSplitName:
                liveRun.currentSplitIndex >= liveRun.splits.length - 1
                    ? null
                    : liveRun.splits[liveRun.currentSplitIndex + 1].name,
        },
    };
};

export default LiveRunStats;
