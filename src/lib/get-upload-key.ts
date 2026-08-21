import { apiFetch } from './api-client';

export async function getUploadKey(username: string, sessionId: string) {
    return apiFetch<string>(
        `/users/uploadKey/${encodeURIComponent(username)}`,
        {
            sessionId,
            cache: 'no-store',
        },
    );
}
