import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { readyRace } from "~src/actions/races/ready-race.action";

export const ReadyRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={readyRace}
            innerText={"Ready!"}
            pendingText={"Readying up..."}
        />
    );
};
