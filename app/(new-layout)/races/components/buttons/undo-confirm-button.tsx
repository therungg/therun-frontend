import { undoConfirmRace } from '~app/(new-layout)/races/actions/undo-confirm-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

export const UndoConfirmButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={undoConfirmRace}
            innerText="Undo confirmation"
            pendingText="Undoing confirmation..."
            {...props}
        />
    );
};
