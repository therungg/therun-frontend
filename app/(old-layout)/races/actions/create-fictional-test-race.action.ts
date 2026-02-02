'use server';

import { redirect } from 'next/navigation';
import { getApiKey } from '~src/actions/api-key.action';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';

const racesApiUrl = process.env.NEXT_PUBLIC_RACE_API_URL as string;

export async function createFictionalTestRace() {
    const session = await getSession();
    const apiKey = await getApiKey();

    if (!session.id) return;

    confirmPermission(session, 'edit', 'race');

    const url = `${racesApiUrl}/testRace`;

    const result = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.id}`,
            'x-api-key': apiKey,
        },
    });

    if (result.status !== 200) {
        const text = await result.text();
        return { message: text };
    }

    const raceId = (await result.json()).result.raceId;

    redirect(`/races/${raceId}`);
}
