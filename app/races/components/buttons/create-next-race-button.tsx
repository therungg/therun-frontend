import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { createSuccessorRace } from "~src/actions/races/create-successor-race.action";

export const CreateNextRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={createSuccessorRace}
            innerText={"Create Successor Race"}
            pendingText={"Creating Successor Race"}
        />
    );
};
