'use client';

import { useSyncExternalStore } from 'react';
import type { ThemePick } from '~src/lib/theme-settings';

export interface ThemeOptions {
    page: { label: string } | null;
    mine: boolean;
    /** The pick the page opens with: remembered for this runner or game, else its default. */
    defaultPick: ThemePick;
    /** The runner or game the page belongs to, for remembering a pick. */
    context: string;
}

let options: ThemeOptions | null = null;
const listeners = new Set<() => void>();

/** Set by the current theme-capable page; null when no such page is mounted. */
export function publishThemeOptions(o: ThemeOptions | null) {
    options = o;
    currentPick = o?.defaultPick ?? 'none';
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

// The pick the desktop and mobile ThemeMenu instances both render as
// current. Lives alongside the options it resets with (a page
// mounting/unmounting, or a route change) so a pick made in one instance
// is reflected in the other without either owning its own state.
let currentPick: ThemePick = 'none';
const pickListeners = new Set<() => void>();

export function setCurrentPick(pick: ThemePick) {
    currentPick = pick;
    for (const listener of pickListeners) listener();
}

function subscribePick(listener: () => void) {
    pickListeners.add(listener);
    return () => {
        pickListeners.delete(listener);
    };
}

export function useCurrentPick(): ThemePick {
    return useSyncExternalStore(
        subscribePick,
        () => currentPick,
        () => 'none',
    );
}
