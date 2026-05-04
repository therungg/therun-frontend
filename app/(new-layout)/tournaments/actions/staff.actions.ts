'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { addStaff, removeStaff, updateStaff } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';
import type { Capability } from '../../../../types/tournament.types';

async function withSession<T>(fn: (sessionId: string) => Promise<T>) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        const ok = await fn(session.id);
        return { ok };
    } catch (e) {
        if (e instanceof ApiError) {
            return { error: e.message, errors: e.errors };
        }
        throw e;
    } finally {
        revalidateTag('tournaments', 'seconds');
    }
}

export async function addStaffAction(
    name: string,
    user: string,
    capabilities: Capability[],
) {
    return withSession((s) => addStaff(name, user, capabilities, s));
}

export async function updateStaffAction(
    name: string,
    user: string,
    capabilities: Capability[],
) {
    return withSession((s) => updateStaff(name, user, capabilities, s));
}

export async function removeStaffAction(name: string, user: string) {
    return withSession((s) => removeStaff(name, user, s));
}
