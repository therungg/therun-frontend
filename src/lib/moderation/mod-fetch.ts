const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

/**
 * Error thrown by the moderation fetch helpers. `message` carries the backend's
 * plain-text body verbatim (e.g. "reason is required (min 10 characters)") so it
 * can be surfaced directly in the UI.
 */
export class ModError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.name = 'ModError';
    }
}

export interface ModFetchOptions {
    sessionId?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    /** Query params; undefined/null/'' values are dropped. */
    query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: ModFetchOptions['query']): string {
    // Moderation endpoints are exposed under a `/mod` base-path mapping on the
    // custom domain (api.therun.gg/mod/...). API Gateway strips `/mod`, so the
    // Lambda's api-entry.ts sees the normal `/v1/...` path and dispatches as
    // usual. This applies to every modFetch + meFetch caller. (Same custom-domain
    // multi-segment base-path limitation that put reassignment under its own path.)
    const prefixed = `/mod${path}`;
    if (!query) return `${BASE_URL}${prefixed}`;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === '') continue;
        sp.set(k, String(v));
    }
    const qs = sp.toString();
    return `${BASE_URL}${prefixed}${qs ? `?${qs}` : ''}`;
}

async function rawFetch(
    path: string,
    { sessionId, method, body, query }: ModFetchOptions,
): Promise<Response> {
    const headers: Record<string, string> = {};
    let fetchBody: string | undefined;
    if (body !== undefined) {
        fetchBody = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
    }
    if (sessionId) headers['Authorization'] = `Bearer ${sessionId}`;

    return fetch(buildUrl(path, query), {
        method: method ?? (body !== undefined ? 'POST' : 'GET'),
        headers,
        body: fetchBody,
    });
}

async function handle<T>(res: Response, unwrap: boolean): Promise<T> {
    if (!res.ok) {
        // Mod endpoints return plain-text error bodies; two (429/501) return
        // JSON `{ error }`. Capture either as a clean message.
        let message = `Request failed (${res.status})`;
        const text = await res.text().catch(() => '');
        if (text) {
            try {
                const j = JSON.parse(text);
                message =
                    typeof j?.error === 'string' && j.error ? j.error : text;
            } catch {
                message = text;
            }
        }
        throw new ModError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    const json = JSON.parse(text);
    return (unwrap ? json.result : json) as T;
}

/**
 * For the per-game mod + mass-management endpoints under
 * `/v1/leaderboards/games/{gameId}/…`, which return **bare** JSON.
 */
export async function modFetch<T>(
    path: string,
    opts: ModFetchOptions = {},
): Promise<T> {
    return handle<T>(await rawFetch(path, opts), false);
}

/**
 * For the `/v1/me/*`, `/v1/reports`, `/v1/runs/*` endpoints, which wrap their
 * payload in `{ result: ... }`.
 */
export async function meFetch<T>(
    path: string,
    opts: ModFetchOptions = {},
): Promise<T> {
    return handle<T>(await rawFetch(path, opts), true);
}
