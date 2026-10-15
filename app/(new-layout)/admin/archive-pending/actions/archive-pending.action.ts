'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    SrcArchivePending,
    SrcArchivePendingStatus,
} from '../../../../../types/src-import.types';

const BASE = '/src-import/admin/archive-pending';
const PAGE_PATH = '/admin/archive-pending';

export interface ArchivePendingFilter {
    status?: SrcArchivePendingStatus;
    activeMods?: boolean;
    sort?: 'runs' | 'staged';
    q?: string;
}

async function adminSession() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');
    return user.id;
}

export async function listArchivePending(
    filter: ArchivePendingFilter,
): Promise<SrcArchivePending> {
    const sessionId = await adminSession();
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.activeMods) params.set('activeMods', '1');
    if (filter.sort) params.set('sort', filter.sort);
    if (filter.q) params.set('q', filter.q);
    const query = params.toString();
    return apiFetch<SrcArchivePending>(query ? `${BASE}?${query}` : BASE, {
        sessionId,
    });
}

async function post(
    jobId: number,
    verb: 'contacted' | 'apply-defaults',
): Promise<{ ok: true } | { error: string }> {
    try {
        const sessionId = await adminSession();
        await apiFetch(`${BASE}/${jobId}/${verb}`, {
            sessionId,
            method: 'POST',
        });
        revalidatePath(PAGE_PATH);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Something went wrong. Please try again.' };
    }
}

export async function markArchiveContacted(jobId: number) {
    return post(jobId, 'contacted');
}

export async function applyArchiveDefaults(jobId: number) {
    return post(jobId, 'apply-defaults');
}
