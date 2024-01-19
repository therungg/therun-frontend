import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { createSuccessorRace } from "~src/actions/races/create-successor-race.action";

export const CreateNextRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={createSuccessorRace}
            innerText={"Create Successor Race"}
            pendingText={"Creating Successor Race"}
            {...props}
        />
    );
};
