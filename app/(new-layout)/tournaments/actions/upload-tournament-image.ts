'use server';

import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';

export async function uploadTournamentImageAction(
    formData: FormData,
): Promise<{ imageUrl: string } | { error: string }> {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };

    const file = formData.get('image');
    const name = formData.get('name');

    if (!(file instanceof File) || file.size === 0) {
        return { error: 'No file provided' };
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
        return { error: 'Tournament name is required' };
    }
    if (file.size > 5 * 1024 * 1024) {
        return { error: 'Image must be 5MB or smaller' };
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        return { error: 'Image must be PNG, JPEG, or WEBP' };
    }

    try {
        const { uploadUrl, imageUrl } = await apiFetch<{
            uploadUrl: string;
            imageUrl: string;
        }>('/v1/tournaments/upload-image', {
            method: 'POST',
            body: {
                name,
                contentType: file.type,
                contentLength: file.size,
            },
            sessionId: session.id,
        });

        const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
        });
        if (!putRes.ok) {
            return { error: `S3 upload failed (${putRes.status})` };
        }

        return { imageUrl };
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        throw e;
    }
}
