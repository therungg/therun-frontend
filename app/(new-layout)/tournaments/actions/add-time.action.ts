'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';

export async function addTime(addTimeInput: FormData) {
    const tournamentName = addTimeInput.get('tournament') as string;
    const time = addTimeInput.get('time') as string;
    const user = addTimeInput.get('user') as string;
    const date = addTimeInput.get('date') as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    const url = `${
        process.env.NEXT_PUBLIC_DATA_URL
    }/tournaments/${encodeURIComponent(tournamentName)}/addTime`;

    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ user, date, time }),
    });

    revalidateTag(`tournaments`);
}
