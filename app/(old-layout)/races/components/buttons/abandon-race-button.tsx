import {
    RaceActionButton,
    RaceActionProps,
} from "~app/(old-layout)/races/components/buttons/race-action-button";
import { leaveRace } from "~app/(old-layout)/races/actions/leave-race.action";

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
