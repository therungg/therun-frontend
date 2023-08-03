import { getAllRaces, getRaceParticipationsByUser } from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import { getSession } from "~src/actions/session.action";

export default async function RacePage() {
    // TODO: API should paginate this. This is just for POC
    const races = await getAllRaces();
    const session = await getSession();

    // TODO: Should only get participations for relevant races in pagination. This is just for POC
    const raceParticipations =
        (await getRaceParticipationsByUser(session.username)) || [];

    return (
        <RaceOverview
            races={races}
            user={session}
            raceParticipations={raceParticipations}
        />
    );
}
