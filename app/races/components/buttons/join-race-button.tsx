import {
    RaceActionButton,
    RaceActionProps,
} from "~app/races/components/buttons/race-action-button";
import { joinRace } from "~src/actions/races/join-race.action";

export const JoinRaceButton = (props: RaceActionProps) => {
    return (
        <RaceActionButton
            action={joinRace}
            innerText={"Join Race"}
            pendingText={"Joining Race"}
            {...props}
        />
    );
};
