'use server';

import { getSession } from '~src/actions/session.action';
import { RACES_URL } from '~src/lib/data-url';

const racesApiUrl = RACES_URL as string;

export async function startRace(raceInput: FormData) {
    const raceId = raceInput.get('raceId') as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    const url = `${racesApiUrl}/${raceId}/start`;

    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
    });
}
