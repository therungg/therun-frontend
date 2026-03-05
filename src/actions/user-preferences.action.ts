'use server';

import { revalidateTag } from 'next/cache';
import { apiFetch } from '~src/lib/api-client';
import { getSession } from './session.action';

export async function toggleStreakVisibility(hideStreaks: boolean) {
    const session = await getSession();
    if (!session?.user) {
        throw new Error('Not authenticated');
    }

    await apiFetch(`/users/${encodeURIComponent(session.user)}/preferences`, {
        method: 'PUT',
        sessionId: session.id,
        body: JSON.stringify({ hideStreaks }),
    });

    revalidateTag(`user-preferences-${session.user}`, 'minutes');
}
