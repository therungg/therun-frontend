import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { leaveRace } from "~app/races/actions/leave-race.action";

export const AbandonRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={leaveRace}
            innerText="Abandon Race :("
            pendingText="Abandoning Race..."
            variant="danger"
            {...props}
        />
    );
};
