import { resetAbandonedRace } from '~app/(old-layout)/races/actions/reset-abandoned-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

export const ResetAbandonedRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={resetAbandonedRace}
            innerText="Reset Current Race"
            pendingText="Resetting Race"
            {...props}
        />
    );
};
