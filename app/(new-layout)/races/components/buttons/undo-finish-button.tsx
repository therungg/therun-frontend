import { undoFinishRace } from '~app/(new-layout)/races/actions/undo-finish-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

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
