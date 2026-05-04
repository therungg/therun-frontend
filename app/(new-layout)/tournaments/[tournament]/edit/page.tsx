import { notFound } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getTournamentByName } from '~src/components/tournament/getTournaments';
import { hasCapability } from '~src/lib/tournament-permissions';
import { safeDecodeURI, safeEncodeURI } from '~src/utils/uri';
import { PermissionDenied } from '../../components/permission-denied';
import { EditTournamentForm } from './edit-tournament-form';

export default async function EditTournamentPage({
    params,
}: {
    params: Promise<{ tournament: string }>;
}) {
    const { tournament: nameRaw } = await params;
    const name = safeDecodeURI(nameRaw);
    const tournamentHref = `/tournaments/${safeEncodeURI(name)}`;

    const tournament = await getTournamentByName(name);
    if (!tournament) notFound();

    const session = await getSession();
    if (!session?.username) {
        return (
            <PermissionDenied
                needsLogin
                reason={`Sign in with Twitch to edit "${tournament.shortName ?? tournament.name}".`}
                tournamentName={tournament.shortName ?? tournament.name}
                tournamentHref={tournamentHref}
            />
        );
    }

    if (!hasCapability(session, tournament, 'edit_settings')) {
        return (
            <PermissionDenied
                reason={`You don't have the "edit_settings" capability on this tournament.`}
                tournamentName={tournament.shortName ?? tournament.name}
                tournamentHref={tournamentHref}
            />
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: '960px' }}>
            <EditTournamentForm tournament={tournament} user={session} />
        </div>
    );
}
