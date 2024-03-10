import { RaceParticipantWithLiveData } from "~app/races/races.types";

export const substitutePercentageWithLiveData = (
    participant: RaceParticipantWithLiveData,
): RaceParticipantWithLiveData => {
    if (!participant.liveData) return participant;

    let fromSplits =
        getRaceParticipantPercentageSplits(participant) ||
        participant.liveData.runPercentageSplits;

    let fromTime =
        getRaceParticipantPercentageTime(participant) ||
        participant.liveData.runPercentageTime;

    if (fromSplits === 1) fromSplits = 0.999;
    if (fromTime === 1) fromTime = 0.999;

    participant.liveData.runPercentageSplits = fromSplits;
    participant.liveData.runPercentageTime = fromTime;

    return participant;
};

export const getRaceParticipantPercentageTime = (
    participant: RaceParticipantWithLiveData,
): number | null | undefined => {
    const liveData = participant.liveData;

    if (!liveData || !liveData.bestPossibleTime) {
        return null;
    }

    const expectedSplitDuration = liveData.timeToNextSplit;

    if (!expectedSplitDuration) {
        return null;
    }

    const maximumTime = liveData.currentTime + expectedSplitDuration;

    const now = new Date().getTime();
    const runDuration = Math.min(now - liveData.startedAt, maximumTime);

    return Number((runDuration / liveData.bestPossibleTime).toFixed(3));
};

export const getRaceParticipantPercentageSplits = (
    participant: RaceParticipantWithLiveData,
): number | null | undefined => {
    const liveData = participant.liveData;

    if (!liveData || !liveData.totalSplits) {
        return null;
    }

    let expectedSplitDuration = liveData.timeToNextSplit;

    if (!expectedSplitDuration) {
        if (!participant.pb) {
            return liveData.runPercentageSplits;
        }

        expectedSplitDuration = parseInt(participant.pb) / liveData.totalSplits;
    }

    const maximumAddedSplitTime = expectedSplitDuration;

    const now = new Date().getTime();
    const splitDuration = Math.min(
        now - liveData.startedAt - liveData.currentTime,
        maximumAddedSplitTime,
    );

    const percentageInSplit = splitDuration / maximumAddedSplitTime;

    const oneSplitPercentage = 1 / liveData.totalSplits;

    const addedPercentage = oneSplitPercentage * percentageInSplit;

    return Number(
        (
            liveData.currentSplitIndex / liveData.totalSplits +
            addedPercentage
        ).toFixed(3),
    );
};
