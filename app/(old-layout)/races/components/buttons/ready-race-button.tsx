import {
    RaceActionButton,
    RaceActionProps,
} from "~app/(old-layout)/races/components/buttons/race-action-button";
import { readyRace } from "~app/(old-layout)/races/actions/ready-race.action";

export const ReadyRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={readyRace}
            innerText="Ready!"
            pendingText="Readying up..."
            {...props}
        />
    );
};
