import { Race, RaceParticipantWithLiveData } from "~app/races/races.types";

export const sortRaceParticipants = (race: Race) => {
    // return race.participants;

    const participants = race.participants as RaceParticipantWithLiveData[];

    return participants.sort((a, b) => {
        // Final time comparison
        if (a.finalTime || b.finalTime) {
            if (!a.finalTime) return 1;
            if (!b.finalTime) return -1;
            return a.finalTime - b.finalTime; // Both have finalTime, compare them directly
        }

        // Status comparison, prioritizing non-abandoned over abandoned
        if (a.status === "abandoned" || b.status === "abandoned") {
            if (a.status !== "abandoned") return -1;
            if (b.status !== "abandoned") return 1;
            // If both are abandoned, compare abandonment times
            return (
                new Date(b.abandondedAtDate as string).getTime() -
                new Date(a.abandondedAtDate as string).getTime()
            );
        }

        // LiveData comparison, prioritizing participants with liveData
        if (a.liveData || b.liveData) {
            if (!a.liveData) return 1;
            if (!b.liveData) return -1;
            // Both have liveData, compare their percentages
            const aPercentage = (
                a.liveData.runPercentageTime && a.liveData.runPercentageTime > 1
                    ? a.liveData.runPercentageTime
                    : a.liveData.runPercentageSplits
            ) as number;
            const bPercentage = (
                b.liveData.runPercentageTime && b.liveData.runPercentageTime > 1
                    ? b.liveData.runPercentageTime
                    : b.liveData.runPercentageSplits
            ) as number;
            return bPercentage - aPercentage; // Higher percentage first
        }

        // Personal best (pb) comparison
        if (a.pb || b.pb) {
            if (!a.pb) return 1;
            if (!b.pb) return -1;
            const aPb = parseInt(a.pb, 10);
            const bPb = parseInt(b.pb, 10);
            return aPb - bPb;
        }

        // Joined date comparison as a last resort
        return (
            parseInt(a.joinedAtDate as string) -
            parseInt(b.joinedAtDate as string)
        );
    });
};
