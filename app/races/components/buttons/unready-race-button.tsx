import { RaceActionButton } from "~app/races/components/buttons/race-action-button";
import { unreadyRace } from "~src/actions/races/unready-race.action";

export const UnreadyRaceButton = ({ raceId }: { raceId: string }) => {
    return (
        <RaceActionButton
            raceId={raceId}
            action={unreadyRace}
            innerText={"Not ready"}
            pendingText={"Setting not ready..."}
        />
    );
};
