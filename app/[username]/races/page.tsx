"use server";

import { getRaceParticipationsByUser, getUserRaceStats } from "~src/lib/races";
import { UserRaceProfile } from "~app/[username]/races/user-race-profile";
import { RaceParticipant, UserStats } from "~app/races/races.types";

interface PageProps {
    params: { username: string };
}

export default async function Page({ params }: PageProps) {
    const { username } = params;

    const promises = [
        getUserRaceStats(username),
        getRaceParticipationsByUser(username),
    ];

    const [globalStats, participations] = (await Promise.all(promises)) as [
        UserStats,
        RaceParticipant[],
    ];

    return (
        <UserRaceProfile
            username={username}
            stats={globalStats}
            participations={participations || []}
        />
    );
}
