import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { abortRace } from "~app/races/actions/abort-race.action";

export const AbortRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={abortRace}
            innerText="Abort Race"
            pendingText="Aborting Race..."
            {...props}
        />
    );
};
