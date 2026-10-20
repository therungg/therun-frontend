const PUBLIC_URL = process.env.NEXT_PUBLIC_DATA_URL;
const API_URL = process.env.API_DIRECT_URL;
const QUERY_RUNS_URL = process.env.QUERY_RUNS_DIRECT_URL;

const QUERY_RUNS_PATH = /^\/v1\/(runs|finished-runs|users)([/?]|$)/;

export function dataUrl(path: string) {
    if (!API_URL || !QUERY_RUNS_URL) return `${PUBLIC_URL}${path}`;
    if (QUERY_RUNS_PATH.test(path)) return `${QUERY_RUNS_URL}${path}`;
    return `${API_URL}${path}`;
}
