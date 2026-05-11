'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { assignRole } from '~src/lib/role-assignments';
import { getPaginatedUsers } from '~src/lib/users';

const PAGE_PATH = '/admin/role-assignments';

function ensureAdmin(roles: string[] | undefined) {
    if (!roles?.includes('admin')) {
        throw new Error('Forbidden: admin role required');
    }
}

export async function assignGlobalAdminAction(
    username: string,
): Promise<{ id: number; userId: number; username: string }> {
    const session = await getSession();
    ensureAdmin(session.roles);

    const trimmed = username.trim();
    if (!trimmed) throw new Error('Username is required');

    const search = await getPaginatedUsers(1, 10, trimmed, '', session.id);
    const match = search.items.find(
        (u) => u.username.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!match) throw new Error(`User "${trimmed}" not found`);

    const result = await assignRole(
        { userId: match.id, role: 'global-admin' },
        session.id,
    );

    revalidatePath(PAGE_PATH);
    return { id: result.id, userId: match.id, username: match.username };
}
