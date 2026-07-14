'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError } from '~src/lib/api-client';
import { approveBoardClaim, denyBoardClaim } from '~src/lib/board-claims';
import type { BoardModRole } from '../../../../../types/board-claims.types';

const PAGE_PATH = '/admin/board-claims';

function isAdmin(roles: string[] | undefined): boolean {
    return roles?.includes('admin') ?? false;
}

export async function approveClaimAction(
    claimId: number,
    role: BoardModRole,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    if (!isAdmin(user?.roles)) return { error: 'Admin role required.' };
    try {
        await approveBoardClaim(user.id, claimId, role);
        revalidatePath(PAGE_PATH);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to approve application.' };
    }
}

export async function denyClaimAction(
    claimId: number,
    reason: string,
): Promise<{ ok: true } | { error: string }> {
    const user = await getSession();
    if (!isAdmin(user?.roles)) return { error: 'Admin role required.' };
    try {
        await denyBoardClaim(user.id, claimId, reason.trim() || undefined);
        revalidatePath(PAGE_PATH);
        return { ok: true };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to deny application.' };
    }
}
