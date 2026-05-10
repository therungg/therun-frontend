const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export class V1FetchError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export async function v1Fetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, init);
    if (!res.ok) {
        let message = `${res.status} ${path}`;
        try {
            const j = await res.json();
            if (j?.error) message = j.error;
        } catch {
            // non-JSON body
        }
        throw new V1FetchError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}
