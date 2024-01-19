import { Race } from "~app/races/races.types";

export const sortRaceParticipants = (race: Race) => {
    // return race.participants;

    return race.participants?.sort((a, b) => {
        if (a.finalTime && !b.finalTime) {
            return -1;
        }
        if (!a.finalTime && b.finalTime) {
            return 1;
        }

        if (a.finalTime && b.finalTime) {
            return a.finalTime - b.finalTime;
        }

        if (a.status === "abandoned" && b.status !== "abandoned") {
            return 1;
        }

        if (b.status === "abandoned" && a.status !== "abandoned") {
            return -1;
        }

        if (a.status === "abandoned" && b.status === "abandoned") {
            return (
                new Date(b.abandondedAtDate as string).getTime() -
                new Date(a.abandondedAtDate as string).getTime()
            );
        }

        if (a.liveData && !b.liveData) {
            return -1;
        }
        if (!a.liveData && b.liveData) {
            return 1;
        }

        if (a.liveData && b.liveData) {
            return b.liveData.runPercentageTime - a.liveData.runPercentageTime;
        }
        if (a.pb && !b.pb) {
            return -1;
        }
        if (!a.pb && b.pb) {
            return 1;
        }
        if (a.pb && b.pb) {
            // Parse pb to handle "0", 0, and undefined correctly
            const aPb = parseInt(a.pb);
            const bPb = parseInt(b.pb);

            // Sort by pb
            return aPb - bPb;
        }

        return a.joinedAtDate - b.joinedAtDate;
    });
};
