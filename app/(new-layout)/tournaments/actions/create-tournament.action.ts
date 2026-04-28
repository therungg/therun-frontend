'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { createTournament } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';

export async function createTournamentAction(form: FormData) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };

    const name = (form.get('name') as string).trim();
    const startDate = form.get('startDate') as string;
    const endDate = form.get('endDate') as string;
    const description = (form.get('description') as string) || undefined;
    const shortName = (form.get('shortName') as string) || undefined;
    const game = (form.get('game') as string) || undefined;
    const category = (form.get('category') as string) || undefined;

    const eligibleRuns = game && category ? [{ game, category }] : [];

    try {
        await createTournament(
            {
                name,
                startDate,
                endDate,
                description,
                shortName,
                eligibleRuns,
                eligiblePeriods: [{ startDate, endDate }],
                hide: false,
            },
            session.id,
        );
    } catch (e) {
        if (e instanceof ApiError) {
            return { error: e.message, errors: e.errors };
        }
        throw e;
    }

    revalidateTag('tournaments', 'minutes');
    redirect(`/tournaments/${encodeURIComponent(name)}`);
}
