'use server';

import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    MergeApplyResponse,
    MergePreviewResponse,
} from '../../../../../types/username-change.types';

// POST /admin/move-user, `mode: 'merge'`. The dry run and the real merge run
// the identical backend code path (a rolled-back transaction vs. a committed
// one), so a preview here can never drift from what the merge actually does.
// `accounts` is a Twitch id, or two usernames for an account from before
// Twitch ids were recorded (its old row has no id to pair it by).
async function postMerge(accounts: string, dryRun: boolean) {
    const parts = accounts.trim().split(/[\s,]+/);
    const target =
        parts.length === 2
            ? { usernames: parts }
            : { twitchUserId: accounts.trim() };

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
        body: JSON.stringify({ mode: 'merge', ...target, dryRun }),
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
    accounts: string,
): Promise<MergePreviewResponse> {
    return postMerge(accounts, true);
}

export async function mergeUsersAction(
    accounts: string,
): Promise<MergeApplyResponse> {
    return postMerge(accounts, false);
}
