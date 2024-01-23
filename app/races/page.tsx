import {
    getAllActiveRaces,
    getGlobalRaceStats,
    getPaginatedFinishedRaces,
    getRaceGameStats,
    getRaceParticipationsByUser,
} from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import { getSession } from "~src/actions/session.action";
import {
    ActiveRaces,
    GameStats,
    GlobalStats,
    PaginatedRaces,
} from "~app/races/races.types";
import { User } from "../../types/session.types";

export default async function RacePage() {
    const promises = [
        getAllActiveRaces(),
        getPaginatedFinishedRaces(),
        getGlobalRaceStats(),
        getRaceGameStats(),
        getSession(),
    ];

    const [races, finishedRaces, globalRaceStats, gameStats, session]: [
        ActiveRaces,
        PaginatedRaces,
        GlobalStats,
        GameStats[],
        User,
    ] = (await Promise.all(promises)) as [
        ActiveRaces,
        PaginatedRaces,
        GlobalStats,
        GameStats[],
        User,
    ];

    const pendingRaces = [...races.pending, ...races.starting];

    // TODO: Should only get participations for relevant races in pagination. This is just for POC
    const raceParticipations =
        (await getRaceParticipationsByUser(session.username)) || [];

    return (
        <RaceOverview
            pendingRaces={pendingRaces}
            inProgressRaces={races.inProgress}
            finishedRaces={finishedRaces}
            globalRaceStats={globalRaceStats}
            globalGameStats={gameStats}
            user={session}
            raceParticipations={raceParticipations}
        />
    );
}
