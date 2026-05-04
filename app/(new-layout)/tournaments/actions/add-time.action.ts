'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { addCustomRun } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';

export async function addTime(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const time = form.get('time') as string;
    const user = form.get('user') as string;
    const date = form.get('date') as string;
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };

    try {
        await addCustomRun(tournamentName, user, time, date, session.id);
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
    revalidateTag('tournaments', 'seconds');
    return { ok: true as const };
}
