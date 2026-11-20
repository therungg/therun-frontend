'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { SrcUsernameRequest } from '../../../../../types/src-admin-sync.types';

const BASE = '/src-import/admin/identity-requests';
const PAGE_PATH = '/admin/src-identity';

async function adminSession() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');
    return user.id;
}

/** Pending requests, oldest first. */
export async function listSrcIdentityRequests(): Promise<SrcUsernameRequest[]> {
    const sessionId = await adminSession();
    return apiFetch<SrcUsernameRequest[]>(BASE, { sessionId });
}

async function decide(
    id: number,
    verb: 'approve' | 'reject',
): Promise<{ ok: true } | { error: string }> {
    try {
        const sessionId = await adminSession();
        await apiFetch<{ ok: true }>(`${BASE}/${id}/${verb}`, {
            sessionId,
            method: 'POST',
        });
        revalidatePath(PAGE_PATH);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: `Could not ${verb} the request.` };
    }
}

export async function approveSrcIdentityRequest(id: number) {
    return decide(id, 'approve');
}

export async function rejectSrcIdentityRequest(id: number) {
    return decide(id, 'reject');
}
