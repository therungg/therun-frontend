import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { canCreateTournament } from '~src/lib/tournament-permissions';
import { CreateTournamentForm } from './create-tournament-form';

export default async function CreateTournamentPage() {
    const session = await getSession();
    if (!canCreateTournament(session)) redirect('/tournaments');
    return (
        <div className="container py-4">
            <h1>Create Tournament</h1>
            <CreateTournamentForm />
        </div>
    );
}
