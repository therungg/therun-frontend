'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { decideGameMergeRequest } from '~src/lib/reassignments';

export async function decideMergeRequestAction(
    id: number,
    decision: 'approve' | 'decline',
    reason?: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session.roles?.includes('admin')) {
        return { error: 'Not authorized.' };
    }
    try {
        await decideGameMergeRequest(id, decision, session.id, reason);
        revalidatePath('/admin/merge-requests');
        return { ok: true };
    } catch (e) {
        return {
            error: e instanceof Error ? e.message : 'The decision failed.',
        };
    }
}
