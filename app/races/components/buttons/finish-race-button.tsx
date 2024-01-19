import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { finishRace } from "~src/actions/races/finish-race.action";

export const FinishRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={finishRace}
            innerText={"Finish Race"}
            pendingText={"Finishing Race..."}
            {...props}
        />
    );
};
