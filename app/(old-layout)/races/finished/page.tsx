import { Metadata } from 'next';
import { FinishedRaces } from '~app/(old-layout)/races/finished/finished-races-page';
import { getPaginatedFinishedRaces } from '~src/lib/races';
import buildMetadata from '~src/utils/metadata';

export default async function FinishedRacesPage() {
    const finishedRaces = await getPaginatedFinishedRaces(1, 12);

    return <FinishedRaces paginatedRaces={finishedRaces} />;
}

export async function generateMetadata(): Promise<Metadata> {
    return buildMetadata({
        title: `Finished Races`,
        description: `Detailed list of finished speedrun races on therun.gg.`,
        index: true,
    });
}
