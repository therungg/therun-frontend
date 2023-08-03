import { getRaceByRaceId } from "~src/lib/races";
import { RaceDetail } from "~app/races/[race]/race-view";
import { getSession } from "~src/actions/session.action";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const race = await getRaceByRaceId(params.race);
    const session = await getSession();

    return <RaceDetail race={race} user={session} />;
}
