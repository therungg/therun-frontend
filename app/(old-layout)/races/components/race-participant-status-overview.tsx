import { RaceParticipantWithLiveData } from "~app/(old-layout)/races/races.types";
import { HourglassIcon } from "~src/icons/hourglass-icon";
import { FlagIcon } from "~src/icons/flag-icon";
import { LogoutIcon } from "~src/icons/logout-icon";

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
        <span className="text-nowrap">
            <span className="border-right pe-3">
                {abandonded}
                <LogoutIcon />
            </span>
            <span className="border-right pe-3">
                {progress}
                <HourglassIcon />
            </span>
            <span>
                {finished}
                <FlagIcon />
            </span>
        </span>
    );
};
