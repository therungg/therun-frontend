'use client';

import { useSyncExternalStore } from 'react';

const EVENT = 'profile-url';

/** The query keys the profile keeps in the URL, besides the hash. */
const KEYS = [
    'sort',
    'game',
    'show',
    'video',
    'scope',
    'platform',
    'since',
    'archived',
] as const;

type Key = (typeof KEYS)[number];

export type ProfileUrl = { hash: string } & Record<Key, string>;

function subscribe(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
        window.removeEventListener('hashchange', onChange);
        window.removeEventListener(EVENT, onChange);
    };
}

const blank = (): ProfileUrl => ({
    hash: '',
    sort: '',
    game: '',
    show: '',
    video: '',
    scope: '',
    platform: '',
    since: '',
    archived: '',
});

let cached: ProfileUrl = blank();
function read(): ProfileUrl {
    const url = new URL(window.location.href);
    const next = blank();
    next.hash = url.hash.slice(1);
    for (const key of KEYS) next[key] = url.searchParams.get(key) ?? '';
    const changed =
        next.hash !== cached.hash || KEYS.some((k) => next[k] !== cached[k]);
    if (changed) cached = next;
    return cached;
}
const server: ProfileUrl = blank();

/** The hash, the viewer's sort and the runs filters, as the URL has them. */
export function useProfileUrl(): ProfileUrl {
    return useSyncExternalStore(subscribe, read, () => server);
}

/** Writes the given parts; an empty string removes that part. */
export function setProfileUrl(parts: Partial<ProfileUrl>) {
    const url = new URL(window.location.href);
    if (parts.hash !== undefined) url.hash = parts.hash;
    for (const key of KEYS) {
        const value = parts[key];
        if (value === undefined) continue;
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new Event(EVENT));
}
