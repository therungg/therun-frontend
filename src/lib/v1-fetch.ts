const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export class V1FetchError extends Error {
    status: number;
    body?: unknown;
    constructor(status: number, message: string, body?: unknown) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

export async function v1Fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, init);
    if (!res.ok) {
        let message = `${res.status} ${path}`;
        let body: unknown;
        try {
            body = await res.json();
            if ((body as { error?: string })?.error)
                message = (body as { error: string }).error;
        } catch {
            // non-JSON body
        }
        throw new V1FetchError(res.status, message, body);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}
