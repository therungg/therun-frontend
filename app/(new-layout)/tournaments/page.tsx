import {
    AllTournaments,
    Tournaments,
} from '~app/(new-layout)/tournaments/all-tournaments';
import { getSession } from '~src/actions/session.action';
import { getTournaments } from '~src/components/tournament/getTournaments';
import { Tournament } from '~src/components/tournament/tournament-info';
import { canCreateTournament } from '~src/lib/tournament-permissions';
import buildMetadata from '~src/utils/metadata';

export default async function TournamentsPage() {
    const tournaments: Tournament[] = await getTournaments();
    const session = await getSession();

    return (
        <>
            {canCreateTournament(session) && (
                <div className="text-end mb-3">
                    <a href="/tournaments/create" className="btn btn-primary">
                        Create tournament
                    </a>
                </div>
            )}
            <Tournaments tournaments={tournaments} />
        </>
    );
}

export const metadata = buildMetadata({
    title: 'Tournaments',
    description:
        'Itching for some tournament action? Browse a selection of tournaments whose participants use The Run for an unprecedented look at tournament statistics!',
});
