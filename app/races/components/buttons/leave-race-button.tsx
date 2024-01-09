import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { leaveRace } from "~src/actions/races/leave-race.action";

export const LeaveRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={leaveRace}
            innerText={"Unjoin Race"}
            pendingText={"Unjoining Race"}
        />
    );
};
