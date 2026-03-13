'use server';

import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';

export async function moveUserAction(from: string, to: string) {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'roles');

    if (!user.id) {
        throw new Error('Not authenticated');
    }

    const url = `${process.env.NEXT_PUBLIC_DATA_URL}/admin/move-user`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ from, to }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to move user: ${text}`);
    }

    return { success: true };
}
