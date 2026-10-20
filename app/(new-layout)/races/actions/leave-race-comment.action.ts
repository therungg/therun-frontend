'use server';

import { getSession } from '~src/actions/session.action';
import { RACES_URL } from '~src/lib/data-url';

const racesApiUrl = RACES_URL as string;

export async function leaveRaceComment(raceInput: FormData) {
    const raceId = raceInput.get('raceId') as string;
    const comment = raceInput.get('comment') as string;
    const session = await getSession();

    if (!session.id) {
        return;
    }

    if (comment.length > 200) {
        return;
    }

    const url = `${racesApiUrl}/${raceId}/participants/comment`;

    await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
        },
        body: JSON.stringify({ comment }),
    });
}
