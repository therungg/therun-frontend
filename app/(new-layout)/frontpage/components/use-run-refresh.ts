'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LiveRun,
    WebsocketLiveRunMessage,
} from '~app/(old-layout)/live/live.types';

export type StaleReason = 'reset' | 'finished' | 'offline';

const GRACE_PERIODS: Record<StaleReason, number> = {
    reset: 15_000,
    finished: 60_000,
    offline: 10_000,
};

const BACKUP_POLL_INTERVAL = 120_000; // 2 minutes
const REPLACE_RETRY_INTERVAL = 30_000; // 30 seconds
const ENTER_ANIMATION_MS = 300;

const LIVE_URL = `${process.env.NEXT_PUBLIC_DATA_URL}/live`;

async function fetchTopRuns(n = 5): Promise<LiveRun[]> {
    try {
        const res = await fetch(`${LIVE_URL}?limit=${n}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.result ?? [];
    } catch {
        return [];
    }
}

export function useRunRefresh(
    initialRuns: LiveRun[],
    featuredIndex: number,
    setFeaturedIndex: (index: number) => void,
) {
    const [liveRuns, setLiveRuns] = useState(initialRuns);
    const [staleMap, setStaleMap] = useState<Map<string, StaleReason>>(
        new Map(),
    );

    // Track featured index for backup polling (protect featured run from replacement)
    const featuredIndexRef = useRef(featuredIndex);
    featuredIndexRef.current = featuredIndex;
    // Track grace period timeouts so we can clear them
    const graceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
        new Map(),
    );
    // Track entering animation state
    const [enteringUsers, setEnteringUsers] = useState<Set<string>>(new Set());
    // Ref to latest liveRuns for use in callbacks/timers
    const liveRunsRef = useRef(liveRuns);
    liveRunsRef.current = liveRuns;
    const staleMapRef = useRef(staleMap);
    staleMapRef.current = staleMap;

    const animateEntry = useCallback((user: string) => {
        setEnteringUsers((prev) => {
            const next = new Set(prev);
            next.add(user);
            return next;
        });
        setTimeout(() => {
            setEnteringUsers((prev) => {
                const next = new Set(prev);
                next.delete(user);
                return next;
            });
        }, ENTER_ANIMATION_MS);
    }, []);

    const markStale = useCallback((user: string, reason: StaleReason) => {
        // Don't re-mark if already stale
        if (staleMapRef.current.has(user)) return;

        setStaleMap((prev) => {
            const next = new Map(prev);
            next.set(user, reason);
            return next;
        });

        // Clear any existing timer for this user
        const existing = graceTimersRef.current.get(user);
        if (existing) clearTimeout(existing);

        const timer = setTimeout(() => {
            graceTimersRef.current.delete(user);
            replaceStaleRun(user);
        }, GRACE_PERIODS[reason]);

        graceTimersRef.current.set(user, timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const replaceStaleRun = useCallback(
        async (staleUser: string) => {
            const currentRuns = liveRunsRef.current;
            const staleIndex = currentRuns.findIndex(
                (r) => r.user === staleUser,
            );

            // If the stale run is the featured run, auto-promote the first
            // non-stale sidebar run to featured instead of swapping in-place.
            // This avoids unexpectedly switching the Twitch embed channel.
            if (staleIndex === featuredIndexRef.current) {
                const promotionIndex = currentRuns.findIndex(
                    (r, i) =>
                        i !== staleIndex && !staleMapRef.current.has(r.user),
                );
                if (promotionIndex !== -1) {
                    setFeaturedIndex(promotionIndex);
                }
            }

            const freshRuns = await fetchTopRuns(5);
            const currentUsers = new Set(currentRuns.map((r) => r.user));

            // Find the best replacement: not already displayed, actively running
            const replacement = freshRuns.find(
                (r) =>
                    !currentUsers.has(r.user) &&
                    r.currentSplitIndex >= 0 &&
                    r.currentSplitIndex < r.splits.length,
            );

            if (!replacement) {
                // No replacement available — retry later, keep stale indicator
                const retryTimer = setTimeout(() => {
                    replaceStaleRun(staleUser);
                }, REPLACE_RETRY_INTERVAL);
                graceTimersRef.current.set(staleUser, retryTimer);
                return;
            }

            // Swap the stale run for the replacement
            setLiveRuns((prev) =>
                prev.map((r) => (r.user === staleUser ? replacement : r)),
            );

            animateEntry(replacement.user);

            // Clear stale state
            setStaleMap((prev) => {
                const next = new Map(prev);
                next.delete(staleUser);
                return next;
            });
        },
        [animateEntry, setFeaturedIndex],
    );

    const handleWsMessage = useCallback(
        (msg: WebsocketLiveRunMessage) => {
            if (msg.type === 'DELETE') {
                markStale(msg.user, 'offline');
                return;
            }

            if (msg.type === 'UPDATE') {
                // Detect reset: splitIndex -1 means runner reset
                if (msg.run.currentSplitIndex < 0) {
                    markStale(msg.user, 'reset');
                }
                // Detect finish: splitIndex past last split (e.g., 3 splits → index 3)
                else if (msg.run.currentSplitIndex >= msg.run.splits.length) {
                    markStale(msg.user, 'finished');
                }

                // Still update the run data so it renders correctly during grace
                setLiveRuns((prev) =>
                    prev.map((r) => (r.user === msg.user ? msg.run : r)),
                );
            }
        },
        [markStale],
    );

    // Backup polling — fetch top runs every 2 minutes
    useEffect(() => {
        const interval = setInterval(async () => {
            const freshRuns = await fetchTopRuns(5);
            if (freshRuns.length === 0) return;

            const currentRuns = liveRunsRef.current;
            const currentUsers = new Set(currentRuns.map((r) => r.user));

            // Find runs in fresh list that aren't already displayed
            const newCandidates = freshRuns.filter(
                (r) => !currentUsers.has(r.user),
            );
            if (newCandidates.length === 0) return;

            // Find lowest-importance non-featured sidebar run to potentially replace.
            // Skip the featured run so the user isn't jarred mid-stream.
            let worstIndex = -1;
            let worstImportance = Infinity;
            for (let i = 0; i < currentRuns.length; i++) {
                if (i === featuredIndexRef.current) continue;
                // Don't replace runs already marked stale (they have their own timer)
                if (staleMapRef.current.has(currentRuns[i].user)) continue;
                if (currentRuns[i].importance < worstImportance) {
                    worstImportance = currentRuns[i].importance;
                    worstIndex = i;
                }
            }

            if (
                worstIndex === -1 ||
                newCandidates[0].importance <= worstImportance
            ) {
                return;
            }

            const replacement = newCandidates[0];
            const replacedUser = currentRuns[worstIndex].user;

            setLiveRuns((prev) =>
                prev.map((r) => (r.user === replacedUser ? replacement : r)),
            );

            animateEntry(replacement.user);
        }, BACKUP_POLL_INTERVAL);

        return () => clearInterval(interval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup all grace timers on unmount
    useEffect(() => {
        return () => {
            for (const timer of graceTimersRef.current.values()) {
                clearTimeout(timer);
            }
        };
    }, []);

    return {
        liveRuns,
        staleMap,
        enteringUsers,
        handleWsMessage,
    };
}
