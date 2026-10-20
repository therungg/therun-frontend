'use server';

import { getSession } from '~src/actions/session.action';
import { RACES_URL } from '~src/lib/data-url';
import { getRaceByRaceId } from '~src/lib/races';
import { confirmPermission } from '~src/rbac/confirm-permission';

const racesApiUrl = RACES_URL as string;

export async function kickUser(raceInput: FormData) {
    const raceId = raceInput.get('raceId') as string;
    const user = raceInput.get('user') as string;
    const reason = raceInput.get('reason') as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    if (!user || reason.length < 1 || reason.length > 200) {
        return;
    }

    const race = await getRaceByRaceId(raceId);

    confirmPermission(session, 'moderate', 'race', race);

    const url = `${racesApiUrl}/${raceId}/participants/${user}/disqualify`;

    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ reason }),
    });
}
