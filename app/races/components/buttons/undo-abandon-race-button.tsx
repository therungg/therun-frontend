import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { undoAbandonRace } from "~src/actions/races/undo-abandon-race.action";

export const UndoAbandonRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={undoAbandonRace}
            innerText={"Undo accidental reset"}
            pendingText={"Undoing abandon..."}
            {...props}
        />
    );
};
