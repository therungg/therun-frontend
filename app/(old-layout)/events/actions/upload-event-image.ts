import { apiFetch } from '~src/lib/api-client';

export const uploadEventImage = async (
    file: File,
    slug: string,
    sessionId: string,
): Promise<string> => {
    const { uploadUrl, imageUrl } = await apiFetch<{
        uploadUrl: string;
        imageUrl: string;
    }>('/events/upload-image', {
        method: 'POST',
        body: JSON.stringify({ slug, contentType: file.type }),
        sessionId,
    });

    await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type,
        },
    });

    return imageUrl;
};
