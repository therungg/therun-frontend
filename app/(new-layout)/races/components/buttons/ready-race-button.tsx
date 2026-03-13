import { readyRace } from '~app/(new-layout)/races/actions/ready-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

export const ReadyRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={readyRace}
            innerText="Ready!"
            pendingText="Readying up..."
            {...props}
        />
    );
};
