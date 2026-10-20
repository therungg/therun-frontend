'use server';

import { getSession } from '~src/actions/session.action';
import { RACES_URL } from '~src/lib/data-url';

const racesApiUrl = RACES_URL as string;

export async function sendChatMessage(raceInput: FormData) {
    const raceId = raceInput.get('raceId') as string;
    const message = raceInput.get('message') as string;
    const session = await getSession();

    if (!message || message.length > 200) {
        return;
    }

    if (!session.id) {
        return;
    }

    const url = `${racesApiUrl}/${raceId}/messages`;

    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ message }),
    });
}
