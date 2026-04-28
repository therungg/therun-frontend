'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { deleteTournament } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';

export async function deleteTournamentAction(name: string) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        await deleteTournament(name, session.id);
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
    revalidateTag('tournaments', 'minutes');
    redirect('/tournaments');
}
