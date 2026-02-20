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

export function useRunRefresh(initialRuns: LiveRun[], featuredIndex: number) {
    const [liveRuns, setLiveRuns] = useState(initialRuns);
    const [staleMap, setStaleMap] = useState<Map<string, StaleReason>>(
        new Map(),
    );

    // Track previous splitIndex per user to detect resets
    const prevSplitIndexRef = useRef<Map<string, number>>(new Map());
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

    // Initialize prevSplitIndex from initial runs
    useEffect(() => {
        for (const run of initialRuns) {
            prevSplitIndexRef.current.set(run.user, run.currentSplitIndex);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            const freshRuns = await fetchTopRuns(5);
            const currentUsers = new Set(
                liveRunsRef.current.map((r) => r.user),
            );

            // Find the best replacement not already displayed
            const replacement = freshRuns.find(
                (r) => !currentUsers.has(r.user),
            );

            if (!replacement) {
                // No replacement available — just clear the stale state
                setStaleMap((prev) => {
                    const next = new Map(prev);
                    next.delete(staleUser);
                    return next;
                });
                return;
            }

            // Swap the stale run for the replacement
            setLiveRuns((prev) =>
                prev.map((r) => (r.user === staleUser ? replacement : r)),
            );

            animateEntry(replacement.user);

            // Update prevSplitIndex tracking
            prevSplitIndexRef.current.delete(staleUser);
            prevSplitIndexRef.current.set(
                replacement.user,
                replacement.currentSplitIndex,
            );

            // Clear stale state
            setStaleMap((prev) => {
                const next = new Map(prev);
                next.delete(staleUser);
                return next;
            });
        },
        [animateEntry],
    );

    const handleWsMessage = useCallback(
        (msg: WebsocketLiveRunMessage) => {
            if (msg.type === 'DELETE') {
                markStale(msg.user, 'offline');
                return;
            }

            if (msg.type === 'UPDATE') {
                const prevIndex = prevSplitIndexRef.current.get(msg.user) ?? 0;
                const newIndex = msg.run.currentSplitIndex;

                // Detect finish: completed all splits
                if (
                    newIndex >= msg.run.splits.length &&
                    prevIndex < msg.run.splits.length
                ) {
                    markStale(msg.user, 'finished');
                }
                // Detect reset: splitIndex drops to 0 from a significant position.
                // Threshold of 2 avoids false positives from early resets (common in speedrunning).
                else if (newIndex === 0 && prevIndex > 2) {
                    markStale(msg.user, 'reset');
                }

                prevSplitIndexRef.current.set(msg.user, newIndex);

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

            prevSplitIndexRef.current.delete(replacedUser);
            prevSplitIndexRef.current.set(
                replacement.user,
                replacement.currentSplitIndex,
            );
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
