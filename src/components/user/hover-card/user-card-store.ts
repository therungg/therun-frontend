import type { UserCardProfile } from '../../../../types/user-card.types';

/**
 * One request per runner per page session, shared by every link that mentions
 * them. A leaderboard can hold fifty links to the same runner; hovering all
 * fifty must cost one fetch.
 *
 * The map holds the in-flight promise, not the resolved value, so two hovers
 * that overlap in time join the same request instead of racing two.
 */
const cache = new Map<string, Promise<UserCardProfile | null>>();
const resolved = new Map<string, UserCardProfile | null>();

const keyFor = (username: string) => username.trim().toLowerCase();

type Fetcher = (url: string) => Promise<Response>;

/** Injected in tests. Production always uses the global fetch. */
let fetcher: Fetcher = (url) => fetch(url);

export const __setUserCardFetcher = (next: Fetcher) => {
    fetcher = next;
};

export const __resetUserCardCache = () => {
    cache.clear();
    resolved.clear();
};

/** Already resolved and in hand — lets a re-hover paint with no flash. */
export const peekUserCard = (
    username: string,
): UserCardProfile | null | undefined => resolved.get(keyFor(username));

export const loadUserCard = (
    username: string,
): Promise<UserCardProfile | null> => {
    const key = keyFor(username);

    const existing = cache.get(key);
    if (existing) return existing;

    const request = fetcher(`/api/users/${encodeURIComponent(username)}/card`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
            const profile = (body as UserCardProfile | null) ?? null;
            resolved.set(key, profile);
            return profile;
        })
        .catch(() => {
            // A transient failure must not poison the cache for the rest of
            // the session. Drop the entry so the next hover retries.
            cache.delete(key);
            return null;
        });

    cache.set(key, request);

    return request;
};
