import { getRaceByRaceId, getRaceMessages } from "~src/lib/races";
import { RaceDetail } from "~app/races/[race]/race-view";
import { getSession } from "~src/actions/session.action";
import { Race, RaceMessage } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { sortRaceParticipants } from "~app/races/[race]/sort-race-participants";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const raceId = params.race;

    const promises = [
        getRaceByRaceId(raceId),
        getSession(),
        getRaceMessages(raceId),
    ];

    const [race, session, messages] = (await Promise.all(promises)) as [
        Race,
        User,
        RaceMessage[],
    ];

    race.participants = sortRaceParticipants(race);

    return <RaceDetail race={race} user={session} messages={messages} />;
}
