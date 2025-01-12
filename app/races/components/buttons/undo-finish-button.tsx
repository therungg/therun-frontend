import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { undoFinishRace } from "~src/actions/races/undo-finish-race.action";

export const UndoFinishButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={undoFinishRace}
            innerText="Undo finish"
            pendingText="Undoing finish..."
            {...props}
        />
    );
};
