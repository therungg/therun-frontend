'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { addCustomRun } from '~src/lib/api/tournaments';

export async function addTime(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const time = form.get('time') as string;
    const user = form.get('user') as string;
    const date = form.get('date') as string;
    const session = await getSession();
    if (!session.id) return;

    await addCustomRun(tournamentName, user, time, date, session.id);
    revalidateTag('tournaments', 'minutes');
}
