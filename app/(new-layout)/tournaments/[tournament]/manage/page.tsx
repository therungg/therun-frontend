import { notFound, redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { getTournamentByName } from '~src/components/tournament/getTournaments';
import {
    hasCapability,
    isTournamentAdmin,
} from '~src/lib/tournament-permissions';
import { ManagePanel } from './manage-panel';

export default async function ManageTournamentPage({
    params,
}: {
    params: Promise<{ tournament: string }>;
}) {
    const { tournament: nameRaw } = await params;
    const name = decodeURIComponent(nameRaw);
    const session = await getSession();
    if (!session?.username) {
        redirect(`/tournaments/${encodeURIComponent(name)}`);
    }

    const tournament = await getTournamentByName(name);
    if (!tournament) notFound();

    const anyCapability =
        isTournamentAdmin(session, tournament) ||
        hasCapability(session, tournament, 'edit_settings') ||
        hasCapability(session, tournament, 'manage_staff') ||
        hasCapability(session, tournament, 'manage_participants') ||
        hasCapability(session, tournament, 'manage_runs') ||
        hasCapability(session, tournament, 'lifecycle');

    if (!anyCapability) {
        redirect(`/tournaments/${encodeURIComponent(name)}`);
    }

    return (
        <div className="container py-4">
            <h1>Manage: {tournament.shortName ?? tournament.name}</h1>
            <ManagePanel tournament={tournament} user={session} />
        </div>
    );
}
