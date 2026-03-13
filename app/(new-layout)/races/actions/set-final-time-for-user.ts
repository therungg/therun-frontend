'use server';

import { getSession } from '~src/actions/session.action';
import { getRaceByRaceId } from '~src/lib/races';
import { confirmPermission } from '~src/rbac/confirm-permission';

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;
export async function setFinalTimeForUser(raceInput: FormData) {
    const raceId = raceInput.get('raceId') as string;
    const finalTime = raceInput.get('finalTime') as string;
    const user = raceInput.get('user') as string;
    const session = await getSession();

    if (!session.id || !user || !finalTime) {
        return;
    }

    const race = await getRaceByRaceId(raceId);

    confirmPermission(session, 'moderate', 'race', race);

    const url = `${racesApiUrl}/${raceId}/participants/${user}/confirm`;

    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ finalTime }),
    });
}
