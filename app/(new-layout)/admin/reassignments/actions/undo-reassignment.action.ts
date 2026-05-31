'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import {
    undoCategoryReassignment,
    undoGameReassignment,
} from '~src/lib/reassignments';
import { defineAbilityFor } from '~src/rbac/ability';

const PAGE_PATH = '/admin/reassignments';

export async function undoReassignmentAction(
    kind: 'game' | 'category',
    id: number,
): Promise<{ id: number; undone: true }> {
    const session = await getSession();
    if (!defineAbilityFor(session).can('reassign', 'reassignment')) {
        throw new Error('Forbidden: reassign permission required');
    }

    const result =
        kind === 'game'
            ? await undoGameReassignment(id, session.id)
            : await undoCategoryReassignment(id, session.id);

    revalidatePath(PAGE_PATH);
    return result;
}
