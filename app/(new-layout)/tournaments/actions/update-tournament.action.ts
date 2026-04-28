'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { updateTournament } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';
import type { Tournament } from '../../../../types/tournament.types';

export async function updateTournamentAction(
    name: string,
    patch: Partial<Tournament>,
) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        await updateTournament(name, patch, session.id);
    } catch (e) {
        if (e instanceof ApiError) {
            return { error: e.message, errors: e.errors };
        }
        throw e;
    }
    revalidateTag('tournaments', 'minutes');
    return { ok: true as const };
}
