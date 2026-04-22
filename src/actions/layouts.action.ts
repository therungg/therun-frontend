'use server';

import type {
    LayoutDeleteResult,
    LayoutDownloadResult,
    LayoutsListResult,
    LayoutUploadResult,
} from 'types/layouts.types';
import { getSession } from '~src/actions/session.action';

const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

function requireBaseUrl():
    | { ok: true; base: string }
    | { ok: false; error: { status: 'fetch-failed' } } {
    if (!BASE_URL) return { ok: false, error: { status: 'fetch-failed' } };
    return { ok: true, base: BASE_URL };
}

async function authedHeaders(): Promise<{
    headers: Record<string, string>;
    sessionUsername: string | undefined;
}> {
    const session = await getSession();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (session.id) headers['Authorization'] = `Bearer ${session.id}`;
    return { headers, sessionUsername: session.username };
}

export async function getLayoutsForUser(
    username: string,
): Promise<LayoutsListResult> {
    const base = requireBaseUrl();
    if (!base.ok) return base.error;

    const { headers, sessionUsername } = await authedHeaders();
    const viewerIsOwner =
        !!sessionUsername &&
        sessionUsername.toLowerCase() === username.toLowerCase();

    const url = viewerIsOwner
        ? `${base.base}/layouts/my`
        : `${base.base}/layouts/user/${encodeURIComponent(username)}`;

    let res: Response;
    try {
        res = await fetch(url, { headers, cache: 'no-store' });
    } catch (err) {
        console.error('[layouts.getLayoutsForUser] fetch threw', {
            url,
            err,
        });
        return { status: 'fetch-failed' };
    }

    if (res.status === 403) return { status: 'unauthenticated' };
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) {
        const bodyText = await res.text().catch(() => '<unreadable>');
        console.error('[layouts.getLayoutsForUser] bad status', {
            url,
            status: res.status,
            bodyText,
        });
        return { status: 'fetch-failed' };
    }

    try {
        const data = await res.json();
        return {
            status: 'ok',
            layouts: data.layouts ?? [],
            tier: typeof data.tier === 'number' ? data.tier : null,
            cap:
                typeof data.cap === 'number'
                    ? data.cap
                    : data.cap === null
                      ? null
                      : null,
            viewerIsOwner,
        };
    } catch (err) {
        console.error('[layouts.getLayoutsForUser] json parse failed', {
            url,
            err,
        });
        return { status: 'fetch-failed' };
    }
}

export async function uploadLayout(
    name: string,
    body: string,
    contentType: string = 'application/xml',
): Promise<LayoutUploadResult> {
    const base = requireBaseUrl();
    if (!base.ok) return base.error;

    const session = await getSession();
    if (!session.id) return { status: 'unauthenticated' };

    const url = `${base.base}/layouts/my/${encodeURIComponent(name)}`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
                Authorization: `Bearer ${session.id}`,
            },
            body,
            cache: 'no-store',
        });
    } catch {
        return { status: 'fetch-failed' };
    }

    if (res.status === 403) {
        try {
            const err = await res.json();
            if (err?.error === 'layout cap reached') {
                return {
                    status: 'cap-reached',
                    cap: typeof err.cap === 'number' ? err.cap : 5,
                };
            }
        } catch {
            // fall through
        }
        return { status: 'unauthenticated' };
    }
    if (res.status === 400) {
        try {
            const err = await res.json();
            if (err?.error === 'invalid name')
                return { status: 'invalid-name' };
            if (err?.error === 'empty body') return { status: 'empty-body' };
            if (err?.error === 'too large') return { status: 'too-large' };
        } catch {
            // fall through
        }
        return { status: 'fetch-failed' };
    }
    if (!res.ok) return { status: 'fetch-failed' };

    try {
        const layout = await res.json();
        return { status: 'ok', layout };
    } catch {
        return { status: 'fetch-failed' };
    }
}

export async function deleteLayout(name: string): Promise<LayoutDeleteResult> {
    const base = requireBaseUrl();
    if (!base.ok) return base.error;

    const session = await getSession();
    if (!session.id) return { status: 'unauthenticated' };

    const url = `${base.base}/layouts/my/${encodeURIComponent(name)}`;

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.id}` },
            cache: 'no-store',
        });
    } catch {
        return { status: 'fetch-failed' };
    }

    if (res.status === 403) return { status: 'unauthenticated' };
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'fetch-failed' };

    return { status: 'ok' };
}

export async function getLayoutDownloadUrl(
    username: string,
    name: string,
): Promise<LayoutDownloadResult> {
    const base = requireBaseUrl();
    if (!base.ok) return base.error;

    const { headers, sessionUsername } = await authedHeaders();
    const viewerIsOwner =
        !!sessionUsername &&
        sessionUsername.toLowerCase() === username.toLowerCase();

    const url = viewerIsOwner
        ? `${base.base}/layouts/my/${encodeURIComponent(name)}`
        : `${base.base}/layouts/user/${encodeURIComponent(
              username,
          )}/${encodeURIComponent(name)}`;

    let res: Response;
    try {
        res = await fetch(url, { headers, cache: 'no-store' });
    } catch {
        return { status: 'fetch-failed' };
    }

    if (res.status === 403) return { status: 'unauthenticated' };
    if (res.status === 404) return { status: 'not-found' };
    if (!res.ok) return { status: 'fetch-failed' };

    try {
        const data = await res.json();
        if (!data?.downloadUrl) return { status: 'fetch-failed' };
        return { status: 'ok', downloadUrl: data.downloadUrl };
    } catch {
        return { status: 'fetch-failed' };
    }
}
