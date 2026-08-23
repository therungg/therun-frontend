import { apiFetch } from './api-client';

export async function getUploadKey(username: string, sessionId: string) {
    // NOTE: this endpoint is a GET on the edge-optimized api.therun.gg gateway,
    // and CloudFront strips the Authorization header from GET requests — so the
    // bearer form silently resolves to "Invalid session". We use the legacy
    // path form (`{sessionId}-{username}`) that resolveUserTarget still accepts,
    // which carries the session in the URL and needs no header. Switch back to
    // the bearer form only once this GET forwards Authorization (regional
    // endpoint or a header mapping).
    return apiFetch<string>(
        `/users/uploadKey/${sessionId}-${encodeURIComponent(username)}`,
        {
            cache: 'no-store',
        },
    );
}
