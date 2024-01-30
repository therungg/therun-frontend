import { RaceParticipantStatus, RaceStatus } from "~app/races/races.types";

export const readableRaceStatus = (status: RaceStatus) => {
    switch (status) {
        case "aborted":
            return "Aborted";
        case "pending":
            return "Pending";
        case "finished":
            return "Finished";
        case "progress":
            return "In Progress";
        case "starting":
            return "Starting";
    }
};

export const readableRaceParticipantStatus = (
    status: RaceParticipantStatus,
) => {
    switch (status) {
        case "abandoned":
            return "Abandoned";
        case "confirmed":
            return "Finished";
        case "finished":
            return "Confirming...";
        case "joined":
            return "Joined";
        case "ready":
            return "Ready";
        case "started":
            return "In Progress";
    }
};
