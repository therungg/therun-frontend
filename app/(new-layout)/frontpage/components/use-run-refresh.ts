'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LiveRun,
    WebsocketLiveRunMessage,
} from '~app/(old-layout)/live/live.types';
import { getLiveCount } from '~src/lib/highlights';
import { getTopNLiveRuns } from '~src/lib/live-runs';

export type StaleReason = 'reset' | 'finished' | 'offline';

const GRACE_PERIODS: Record<StaleReason, number> = {
    reset: 15_000,
    finished: 60_000,
    offline: 10_000,
};

const BACKUP_POLL_INTERVAL = 120_000; // 2 minutes
const REPLACE_RETRY_INTERVAL = 30_000; // 30 seconds
const ENTER_ANIMATION_MS = 300;
const SWAP_COUNTDOWN_S = 5;

async function fetchTopRuns(n = 7): Promise<LiveRun[]> {
    try {
        return await getTopNLiveRuns(n);
    } catch {
        return [];
    }
}

export function useRunRefresh(
    initialRuns: LiveRun[],
    initialLiveCount: number,
    featuredIndex: number,
    setFeaturedIndex: (index: number) => void,
) {
    const [liveRuns, setLiveRuns] = useState(initialRuns);
    const [liveCount, setLiveCount] = useState(initialLiveCount);
    const [staleMap, setStaleMap] = useState<Map<string, StaleReason>>(
        new Map(),
    );

    // Track featured index for backup polling
    const featuredIndexRef = useRef(featuredIndex);
    featuredIndexRef.current = featuredIndex;
    // Track grace period timeouts so we can clear them
    const graceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
        new Map(),
    );
    // Track entering animation state
    const [enteringUsers, setEnteringUsers] = useState<Set<string>>(new Set());
    // Per-run countdown before swap (user -> seconds remaining)
    const countdownMapRef = useRef<Map<string, number>>(new Map());
    const [countdownDisplay, setCountdownDisplay] = useState<
        Map<string, number>
    >(new Map());
    const countdownTickRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
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

    // Check initial runs for already-stale runs on mount
    useEffect(() => {
        for (const run of initialRuns) {
            if (run.currentSplitIndex < 0) {
                markStale(run.user, 'reset');
            } else if (run.currentSplitIndex >= run.splits.length) {
                markStale(run.user, 'finished');
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Pre-fetched replacements keyed by stale user
    const prefetchedRef = useRef<Map<string, LiveRun | null>>(new Map());

    const replaceStaleRun = useCallback(
        (staleUser: string) => {
            // Already counting down this user
            if (countdownMapRef.current.has(staleUser)) return;

            countdownMapRef.current.set(staleUser, SWAP_COUNTDOWN_S);
            setCountdownDisplay(new Map(countdownMapRef.current));

            // Pre-fetch replacement immediately
            fetchTopRuns(7).then((freshRuns) => {
                const currentUsers = new Set(
                    liveRunsRef.current.map((r) => r.user),
                );
                const replacement =
                    freshRuns.find(
                        (r) =>
                            !currentUsers.has(r.user) &&
                            r.currentSplitIndex >= 0 &&
                            r.currentSplitIndex < r.splits.length,
                    ) ?? null;
                prefetchedRef.current.set(staleUser, replacement);
            });

            // Start master tick if not already running
            if (countdownTickRef.current) return;

            countdownTickRef.current = setInterval(() => {
                const map = countdownMapRef.current;
                const expired: string[] = [];

                for (const [user, remaining] of map) {
                    if (remaining <= 1) {
                        expired.push(user);
                        map.delete(user);
                    } else {
                        map.set(user, remaining - 1);
                    }
                }

                setCountdownDisplay(new Map(map));

                // Stop tick when no countdowns remain
                if (map.size === 0 && countdownTickRef.current) {
                    clearInterval(countdownTickRef.current);
                    countdownTickRef.current = null;
                }

                for (const user of expired) {
                    const runs = liveRunsRef.current;
                    const idx = runs.findIndex((r) => r.user === user);
                    if (idx === -1) continue;

                    // If featured, promote best non-stale sidebar run
                    if (idx === featuredIndexRef.current) {
                        const promotionIndex = runs.findIndex(
                            (r, i) =>
                                i !== idx && !staleMapRef.current.has(r.user),
                        );
                        if (promotionIndex !== -1) {
                            setFeaturedIndex(promotionIndex);
                        }
                    }

                    let replacement = prefetchedRef.current.get(user);
                    prefetchedRef.current.delete(user);

                    // Guard against duplicates: pre-fetch may be stale
                    const currentUsers = new Set(
                        liveRunsRef.current.map((r) => r.user),
                    );
                    if (replacement && currentUsers.has(replacement.user)) {
                        replacement = null;
                    }

                    if (replacement) {
                        const swap = replacement;
                        setLiveRuns((prev) =>
                            prev.map((r) => (r.user === user ? swap : r)),
                        );
                        animateEntry(swap.user);
                        setStaleMap((prev) => {
                            const next = new Map(prev);
                            next.delete(user);
                            return next;
                        });
                    } else {
                        const retryTimer = setTimeout(() => {
                            replaceStaleRun(user);
                        }, REPLACE_RETRY_INTERVAL);
                        graceTimersRef.current.set(user, retryTimer);
                    }
                }
            }, 1000);
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
                // Detect finish: splitIndex past last split (e.g., 3 splits -> index 3)
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

    // Backup polling — swap out sidebar runs that dropped out of the top 7
    useEffect(() => {
        const interval = setInterval(async () => {
            const [freshRuns, freshCount] = await Promise.all([
                fetchTopRuns(7),
                getLiveCount(),
            ]);
            if (freshCount > 0) setLiveCount(freshCount);
            if (freshRuns.length === 0) return;

            const currentRuns = liveRunsRef.current;
            const freshUsers = new Set(freshRuns.map((r) => r.user));
            const currentUsers = new Set(currentRuns.map((r) => r.user));

            // Sidebar runs that dropped out of the top 7
            const droppedIndices: number[] = [];
            for (let i = 0; i < currentRuns.length; i++) {
                if (i === featuredIndexRef.current) continue; // Don't touch featured
                if (!freshUsers.has(currentRuns[i].user)) {
                    droppedIndices.push(i);
                }
            }
            if (droppedIndices.length === 0) return;

            // Most important fresh runs not already displayed, sorted by importance desc
            const candidates = freshRuns
                .filter(
                    (r) =>
                        !currentUsers.has(r.user) &&
                        r.currentSplitIndex >= 0 &&
                        r.currentSplitIndex < r.splits.length,
                )
                .sort((a, b) => b.importance - a.importance);
            if (candidates.length === 0) return;

            // Pair each dropped sidebar run with the next most important candidate
            const replacements = new Map<string, LiveRun>();
            let candidateIdx = 0;

            for (const idx of droppedIndices) {
                if (candidateIdx >= candidates.length) break;
                replacements.set(
                    currentRuns[idx].user,
                    candidates[candidateIdx++],
                );
            }

            if (replacements.size === 0) return;

            // Apply all replacements at once
            setLiveRuns((prev) =>
                prev.map((r) => replacements.get(r.user) ?? r),
            );

            // Animate entries and clean up stale/countdown state
            for (const [replacedUser, replacement] of replacements) {
                animateEntry(replacement.user);

                const timer = graceTimersRef.current.get(replacedUser);
                if (timer) {
                    clearTimeout(timer);
                    graceTimersRef.current.delete(replacedUser);
                }
                countdownMapRef.current.delete(replacedUser);
            }

            setStaleMap((prev) => {
                const next = new Map(prev);
                for (const replacedUser of replacements.keys()) {
                    next.delete(replacedUser);
                }
                return next;
            });
        }, BACKUP_POLL_INTERVAL);

        return () => clearInterval(interval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup all timers on unmount
    useEffect(() => {
        return () => {
            if (countdownTickRef.current) {
                clearInterval(countdownTickRef.current);
            }
            for (const timer of graceTimersRef.current.values()) {
                clearTimeout(timer);
            }
        };
    }, []);

    return {
        liveRuns,
        liveCount,
        staleMap,
        enteringUsers,
        handleWsMessage,
        countdownMap: countdownDisplay,
        markStale,
    };
}
