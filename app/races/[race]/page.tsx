import { getRaceByRaceId } from "~src/lib/races";
import { RaceDetail } from "~app/races/[race]/race-view";
import { getSession } from "~src/actions/session.action";
import buildMetadata from "~src/utils/metadata";

interface PageProps {
    params: { race: string };
}

export default async function RaceDetailPage({ params }: PageProps) {
    const race = await getRaceByRaceId(params.race);
    const session = await getSession();

    return <RaceDetail race={race} user={session} />;
}

export const metadata = buildMetadata({
    title: "Watch Live Runs",
    description:
        "Watch streams of runners who are currently live and attempting a run, and discover new runners for your favorite games!",
});
