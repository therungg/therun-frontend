import { getRaceByRaceId } from "~src/lib/races";
import { getSession } from "~src/actions/session.action";
import { Race } from "~app/races/races.types";
import { EditRace } from "~app/races/[race]/edit/edit-race";
import { User } from "../../../../types/session.types";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const raceId = params.race;

    const promises = [getRaceByRaceId(raceId), getSession()];

    const [race, session] = (await Promise.all(promises)) as [Race, User];

    return <EditRace race={race} user={session} />;
}
