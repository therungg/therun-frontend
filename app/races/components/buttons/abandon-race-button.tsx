import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { leaveRace } from "~src/actions/races/leave-race.action";

export const AbandonRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={leaveRace}
            innerText={"Abandon Race :("}
            pendingText={"Abandoning Race..."}
        />
    );
};
