'use server';

import { getSession } from '~src/actions/session.action';
import { ModError, meFetch } from '~src/lib/moderation/mod-fetch';
import type { DeleteAccountResponse } from '../../types/account.types';

/**
 * Permanently delete the signed-in caller's own account. The account is
 * tombstoned synchronously; the rest of that person's data is erased by a
 * background job afterward. Irreversible — see docs/frontend-guide-account-deletion.md.
 */
export async function deleteAccountAction(
    confirm: string,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.id || !session.username) {
        return { error: 'You must be signed in.' };
    }
    if (confirm.trim().toLowerCase() !== session.username.toLowerCase()) {
        return { error: 'Type your username exactly to confirm.' };
    }
    try {
        await meFetch<DeleteAccountResponse>('/v1/me/delete-account', {
            sessionId: session.id,
            method: 'POST',
            body: { confirm: confirm.trim() },
        });
    } catch (e) {
        if (e instanceof ModError) {
            // Already tombstoned — either by an earlier request or by one
            // that raced this one. The account is gone either way, so finish
            // exactly the way a success does rather than stranding a
            // signed-in shell on an account that no longer exists.
            if (e.status === 403 && e.message === 'account already deleted') {
                return { ok: true };
            }
            // A 500 does not mean nothing happened: the tombstone commits
            // before the steps that can still throw, so the account may well
            // be gone. Never retry automatically — say so and let a refresh
            // settle which it was.
            if (e.status === 500) {
                return {
                    error: "Something went wrong finishing the deletion. Refresh the page - if your account was deleted, you'll be signed out.",
                };
            }
            return { error: e.message };
        }
        return { error: 'Something went wrong. Please try again.' };
    }
    return { ok: true };
}
