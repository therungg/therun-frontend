import { unreadyRace } from '~app/(new-layout)/races/actions/unready-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(new-layout)/races/components/buttons/race-action-button';

export const UnreadyRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={unreadyRace}
            innerText="Not ready"
            pendingText="Setting not ready..."
            {...props}
        />
    );
};
