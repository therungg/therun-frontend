import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { deleteRace } from "~src/actions/races/delete-race.action";

export const DeleteRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={deleteRace}
            innerText={"Delete Race"}
            pendingText={"Deleting Race"}
        />
    );
};
