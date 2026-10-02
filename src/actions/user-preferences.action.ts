'use server';

import { updateTag } from 'next/cache';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import type { UserPreferences } from '../../types/session.types';
import { getSession } from './session.action';

export async function toggleStreakVisibility(
    hideStreaks: boolean,
): Promise<ActionResult> {
    return savePreference({ hideStreaks });
}

export async function toggleAutoSubmitPbs(
    autoSubmitPbs: boolean,
): Promise<ActionResult> {
    return savePreference({ autoSubmitPbs });
}

async function savePreference(
    preference: Partial<UserPreferences>,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.user || !session.id) {
        return { ok: false, error: 'You must be signed in.' };
    }
    try {
        await apiFetch(
            `/users/${encodeURIComponent(session.user)}/preferences`,
            {
                method: 'PUT',
                sessionId: session.id,
                body: preference,
            },
        );
    } catch (e) {
        return mapApiError(e);
    }
    updateTag(`user-preferences-${session.user}`);
    return { ok: true };
}
