import { startRace } from '~app/(new-layout)/races/actions/start-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

export const StartRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={startRace}
            innerText="Start Countdown"
            pendingText="Starting Countdown..."
            {...props}
        />
    );
};
