import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { unreadyRace } from "~app/races/actions/unready-race.action";

export const UnreadyRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={unreadyRace}
            innerText="Not ready"
            pendingText="Setting not ready..."
            {...props}
        />
    );
};
