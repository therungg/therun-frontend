import { undoConfirmRace } from '~app/(old-layout)/races/actions/undo-confirm-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

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
