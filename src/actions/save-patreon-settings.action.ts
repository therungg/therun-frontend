'use server';

import { revalidateTag } from 'next/cache';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import type { PatronPreferences } from '../../types/patreon.types';
import { getSession } from './session.action';

export async function savePatreonSettings(
    preferences: PatronPreferences,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }
    try {
        await apiFetch(
            `/users/patreon/${encodeURIComponent(session.username)}`,
            {
                method: 'POST',
                sessionId: session.id,
                body: preferences,
            },
        );
    } catch (e) {
        return mapApiError(e);
    }
    // The patron list is read with cacheLife('hours'); stale-while-revalidate
    // is fine here — the customiser refreshes itself via router.refresh().
    revalidateTag('patrons', 'hours');
    return { ok: true };
}
