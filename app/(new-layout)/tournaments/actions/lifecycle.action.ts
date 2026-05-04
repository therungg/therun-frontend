'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import {
    type LifecycleAction,
    lifecycleAction,
} from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';

export async function lifecycleActionServer(
    name: string,
    action: LifecycleAction,
) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };
    try {
        const ok = await lifecycleAction(name, action, session.id);
        revalidateTag('tournaments', 'seconds');
        return { ok };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
}
