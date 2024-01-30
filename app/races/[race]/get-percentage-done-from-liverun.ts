import { RaceParticipantWithLiveData } from "~app/races/races.types";

export const getPercentageDoneFromLiverun = (
    participant: RaceParticipantWithLiveData,
) => {
    if (participant.finalTime) {
        return 100; // Participant has finished the race.
    }

    if (participant.liveData) {
        const { runPercentageTime, runPercentageSplits } = participant.liveData;
        let completionPercentage = runPercentageTime || runPercentageSplits;

        // Ensure the percentage is based on splits if the initial value exceeds 1. Can happen due to js bug on time percentage
        if (completionPercentage > 1) {
            completionPercentage = runPercentageSplits;
        }

        return Number((completionPercentage * 100).toFixed(2));
    }

    return 0; // Default to 0% if no live data is available.
};
