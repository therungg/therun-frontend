'use server';

import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    MergeApplyResponse,
    MergePreviewResponse,
} from '../../../../../types/username-change.types';

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

// Same endpoint, `mode: 'merge'` branch. The dry run and the real merge run
// the identical backend code path (a rolled-back transaction vs. a committed
// one), so a preview here can never drift from what the merge actually does.
async function postMerge(twitchUserId: string, dryRun: boolean) {
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
        body: JSON.stringify({ mode: 'merge', twitchUserId, dryRun }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(
            `Failed to ${dryRun ? 'preview' : 'run'} merge: ${text}`,
        );
    }

    // This route replies through the shared `respond()` envelope
    // (`{ result: ... }`), unlike apiFetch callers this action doesn't
    // unwrap for itself.
    const body = await res.json();
    return body.result;
}

export async function previewMergeAction(
    twitchUserId: string,
): Promise<MergePreviewResponse> {
    return postMerge(twitchUserId, true);
}

export async function mergeUsersAction(
    twitchUserId: string,
): Promise<MergeApplyResponse> {
    return postMerge(twitchUserId, false);
}
