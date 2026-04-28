'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { setRunsEndTime } from '~src/lib/api/tournaments';

export async function increaseEndTimeByAnHour(form: FormData) {
    const tournamentName = form.get('tournament') as string;
    const date = form.get('date') as string;
    const heatRaw = form.get('heat') as string | null;
    const heat =
        heatRaw === null || heatRaw === '' ? undefined : Number(heatRaw);
    const session = await getSession();
    if (!session.id) return;

    await setRunsEndTime(tournamentName, date, heat, session.id);
    revalidateTag('tournaments', 'minutes');
}
