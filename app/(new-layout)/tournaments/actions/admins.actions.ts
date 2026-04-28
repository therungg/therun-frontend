'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { addAdmin, removeAdmin } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';

async function run<T>(fn: (s: string) => Promise<T>) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        const ok = await fn(session.id);
        return { ok };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    } finally {
        revalidateTag('tournaments', 'minutes');
    }
}

export const addAdminAction = (name: string, user: string) =>
    run((s) => addAdmin(name, user, s));

export const removeAdminAction = (name: string, user: string) =>
    run((s) => removeAdmin(name, user, s));
