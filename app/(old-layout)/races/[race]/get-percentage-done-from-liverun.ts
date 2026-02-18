import { RaceParticipantWithLiveData } from '~app/(old-layout)/races/races.types';

export const getPercentageDoneFromLiverun = (
    participant: RaceParticipantWithLiveData,
) => {
    if (participant.finalTime) {
        return 100;
    }

    if (participant.liveData) {
        const {
            runPercentageTime,
            runPercentageSplits,
            estimatedFinishTime,
            currentTime,
        } = participant.liveData;

        // Prefer estimatedFinishTime-based progress for smooth interpolation
        if (estimatedFinishTime && estimatedFinishTime > 0 && currentTime > 0) {
            const progress = currentTime / estimatedFinishTime;
            const clamped = Math.min(progress, 0.999);
            return Number((clamped * 100).toFixed(2));
        }

        let completionPercentage = runPercentageTime || runPercentageSplits;

        // Ensure the percentage is based on splits if the initial value exceeds 1
        if (completionPercentage > 1) {
            completionPercentage = runPercentageSplits;
        }

        // Participant can not be done
        if (completionPercentage === 1) {
            completionPercentage = 0.999;
        }

        return Number((completionPercentage * 100).toFixed(2));
    }

    return 0;
};
