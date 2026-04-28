const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export class ApiError extends Error {
    status: number;
    errors?: string[];
    constructor(status: number, message: string, errors?: string[]) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
    sessionId?: string;
    body?: unknown;
}

function isBodyInit(value: unknown): value is BodyInit {
    if (typeof value === 'string') return true;
    if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
    if (typeof FormData !== 'undefined' && value instanceof FormData)
        return true;
    if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer)
        return true;
    if (
        typeof URLSearchParams !== 'undefined' &&
        value instanceof URLSearchParams
    )
        return true;
    if (
        typeof ReadableStream !== 'undefined' &&
        value instanceof ReadableStream
    ) {
        return true;
    }
    return false;
}

export async function apiFetch<T>(
    path: string,
    options?: ApiFetchOptions,
): Promise<T> {
    const { sessionId, body, headers: extraHeaders, ...rest } = options || {};
    const headers: Record<string, string> = {
        ...(extraHeaders as Record<string, string>),
    };

    let fetchBody: BodyInit | undefined;
    if (body === undefined) {
        fetchBody = undefined;
    } else if (isBodyInit(body)) {
        fetchBody = body;
    } else {
        fetchBody = JSON.stringify(body);
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
    }

    if (sessionId) headers['Authorization'] = `Bearer ${sessionId}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers,
        body: fetchBody,
    });

    if (!res.ok) {
        let message = `${res.status} ${path}`;
        let errors: string[] | undefined;
        try {
            const j = await res.json();
            if (j?.error) message = j.error;
            if (Array.isArray(j?.errors)) errors = j.errors;
        } catch {
            // non-JSON body — keep default message
        }
        throw new ApiError(res.status, message, errors);
    }

    if (res.status === 204) return undefined as T;
    const json = await res.json();
    return json.result as T;
}
