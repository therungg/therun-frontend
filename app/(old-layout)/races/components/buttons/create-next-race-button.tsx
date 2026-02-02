import { createSuccessorRace } from '~app/(old-layout)/races/actions/create-successor-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

export const CreateNextRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={createSuccessorRace}
            innerText="Create Successor Race"
            pendingText="Creating Successor Race"
            {...props}
        />
    );
};
