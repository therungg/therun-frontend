import { getAllActiveRaces, getRaceParticipationsByUser } from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import { getSession } from "~src/actions/session.action";

export default async function RacePage() {
    const races = await getAllActiveRaces();
    const session = await getSession();

    const pendingRaces = [...races.pending, ...races.starting];

    // TODO: Should only get participations for relevant races in pagination. This is just for POC
    const raceParticipations =
        (await getRaceParticipationsByUser(session.username)) || [];

    return (
        <RaceOverview
            pendingRaces={pendingRaces}
            inProgressRaces={races.inProgress}
            user={session}
            raceParticipations={raceParticipations}
        />
    );
}
