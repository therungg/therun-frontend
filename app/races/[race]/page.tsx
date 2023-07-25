import { getRaceByRaceId } from "~src/lib/races";
import { RaceDetail } from "~app/races/[race]/race-view";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const race = await getRaceByRaceId(params.race);

    return <RaceDetail race={race} />;
}
