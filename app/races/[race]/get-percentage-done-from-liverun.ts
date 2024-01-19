import { RaceParticipantWithLiveData } from "~app/races/races.types";

export const getPercentageDoneFromLiverun = (
    participant: RaceParticipantWithLiveData,
) => {
    let percentage = 0;

    if (participant.finalTime) {
        percentage = 100;
    } else if (participant.liveData) {
        percentage =
            participant.liveData.runPercentageTime ||
            participant.liveData.runPercentageSplits;
        percentage *= 100;
    }

    return percentage;
};
