'use client';

import { useSyncExternalStore } from 'react';

const EVENT = 'profile-url';

export interface ProfileUrl {
    hash: string;
    sort: string;
    game: string;
}

function subscribe(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
        window.removeEventListener('hashchange', onChange);
        window.removeEventListener(EVENT, onChange);
    };
}

let cached: ProfileUrl = { hash: '', sort: '', game: '' };
function read(): ProfileUrl {
    const url = new URL(window.location.href);
    const next = {
        hash: url.hash.slice(1),
        sort: url.searchParams.get('sort') ?? '',
        game: url.searchParams.get('game') ?? '',
    };
    if (
        next.hash !== cached.hash ||
        next.sort !== cached.sort ||
        next.game !== cached.game
    ) {
        cached = next;
    }
    return cached;
}
const server: ProfileUrl = { hash: '', sort: '', game: '' };

/** The tab hash, the viewer's sort and the game filter, as the URL has them. */
export function useProfileUrl(): ProfileUrl {
    return useSyncExternalStore(subscribe, read, () => server);
}

/** Writes the given parts; an empty string removes that part. */
export function setProfileUrl(parts: Partial<ProfileUrl>) {
    const url = new URL(window.location.href);
    if (parts.hash !== undefined) url.hash = parts.hash;
    for (const key of ['sort', 'game'] as const) {
        const value = parts[key];
        if (value === undefined) continue;
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new Event(EVENT));
}
