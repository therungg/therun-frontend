import {
    Race,
    RaceParticipantWithLiveData,
} from "~app/(old-layout)/races/races.types";
import { substitutePercentageWithLiveData } from "~app/(old-layout)/races/[race]/set-race-participant-percentages";

export const sortRaceParticipants = (
    race: Race,
): RaceParticipantWithLiveData[] => {
    const participants = race.participants?.map((participant) =>
        substitutePercentageWithLiveData(participant),
    ) as RaceParticipantWithLiveData[];

    if (!participants) return [];

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

            if (race.startTime) {
                if (
                    a.liveData.startedAt <
                    new Date(race.startTime).getTime() - 1000 * 60
                ) {
                    return 1;
                }
                if (
                    b.liveData.startedAt <
                    new Date(race.startTime).getTime() - 1000 * 60
                ) {
                    return -1;
                }
            }

            if (race.category.includes("602")) {
                if (
                    a.liveData.totalSplits < 400 &&
                    b.liveData.totalSplits < 400
                ) {
                    return a.user < b.user ? -1 : 1;
                }
                if (a.liveData.totalSplits < 400) {
                    return 1;
                }
                if (b.liveData.totalSplits < 400) {
                    return -1;
                }
            }

            // Both have liveData, compare their percentages
            const aPercentage = (
                a.liveData.runPercentageTime &&
                a.liveData.runPercentageTime <= 1
                    ? a.liveData.runPercentageTime
                    : a.liveData.runPercentageSplits
            ) as number;
            const bPercentage = (
                b.liveData.runPercentageTime &&
                b.liveData.runPercentageTime <= 1
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
