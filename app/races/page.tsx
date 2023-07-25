import { getAllRaces } from "~src/lib/races";
import { RaceOverview } from "~app/races/race-overview";
import { getSession } from "~src/actions/session.action";

export default async function RacePage() {
    const races = await getAllRaces();
    const session = await getSession();

    return <RaceOverview races={races} user={session} />;
}
