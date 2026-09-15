'use client';

import { useSyncExternalStore } from 'react';
import type { StripTab } from '../../../../../types/runner-profile.types';

/**
 * The picks a runner is choosing but hasn't saved, per tab, so the strip can
 * show them while the picker is open. Null = show what's saved.
 */
const drafts = new Map<StripTab, string[]>();
const listeners = new Set<() => void>();

export function setStripDraft(tab: StripTab, ids: string[] | null) {
    if (ids === null) {
        if (!drafts.has(tab)) return;
        drafts.delete(tab);
    } else {
        drafts.set(tab, ids);
    }
    for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useStripDraft(tab: StripTab): string[] | null {
    return useSyncExternalStore(
        subscribe,
        () => drafts.get(tab) ?? null,
        () => null,
    );
}
