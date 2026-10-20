'use server';

import { getSession } from '~src/actions/session.action';
import { RACES_URL } from '~src/lib/data-url';

const racesApiUrl = RACES_URL as string;

export async function leaveRace(raceInput: FormData) {
    const raceId = raceInput.get('raceId') as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    const url = `${racesApiUrl}/${raceId}/participants`;

    await fetch(url, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
    });
}
