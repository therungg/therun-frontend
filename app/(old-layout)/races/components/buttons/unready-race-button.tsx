import {
    RaceActionButton,
    RaceActionProps,
} from "~app/(old-layout)/races/components/buttons/race-action-button";
import { unreadyRace } from "~app/(old-layout)/races/actions/unready-race.action";

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
