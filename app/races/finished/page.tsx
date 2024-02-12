import { getPaginatedFinishedRaces } from "~src/lib/races";
import { FinishedRaces } from "~app/races/finished/finished-races-page";
import { Metadata } from "next";
import buildMetadata from "~src/utils/metadata";

export default async function FinishedRacesPage() {
    const finishedRaces = await getPaginatedFinishedRaces(1, 12);

    return <FinishedRaces paginatedRaces={finishedRaces} />;
}

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: `A list of finished speedrun races`,
        description: `Detailed list of finished speedrun races on therun.gg.`,
        index: true,
    });
}
