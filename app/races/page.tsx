import {
    getAllActiveRaces,
    getPaginatedFinishedRaces,
    getRaceParticipationsByUser,
} from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import { getSession } from "~src/actions/session.action";
import { ActiveRaces, PaginatedRaces } from "~app/races/races.types";
import { User } from "../../types/session.types";

export default async function RacePage() {
    const promises = [
        getAllActiveRaces(),
        getPaginatedFinishedRaces(),
        getSession(),
    ];

    const [races, finishedRaces, session]: [ActiveRaces, PaginatedRaces, User] =
        (await Promise.all(promises)) as [ActiveRaces, PaginatedRaces, User];

    const pendingRaces = [...races.pending, ...races.starting];

    // TODO: Should only get participations for relevant races in pagination. This is just for POC
    const raceParticipations =
        (await getRaceParticipationsByUser(session.username)) || [];

    return (
        <RaceOverview
            pendingRaces={pendingRaces}
            inProgressRaces={races.inProgress}
            finishedRaces={finishedRaces}
            user={session}
            raceParticipations={raceParticipations}
        />
    );
}
