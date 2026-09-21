'use server';

import { getSession } from '~src/actions/session.action';
import { undoCategoryReassignment } from '~src/lib/reassignments';

/**
 * Take a category merge back.
 *
 * Not the mod-log undo the rest of History uses: a merge is a reassignment
 * with its own row, its own run history and its own endpoint, and the log
 * line only carries the id of it. Undoing one member of a batch takes the
 * whole batch back, which the backend decides — five boards folded into one
 * was one job and comes back as one.
 */
export async function undoMergeAction(
    reassignmentId: number,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    try {
        await undoCategoryReassignment(reassignmentId, session.id);
        return { ok: true };
    } catch (e) {
        return {
            error: e instanceof Error ? e.message : 'The undo failed.',
        };
    }
}
