import { MarathonEvent } from "../send-marathon-data-button";
import { LiveRun } from "../../live/live-user-run";
import { Run } from "../../../common/types";
import { getFormattedString } from "../../util/datetime";

interface GeneralDataEvent extends MarathonEvent {
    type: "general_data_event";
    name: "General Data";
    description: "Contains general data about the current runner.";
    data: GeneralData;
}

interface GeneralData {
    personalBest: string;
    personalBestAchievedAt: string;
    attemptCount: number;
    finishedAttemptCount: number;
    completionPercentage: string;
    sumOfBests: string;
    totalPossibleTimesave: string;
    totalRunTimeInMilliSeconds: number;
    totalRunTimeAsString: string;
}

export const generalDataEvent = (liveRun: LiveRun): GeneralDataEvent => {
    const run = liveRun.gameData as Run;

    return {
        type: "general_data_event",
        name: "General Data",
        description: "Contains general data about the current runner.",
        time: new Date().toISOString(),
        game: liveRun.game,
        category: liveRun.category,
        username: liveRun.user,
        data: {
            personalBest: run.personalBest,
            personalBestAchievedAt: run.personalBestTime,
            attemptCount: run.attemptCount,
            finishedAttemptCount: parseInt(run.finishedAttemptCount),
            completionPercentage: (
                (parseInt(run.finishedAttemptCount) / run.attemptCount) *
                100
            ).toFixed(2),
            sumOfBests: run.sumOfBests,
            totalPossibleTimesave: run.timeToSave,
            totalRunTimeInMilliSeconds: parseInt(run.totalRunTime),
            totalRunTimeAsString: getFormattedString(run.totalRunTime),
        },
    };
};
