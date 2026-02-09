const BASE_URL = process.env.NEXT_PUBLIC_DATA_URL;

export async function apiFetch<T>(
    path: string,
    options?: RequestInit & { sessionId?: string },
): Promise<T> {
    const { sessionId, ...fetchOptions } = options || {};
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers as Record<string, string>),
    };
    if (sessionId) headers['Authorization'] = `Bearer ${sessionId}`;
    const res = await fetch(`${BASE_URL}${path}`, { ...fetchOptions, headers });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    return json.result;
}
