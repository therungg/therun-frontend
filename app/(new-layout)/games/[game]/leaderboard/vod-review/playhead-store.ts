import { useSyncExternalStore } from 'react';

export interface PlayheadSnapshot {
    /** The frame the player is parked on (or passing, while it plays). */
    frame: number;
    /** The workbench's frame rate: the host has no patch to read it from
     *  until a marker exists. */
    fps: number;
    ready: boolean;
}

export interface PlayheadStore {
    get: () => PlayheadSnapshot;
    set: (next: PlayheadSnapshot) => void;
    subscribe: (listener: () => void) => () => void;
}

/**
 * The player's position, for a form rendered beside the workbench. The cursor
 * moves four times a second while the video plays; holding it here instead of
 * in the host's state means only the parts that read it re-render, not the
 * whole moderate panel.
 */
export function createPlayheadStore(): PlayheadStore {
    let snapshot: PlayheadSnapshot = { frame: 0, fps: 60, ready: false };
    const listeners = new Set<() => void>();
    return {
        get: () => snapshot,
        set: (next) => {
            if (
                next.frame === snapshot.frame &&
                next.fps === snapshot.fps &&
                next.ready === snapshot.ready
            )
                return;
            snapshot = next;
            for (const l of listeners) l();
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

export function usePlayhead(store: PlayheadStore): PlayheadSnapshot {
    return useSyncExternalStore(store.subscribe, store.get, store.get);
}
