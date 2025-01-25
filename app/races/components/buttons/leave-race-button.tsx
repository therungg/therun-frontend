import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { leaveRace } from "~app/races/actions/leave-race.action";

export const LeaveRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={leaveRace}
            innerText="Unjoin Race"
            pendingText="Unjoining Race"
            {...props}
        />
    );
};
