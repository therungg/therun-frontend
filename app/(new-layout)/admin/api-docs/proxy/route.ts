import { getSession } from '~src/actions/session.action';

// Scalar's request client (see @scalar/helpers redirectToProxy) rewrites every
// "Test Request" to `${proxyUrl}?scalar_url=<target>`, preserving method,
// headers and body. With a relative proxyUrl this stays same-origin, so the
// browser never hits CORS. This handler forwards the request to the backend,
// injecting the calling admin's session so they test as themselves — the
// bearer token (their session id) is added server-side and never exposed to
// the browser. Locked to admins and to the known backend origin (no open proxy).

const BACKEND_ORIGIN = process.env.NEXT_PUBLIC_DATA_URL
    ? new URL(process.env.NEXT_PUBLIC_DATA_URL).origin
    : undefined;

// Hop-by-hop / identity headers that must not be forwarded upstream. We strip
// the client's Authorization and replace it with the caller's session below.
const STRIP_REQUEST_HEADERS = new Set([
    'host',
    'cookie',
    'authorization',
    'origin',
    'referer',
    'content-length',
    'connection',
    'accept-encoding',
]);

async function forward(request: Request): Promise<Response> {
    const user = await getSession();
    if (!user.roles?.includes('admin')) {
        return new Response('Forbidden', { status: 403 });
    }

    const target = new URL(request.url).searchParams.get('scalar_url');
    if (!target) {
        return new Response('Missing scalar_url', { status: 400 });
    }

    let targetUrl: URL;
    try {
        targetUrl = new URL(target);
    } catch {
        return new Response('Invalid scalar_url', { status: 400 });
    }

    // SSRF guard: only ever forward to the known backend origin.
    if (!BACKEND_ORIGIN || targetUrl.origin !== BACKEND_ORIGIN) {
        return new Response('Target origin not allowed', { status: 403 });
    }

    const headers = new Headers();
    request.headers.forEach((value, key) => {
        if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
            headers.set(key, value);
        }
    });
    headers.set('Authorization', `Bearer ${user.id}`);

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: hasBody ? await request.arrayBuffer() : undefined,
        redirect: 'manual',
    });

    // Pass the upstream response straight back. Same-origin, so no CORS
    // response headers are required.
    const resHeaders = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) resHeaders.set('content-type', contentType);
    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: resHeaders,
    });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
