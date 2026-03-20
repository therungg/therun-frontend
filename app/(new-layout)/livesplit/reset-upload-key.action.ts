'use server';

import { getSession } from '~src/actions/session.action';

const dataUrl = process.env.NEXT_PUBLIC_DATA_URL as string;

export async function resetUploadKeyAction(): Promise<{
    uploadKey?: string;
    error?: string;
}> {
    const session = await getSession();

    if (!session.id || !session.username) {
        return { error: 'Not authenticated' };
    }

    const result = await fetch(
        `${dataUrl}/users/${session.username}/reset-upload-key`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.id}`,
                'Content-Type': 'application/json',
            },
        },
    );

    if (!result.ok) {
        const text = await result.text();
        return { error: text || 'Failed to reset key' };
    }

    const data = await result.json();
    const newKey = data.uploadKey ?? data.result?.uploadKey ?? data.result;
    if (!newKey || typeof newKey !== 'string') {
        return { error: 'Unexpected response from server' };
    }
    return { uploadKey: newKey };
}
