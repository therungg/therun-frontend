import { RaceParticipant, UserStats } from "~app/races/races.types";

interface UserRaceProfileProps {
    username: string;
    stats: UserStats;
    participations: RaceParticipant[];
}

export const UserRaceProfile = ({
    username,
    stats,
    participations,
}: UserRaceProfileProps) => {
    return (
        <div>
            {username} {participations.length} {stats.totalRaces}
        </div>
    );
};
