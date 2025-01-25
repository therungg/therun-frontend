import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { readyRace } from "~app/races/actions/ready-race.action";

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
