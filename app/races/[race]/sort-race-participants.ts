import { Race } from "~app/races/races.types";

export const sortRaceParticipants = (race: Race) => {
    return race.participants?.sort((a, b) => {
        // Check for liveData presence
        if (a.liveData && !b.liveData) {
            return -1;
        }
        if (!a.liveData && b.liveData) {
            return 1;
        }

        // If both have liveData, sort by runPercentageTime
        if (a.liveData && b.liveData) {
            return b.liveData.runPercentageTime - a.liveData.runPercentageTime;
        }
        if (a.pb && !b.pb) {
            return -1;
        }
        if (!a.pb && b.pb) {
            return 1;
        }
        // Parse pb to handle "0", 0, and undefined correctly
        const aPb = parseInt(a.pb);
        const bPb = parseInt(b.pb);

        // Sort by pb
        return aPb - bPb;
    });
};
