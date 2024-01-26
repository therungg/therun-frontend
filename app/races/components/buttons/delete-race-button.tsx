import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { deleteRace } from "~src/actions/races/delete-race.action";

export const DeleteRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={deleteRace}
            innerText={"Delete Race"}
            pendingText={"Deleting Race"}
            {...props}
        />
    );
};
