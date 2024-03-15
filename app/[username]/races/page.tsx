"use server";

import {
    getDetailedUserStats,
    getRaceParticipationsByUser,
    getRacesByIds,
} from "~src/lib/races";
import { UserRaceProfile } from "~app/[username]/races/user-race-profile";
import { DetailedUserStats, RaceParticipant } from "~app/races/races.types";
import { groupCategoryStatsByGame } from "~app/[username]/races/group-category-stats-by-game";

interface PageProps {
    params: { username: string };
}

export default async function Page({ params }: PageProps) {
    const { username } = params;

    const promises = [
        getDetailedUserStats(username),
        getRaceParticipationsByUser(username),
    ];

    const [globalStats, participations] = (await Promise.all(promises)) as [
        DetailedUserStats,
        RaceParticipant[],
    ];

    const initialRaces = await getRacesByIds(
        participations
            .slice(0, 10)
            .map((participation) => participation.raceId),
    );

    const categoryStatsMap = groupCategoryStatsByGame(
        globalStats.categoryStats,
    );

    return (
        <UserRaceProfile
            username={username}
            globalStats={globalStats.globalStats}
            categoryStatsMap={categoryStatsMap}
            participations={participations || []}
            initialRaces={initialRaces}
        />
    );
}
