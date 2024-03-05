import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { startRace } from "~src/actions/races/start-race.action";

export const StartRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={startRace}
            innerText={"Start Countdown"}
            pendingText={"Starting Countdown..."}
            {...props}
        />
    );
};
