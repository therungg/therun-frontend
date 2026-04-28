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

export async function apiFetch<T>(
    path: string,
    options?: ApiFetchOptions,
): Promise<T> {
    const { sessionId, body, headers: extraHeaders, ...rest } = options || {};
    const headers: Record<string, string> = {
        ...(extraHeaders as Record<string, string>),
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (sessionId) headers['Authorization'] = `Bearer ${sessionId}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
