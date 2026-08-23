'use server';

import { getSession } from '~src/actions/session.action';
import { mapApiError } from '~src/lib/action-result';
import { apiFetch } from '~src/lib/api-client';

export async function resetUploadKeyAction(): Promise<{
    uploadKey?: string;
    error?: string;
}> {
    const session = await getSession();
    if (!session.id || !session.username) return { error: 'Not authenticated' };
    try {
        const data = await apiFetch<{ uploadKey: string }>(
            `/users/${encodeURIComponent(session.username)}/reset-upload-key`,
            { method: 'POST', sessionId: session.id },
        );
        if (!data?.uploadKey)
            return { error: 'Unexpected response from server' };
        return { uploadKey: data.uploadKey };
    } catch (e) {
        const r = mapApiError(e);
        return { error: r.ok ? undefined : r.error };
    }
}
