import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { joinRace } from "~src/actions/races/join-race.action";

export const JoinRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={joinRace}
            innerText={"Join Race"}
            pendingText={"Joining Race"}
        />
    );
};
