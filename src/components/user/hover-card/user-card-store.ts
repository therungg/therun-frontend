import type {
    UserCardLive,
    UserCardProfile,
} from '../../../../types/user-card.types';

/**
 * One request per runner per page session, shared by every link that mentions
 * them. A leaderboard can hold fifty links to the same runner; hovering all
 * fifty must cost one fetch.
 *
 * The map holds the in-flight promise, not the resolved value, so two hovers
 * that overlap in time join the same request instead of racing two.
 *
 * Keyed on runner and game: the same runner hovered on a game page carries
 * that game's block, which the plain card does not.
 */
const cache = new Map<string, Promise<UserCardProfile | null>>();
const resolved = new Map<string, UserCardProfile | null>();

const keyFor = (username: string, game?: string) => {
    const user = username.trim().toLowerCase();
    return game ? `${user}\n${game.toLowerCase()}` : user;
};

type Fetcher = (url: string) => Promise<Response>;

/** Injected in tests. Production always uses the global fetch. */
let fetcher: Fetcher = (url) => fetch(url);

export const __setUserCardFetcher = (next: Fetcher) => {
    fetcher = next;
};

export const __resetUserCardCache = () => {
    cache.clear();
    resolved.clear();
    live.clear();
};

/** Already resolved and in hand — lets a re-hover paint with no flash. */
export const peekUserCard = (
    username: string,
    game?: string,
): UserCardProfile | null | undefined => resolved.get(keyFor(username, game));

export const loadUserCard = (
    username: string,
    game?: string,
): Promise<UserCardProfile | null> => {
    const key = keyFor(username, game);

    const existing = cache.get(key);
    if (existing) return existing;

    let url = `/api/users/${encodeURIComponent(username)}/card`;
    if (game) url += `?game=${encodeURIComponent(game)}`;

    const request = fetcher(url)
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

/**
 * Whether the runner is live right now. Same shared-promise idea, but an entry
 * goes stale after LIVE_TTL_MS: a run starts, splits and resets while the page
 * stays open, so a re-hover a minute later must ask again.
 */
const LIVE_TTL_MS = 20_000;

const live = new Map<
    string,
    { at: number; request: Promise<UserCardLive | null> }
>();

export const loadUserLive = (
    username: string,
): Promise<UserCardLive | null> => {
    const key = keyFor(username);
    const now = Date.now();

    const existing = live.get(key);
    if (existing && now - existing.at < LIVE_TTL_MS) return existing.request;

    const request = fetcher(`/api/users/${encodeURIComponent(username)}/live`)
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => (body as UserCardLive | null) ?? null)
        .catch(() => {
            live.delete(key);
            return null;
        });

    live.set(key, { at: now, request });

    return request;
};
