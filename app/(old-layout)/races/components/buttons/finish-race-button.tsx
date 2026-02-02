import { finishRace } from '~app/(old-layout)/races/actions/finish-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

export const FinishRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={finishRace}
            innerText="Finish Race"
            pendingText="Finishing Race..."
            {...props}
        />
    );
};
