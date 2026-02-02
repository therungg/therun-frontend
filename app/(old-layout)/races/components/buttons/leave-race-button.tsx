import { leaveRace } from '~app/(old-layout)/races/actions/leave-race.action';
import {
    RaceActionButton,
    RaceActionProps,
} from '~app/(old-layout)/races/components/buttons/race-action-button';

export const LeaveRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={leaveRace}
            innerText="Unjoin Race"
            pendingText="Unjoining Race"
            {...props}
        />
    );
};
