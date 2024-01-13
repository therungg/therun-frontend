import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { finishRace } from "~src/actions/races/finish-race.action";

export const FinishRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={finishRace}
            innerText={"Finish Race"}
            pendingText={"Finishing Race..."}
        />
    );
};
