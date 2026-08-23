'use server';

import { updateTag } from 'next/cache';
import { type ActionResult, mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';
import {
    normaliseHandle,
    type ProfileInput,
    profileSchema,
} from '~src/lib/profile-schema';
import { getSession } from './session.action';

export async function updateProfile(
    input: ProfileInput,
): Promise<ActionResult> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { ok: false, error: 'You must be signed in.' };
    }

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            error: parsed.error.issues[0]?.message ?? 'Invalid input',
        };
    }
    const body = { ...parsed.data };
    if (body.socials) {
        body.socials = {
            ...body.socials,
            ...(body.socials.youtube !== undefined && {
                youtube: normaliseHandle('youtube', body.socials.youtube),
            }),
            ...(body.socials.twitter !== undefined && {
                twitter: normaliseHandle('twitter', body.socials.twitter),
            }),
        };
    }

    try {
        await apiFetch(`/users/${encodeURIComponent(session.username)}`, {
            method: 'PUT',
            sessionId: session.id,
            body,
        });
    } catch (e) {
        return mapApiError(e);
    }

    updateTag(`user-${session.username}`);
    return { ok: true };
}
