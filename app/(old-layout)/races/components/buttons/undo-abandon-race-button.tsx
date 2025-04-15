import {
    RaceActionButton,
    RaceActionProps,
} from "~app/(old-layout)/races/components/buttons/race-action-button";
import { undoAbandonRace } from "~app/(old-layout)/races/actions/undo-abandon-race.action";

export const UndoAbandonRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={undoAbandonRace}
            innerText="Undo accidental reset"
            pendingText="Undoing abandon..."
            {...props}
        />
    );
};
