import { undoAbandonRace } from '~app/(new-layout)/races/actions/undo-abandon-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

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
