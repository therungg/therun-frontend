import { Race } from "~app/races/races.types";
import { UserLink } from "~src/components/links/links";

export const InProgressRaces = ({ races }: { races: Race[] }) => {
    return (
        <div>
            {races.map((race) => (
                <InProgressRace key={race.raceId} race={race} />
            ))}
        </div>
    );
};

export const InProgressRace = ({ race }: { race: Race }) => {
    return (
        <div>
            {race.customName} by <UserLink username={race.creator} />
        </div>
    );
};
