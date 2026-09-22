'use client';

import { useSyncExternalStore } from 'react';

/**
 * The top progress bar only ever knew about anchor clicks, so every
 * navigation started in code — the board's category/subcategory pills and the
 * filter controls, all of which push through `router.push` inside a
 * transition — ran for two and a half seconds with nothing at the top of the
 * window to say so.
 *
 * This is the channel those navigations announce themselves on: a
 * module-level count of in-flight pushes that `NavigationProgress`
 * subscribes to. A count rather than a flag because two sources can overlap
 * (a filter apply landing while a pill nav is still resolving) and the bar
 * has to stay up until the last one settles.
 */
let active = 0;
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) listener();
}

/** Raises the bar. Every call must be paired with exactly one `endNavProgress`. */
export function startNavProgress(): void {
    active += 1;
    if (active === 1) emit();
}

/** Drops one in-flight navigation; the bar clears when the last one ends. */
export function endNavProgress(): void {
    if (active === 0) return;
    active -= 1;
    if (active === 0) emit();
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getSnapshot(): boolean {
    return active > 0;
}

// Nothing is ever in flight during a render on the server.
function getServerSnapshot(): boolean {
    return false;
}

/** True while any programmatic navigation is in flight. */
export function useNavProgress(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
