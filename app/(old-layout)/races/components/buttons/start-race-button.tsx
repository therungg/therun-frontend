import { startRace } from '~app/(old-layout)/races/actions/start-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

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
