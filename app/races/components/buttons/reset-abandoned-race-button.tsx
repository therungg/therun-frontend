import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { resetAbandonedRace } from "~src/actions/races/reset-abandoned-race.action";

export const ResetAbandonedRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={resetAbandonedRace}
            innerText={"Reset Current Race"}
            pendingText={"Resetting Race"}
            {...props}
        />
    );
};
