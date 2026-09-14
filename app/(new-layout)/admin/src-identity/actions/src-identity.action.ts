'use server';

import { getSession } from '~src/actions/session.action';
import { apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';

export interface SrcIdentity {
    username: string;
    srcUserId: string | null;
    srcUsername: string | null;
    srcVerifiedAt?: string | null;
}

// The identity routes live on the src-import API, not the main /admin one.
const path = (username: string) =>
    `/src-import/admin/users/${encodeURIComponent(username)}/src-identity`;

async function adminSession() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');
    return user.id;
}

export async function getSrcIdentityAction(username: string) {
    const sessionId = await adminSession();
    return apiFetch<SrcIdentity>(path(username), { sessionId });
}

export async function setSrcIdentityAction(username: string, srcName: string) {
    const sessionId = await adminSession();
    return apiFetch<SrcIdentity>(path(username), {
        sessionId,
        method: 'PUT',
        body: { srcName },
    });
}

export async function clearSrcIdentityAction(username: string) {
    const sessionId = await adminSession();
    return apiFetch<SrcIdentity>(path(username), {
        sessionId,
        method: 'DELETE',
    });
}
