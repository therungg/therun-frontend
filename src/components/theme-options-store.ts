'use client';

import { useSyncExternalStore } from 'react';
import type { ThemePick } from '~src/lib/theme-settings';

export interface ThemeOptions {
    page: { label: string } | null;
    mine: boolean;
    defaultPick: ThemePick;
}

let options: ThemeOptions | null = null;
const listeners = new Set<() => void>();

/** Set by the current theme-capable page; null when no such page is mounted. */
export function publishThemeOptions(o: ThemeOptions | null) {
    options = o;
    for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useThemeOptions(): ThemeOptions | null {
    return useSyncExternalStore(
        subscribe,
        () => options,
        () => null,
    );
}
