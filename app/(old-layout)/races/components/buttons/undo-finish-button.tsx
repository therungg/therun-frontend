import { undoFinishRace } from '~app/(old-layout)/races/actions/undo-finish-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

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
