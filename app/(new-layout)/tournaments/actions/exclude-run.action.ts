'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { excludeRun as excludeRunApi } from '~src/lib/api/tournaments';

export async function excludeRun(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const user = form.get('user') as string;
    const date = form.get('date') as string;
    const session = await getSession();
    if (!session.id) return;

    await excludeRunApi(tournamentName, user, date, session.id);
    revalidateTag('tournaments', 'minutes');
}
