import { abortRace } from '~app/(new-layout)/races/actions/abort-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

export const AbortRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={abortRace}
            innerText="Abort Race"
            pendingText="Aborting Race..."
            {...props}
        />
    );
};
