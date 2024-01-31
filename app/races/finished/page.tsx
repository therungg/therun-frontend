import { getPaginatedFinishedRaces } from "~src/lib/races";
import { FinishedRaces } from "~app/races/finished/finished-races-page";

export default async function FinishedRacesPage() {
    const finishedRaces = await getPaginatedFinishedRaces(1, 10);

    return <FinishedRaces paginatedRaces={finishedRaces} />;
}
