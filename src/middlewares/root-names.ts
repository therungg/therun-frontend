/**
 * The set of names games answer to at the site root, held in the proxy.
 *
 * Fetched from `GET /games?view=root-names` (about 12k names, ~260 KB) and
 * kept in module scope: the proxy already runs on every page request, so this
 * costs one fetch per instance per refresh window and no extra invocations.
 *
 * Two deliberate behaviours:
 *
 * - **Fail open.** Before the first load lands, and if a refresh throws, root
 *   paths fall through to `/[username]`. A game briefly not answering at the
 *   root is a missing nicety; a user's profile 404ing because the set is
 *   missing is a broken site.
 * - **Stale beats empty.** A failed refresh keeps the previous set and retries
 *   on the next request rather than dropping to nothing.
 */
const REFRESH_MS = 5 * 60 * 1000;
/** Don't hold a page request hostage to this fetch. */
const FETCH_TIMEOUT_MS = 3000;

export interface RootNameSets {
    slugs: ReadonlySet<string>;
    names: ReadonlySet<string>;
}

let sets: RootNameSets | null = null;
let loadedAt = 0;
let inFlight: Promise<void> | null = null;

async function fetchRootNames(): Promise<RootNameSets> {
    const base = process.env.NEXT_PUBLIC_DATA_URL;
    if (!base) throw new Error('NEXT_PUBLIC_DATA_URL is not set');

    const response = await fetch(`${base}/games?view=root-names`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`root-names responded ${response.status}`);
    }

    const body = (await response.json()) as {
        result?: { slugs?: string[]; names?: string[] };
    };

    return {
        slugs: new Set(body.result?.slugs ?? []),
        names: new Set(body.result?.names ?? []),
    };
}

function refresh(): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = fetchRootNames()
        .then((next) => {
            sets = next;
            loadedAt = Date.now();
        })
        .catch((error) => {
            // Keep whatever we had. Logged, not thrown: the caller falls
            // through to the user route either way.
            console.error('root-names refresh failed', error);
        })
        .finally(() => {
            inFlight = null;
        });
    return inFlight;
}

/**
 * The current sets, or null if none has loaded yet. Never blocks: a stale set
 * is served while the refresh runs, and the very first caller gets null.
 */
export function getRootNames(): RootNameSets | null {
    if (!sets || Date.now() - loadedAt > REFRESH_MS) void refresh();
    return sets;
}
