import { getRaceByRaceId } from "~src/lib/races";
import { RaceDetail } from "~app/races/[race]/race-view";
import { getSession } from "~src/actions/session.action";
import { Race } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const promises = [getRaceByRaceId(params.race), getSession()];

    const [race, session] = (await Promise.all(promises)) as [Race, User];

    race.participants = sortRaceParticipants(race);

    return <RaceDetail race={race} user={session} />;
}
