'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import {
    removeParticipant,
    setParticipantStatus,
} from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';
import type { ParticipantStatus } from '../../../../types/tournament.types';

async function run<T>(fn: (s: string) => Promise<T>) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        return { ok: await fn(session.id) };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    } finally {
        revalidateTag('tournaments', 'minutes');
    }
}

export const setParticipantStatusAction = (
    name: string,
    user: string,
    status: ParticipantStatus,
) => run((s) => setParticipantStatus(name, user, status, s));

export const removeParticipantAction = (name: string, user: string) =>
    run((s) => removeParticipant(name, user, s));
