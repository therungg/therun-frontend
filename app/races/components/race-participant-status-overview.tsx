import { RaceParticipantWithLiveData } from "~app/races/races.types";
import { XIcon } from "~src/icons/x-icon";
import { HourglassIcon } from "~src/icons/hourglass-icon";
import { FlagIcon } from "~src/icons/flag-icon";

export const RaceParticipantStatusOverview = ({
    participants,
}: {
    participants: RaceParticipantWithLiveData[];
}) => {
    const abandonded = participants.filter(
        (participant) => participant.status === "abandoned",
    ).length;
    const progress = participants.filter(
        (participant) =>
            participant.status === "ready" || participant.status === "started",
    ).length;
    const finished = participants.filter(
        (participant) =>
            participant.status === "finished" ||
            participant.status === "confirmed",
    ).length;

    return (
        <>
            <span className={"border-right pe-1"}>
                {abandonded}
                <XIcon />
            </span>
            <span className={"border-right pe-1"}>
                {progress}
                <HourglassIcon />
            </span>
            <span>
                {finished}
                <FlagIcon />
            </span>
        </>
    );
};
