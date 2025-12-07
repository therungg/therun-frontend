"use server";

import {
    getDetailedUserStats,
    getRaceParticipationsByUser,
    getRacesByIds,
} from "~src/lib/races";
import { UserRaceProfile } from "~app/(old-layout)/[username]/races/user-race-profile";
import {
    DetailedUserStats,
    RaceParticipant,
} from "~app/(old-layout)/races/races.types";
import { groupCategoryStatsByGame } from "~app/(old-layout)/[username]/races/group-category-stats-by-game";
import { safeDecodeURI } from "~src/utils/uri";

interface PageProps {
    params: Promise<{ username: string }>;
}

export default async function Page(props: PageProps) {
    const params = await props.params;
    const username = safeDecodeURI(params.username);

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
