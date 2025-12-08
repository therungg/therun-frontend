import {
    AllTournaments,
    Tournaments,
} from '~app/(old-layout)/tournaments/all-tournaments';
import { getTournaments } from '~src/components/tournament/getTournaments';
import { Tournament } from '~src/components/tournament/tournament-info';
import buildMetadata from '~src/utils/metadata';

export default async function TournamentsPage() {
    const tournaments: Tournament[] = await getTournaments();

    return <Tournaments tournaments={tournaments} />;
}

export const metadata = buildMetadata({
    title: 'Tournaments',
    description:
        'Itching for some tournament action? Browse a selection of tournaments whose participants use The Run for an unprecedented look at tournament statistics!',
});
