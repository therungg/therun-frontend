# Hero Run Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the frontpage hero sidebar runs fresh by detecting stale runs (reset, finished, offline), showing visual indicators during a grace period, then swapping in higher-importance replacements with animation.

**Architecture:** A `useRunRefresh` hook encapsulates all staleness tracking, grace timers, client-side polling, and replacement logic. It wraps the existing `liveRuns` state and exposes stale states for visual treatment. The existing per-user WebSocket subscriptions remain unchanged — staleness is detected from the data they already deliver.

**Tech Stack:** React hooks, CSS modules (SCSS), client-side fetch to `/live?limit=5`

---

### Task 1: Add stale state + swap animation CSS

**Files:**
- Modify: `app/(new-layout)/frontpage/components/hero-content.module.scss`

**Step 1: Add stale card styles**

Add these classes after the existing `.sidebarCardRed` block (around line 391):

```scss
/* Stale run — grace period visual treatment */
.sidebarCardStale {
    opacity: 0.5;
    pointer-events: none;
}

.featuredPanelStale {
    opacity: 0.5;
}

.staleBadge {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    border-radius: 0.3rem;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--bs-secondary-color);
    background: var(--bs-secondary-bg);
    border: 1px solid var(--bs-border-color);
}
```

**Step 2: Add swap animation keyframes and classes**

Add after the stale styles:

```scss
/* Swap animations */
.sidebarCardExit {
    animation: cardSlideOut 300ms ease-in forwards;
}

.sidebarCardEnter {
    animation: cardSlideIn 300ms ease-out forwards;
}

@keyframes cardSlideOut {
    0% {
        opacity: 1;
        transform: translateY(0);
    }
    100% {
        opacity: 0;
        transform: translateY(8px);
    }
}

@keyframes cardSlideIn {
    0% {
        opacity: 0;
        transform: translateY(-8px);
    }
    100% {
        opacity: 1;
        transform: translateY(0);
    }
}
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/components/hero-content.module.scss
git commit -m "style: add stale card and swap animation CSS for hero refresh"
```

---

### Task 2: Create the `useRunRefresh` hook

**Files:**
- Create: `app/(new-layout)/frontpage/components/use-run-refresh.ts`

**Step 1: Create the hook file**

```typescript
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LiveRun,
    WebsocketLiveRunMessage,
} from '~app/(old-layout)/live/live.types';

export type StaleReason = 'reset' | 'finished' | 'offline';

interface StaleEntry {
    reason: StaleReason;
    /** Timestamp (ms) when grace period expires and run should be swapped */
    expiresAt: number;
}

const GRACE_PERIODS: Record<StaleReason, number> = {
    reset: 15_000,
    finished: 60_000,
    offline: 10_000,
};

const BACKUP_POLL_INTERVAL = 120_000; // 2 minutes

const LIVE_URL = `${process.env.NEXT_PUBLIC_DATA_URL}/live`;

async function fetchTopRuns(n = 5): Promise<LiveRun[]> {
    const res = await fetch(`${LIVE_URL}?limit=${n}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.result ?? [];
}

export function useRunRefresh(initialRuns: LiveRun[]) {
    const [liveRuns, setLiveRuns] = useState(initialRuns);
    const [staleMap, setStaleMap] = useState<Map<string, StaleReason>>(
        new Map(),
    );

    // Track previous splitIndex per user to detect resets
    const prevSplitIndexRef = useRef<Map<string, number>>(new Map());
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

    const replaceStaleRun = useCallback(async (staleUser: string) => {
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

        // Track entering state for animation
        setEnteringUsers((prev) => {
            const next = new Set(prev);
            next.add(replacement.user);
            return next;
        });
        setTimeout(() => {
            setEnteringUsers((prev) => {
                const next = new Set(prev);
                next.delete(replacement.user);
                return next;
            });
        }, 300);

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
    }, []);

    const handleWsMessage = useCallback(
        (msg: WebsocketLiveRunMessage) => {
            if (msg.type === 'DELETE') {
                markStale(msg.user, 'offline');
                return;
            }

            if (msg.type === 'UPDATE') {
                const prevIndex =
                    prevSplitIndexRef.current.get(msg.user) ?? 0;
                const newIndex = msg.run.currentSplitIndex;

                // Detect finish: completed all splits
                if (newIndex >= msg.run.splits.length && prevIndex < msg.run.splits.length) {
                    markStale(msg.user, 'finished');
                }
                // Detect reset: splitIndex drops to 0 from a significant position
                else if (newIndex === 0 && prevIndex > 2) {
                    markStale(msg.user, 'reset');
                }

                prevSplitIndexRef.current.set(msg.user, newIndex);

                // Still update the run data so it renders correctly during grace
                setLiveRuns((prev) =>
                    prev.map((r) =>
                        r.user === msg.user ? msg.run : r,
                    ),
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
            // Index 0 is the featured run by default — skip it.
            // Only replace if the new run has higher importance.
            let worstIndex = -1;
            let worstImportance = Infinity;
            for (let i = 1; i < currentRuns.length; i++) {
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
                prev.map((r) =>
                    r.user === replacedUser ? replacement : r,
                ),
            );

            // Entering animation
            setEnteringUsers((prev) => {
                const next = new Set(prev);
                next.add(replacement.user);
                return next;
            });
            setTimeout(() => {
                setEnteringUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(replacement.user);
                    return next;
                });
            }, 300);

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
```

**Step 2: Commit**

```bash
git add app/(new-layout)/frontpage/components/use-run-refresh.ts
git commit -m "feat: add useRunRefresh hook for hero staleness detection and replacement"
```

---

### Task 3: Integrate hook into HeroContent and update card components

**Files:**
- Modify: `app/(new-layout)/frontpage/components/hero-content.tsx`

**Step 1: Replace state management with useRunRefresh**

In `HeroContent`, replace the manual `liveRuns` state with the hook. Change lines 151-183:

```typescript
import { useRunRefresh, type StaleReason } from './use-run-refresh';

// ... (keep existing imports)

export const HeroContent = ({
    liveRuns: initialRuns,
    liveCount,
}: {
    liveRuns: LiveRun[];
    liveCount: number;
}) => {
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const { liveRuns, staleMap, enteringUsers, handleWsMessage } =
        useRunRefresh(initialRuns);

    const handleSelectRun = useCallback((index: number) => {
        setFeaturedIndex(index);
    }, []);

    const featuredRun = liveRuns[featuredIndex];
    const sidebarRuns = liveRuns.filter((_, i) => i !== featuredIndex);

    if (!featuredRun) {
        return <HeroSkeleton />;
    }

    return (
        <HeroLayout
            featuredRun={featuredRun}
            sidebarRuns={sidebarRuns}
            featuredIndex={featuredIndex}
            allRuns={liveRuns}
            liveCount={liveCount}
            staleMap={staleMap}
            enteringUsers={enteringUsers}
            onSelectRun={handleSelectRun}
            onWsMessage={handleWsMessage}
        />
    );
};
```

**Step 2: Update HeroLayout to pass through stale state and use the hook's handleWsMessage**

Replace the `HeroLayout` component. Key changes:
- Remove the local `handleWsMessage` — use the one from the hook (passed as `onWsMessage`)
- Pass `staleMap` and `enteringUsers` to `FeaturedRunPanel` and `LiveSidebar`

```typescript
const HeroLayout = ({
    featuredRun,
    sidebarRuns,
    featuredIndex,
    allRuns,
    liveCount,
    staleMap,
    enteringUsers,
    onSelectRun,
    onWsMessage,
}: {
    featuredRun: LiveRun;
    sidebarRuns: LiveRun[];
    featuredIndex: number;
    allRuns: LiveRun[];
    liveCount: number;
    staleMap: Map<string, StaleReason>;
    enteringUsers: Set<string>;
    onSelectRun: (index: number) => void;
    onWsMessage: (msg: WebsocketLiveRunMessage) => void;
}) => {
    const currentFeatured = allRuns[featuredIndex] ?? featuredRun;
    const featuredStale = staleMap.get(currentFeatured.user);

    return (
        <div className={clsx(styles.hero, 'mb-3')}>
            {allRuns.map((run) => (
                <RunSubscriber
                    key={run.user}
                    user={run.user}
                    onMessage={onWsMessage}
                />
            ))}
            <Row className="g-3">
                <Col xl={5} lg={5} md={12}>
                    <FeaturedRunPanel
                        run={currentFeatured}
                        staleReason={featuredStale}
                    />
                </Col>

                <Col xl={4} lg={4} md={12}>
                    <div
                        className={clsx(styles.panel, styles.streamPanel)}
                        style={{ height: '340px' }}
                    >
                        <div className="ratio ratio-16x9 w-100 h-100">
                            <TwitchPlayer
                                channel={currentFeatured.user}
                                width="100%"
                                height="100%"
                                autoplay={true}
                                muted={true}
                                id="frontpage-twitch-player"
                            />
                        </div>
                    </div>
                </Col>

                <Col xl={3} lg={3} md={12}>
                    <LiveSidebar
                        runs={sidebarRuns}
                        allRuns={allRuns}
                        featuredIndex={featuredIndex}
                        liveCount={liveCount}
                        staleMap={staleMap}
                        enteringUsers={enteringUsers}
                        onSelectRun={onSelectRun}
                    />
                </Col>
            </Row>
        </div>
    );
};
```

**Step 3: Update FeaturedRunPanel to show stale indicator**

Add `staleReason` prop to `FeaturedRunPanel`. When stale, dim the panel and show a badge:

```typescript
const FeaturedRunPanel = ({
    run,
    staleReason,
}: {
    run: LiveRun;
    staleReason?: StaleReason;
}) => {
    // ... existing logic unchanged ...

    return (
        <Link
            href={`/live/${run.user}`}
            className={clsx(
                styles.featuredPanel,
                onPbPace && !staleReason && styles.featuredPanelPbPace,
                !staleReason && flash === 'gold' && styles.featuredPanelGold,
                !staleReason && flash === 'ahead' && styles.featuredPanelGreen,
                !staleReason && flash === 'behind' && styles.featuredPanelRed,
                staleReason && styles.featuredPanelStale,
            )}
            style={{ textDecoration: 'none', color: 'inherit' }}
        >
            {staleReason && (
                <div className={styles.staleBadge}>
                    {staleReason === 'finished'
                        ? 'Finished'
                        : staleReason === 'reset'
                          ? 'Reset'
                          : 'Offline'}
                </div>
            )}
            {/* ... rest unchanged ... */}
        </Link>
    );
};
```

**Step 4: Update LiveSidebar and SidebarCard with stale + entering state**

```typescript
const LiveSidebar = ({
    runs,
    allRuns,
    featuredIndex,
    liveCount,
    staleMap,
    enteringUsers,
    onSelectRun,
}: {
    runs: LiveRun[];
    allRuns: LiveRun[];
    featuredIndex: number;
    liveCount: number;
    staleMap: Map<string, StaleReason>;
    enteringUsers: Set<string>;
    onSelectRun: (index: number) => void;
}) => {
    return (
        <div className={styles.sidebar} style={{ height: '340px' }}>
            {runs.slice(0, 4).map((run) => {
                const globalIndex = allRuns.indexOf(run);
                return (
                    <SidebarCard
                        key={run.user}
                        run={run}
                        isActive={globalIndex === featuredIndex}
                        staleReason={staleMap.get(run.user)}
                        isEntering={enteringUsers.has(run.user)}
                        onSelect={() => onSelectRun(globalIndex)}
                    />
                );
            })}

            <Link href="/live" className={styles.viewAllLink}>
                <span className={styles.viewAllDot} />
                <span>View all {liveCount} live runs</span>
                <span className={styles.viewAllArrow}>&rarr;</span>
            </Link>
        </div>
    );
};

const SidebarCard = ({
    run,
    isActive,
    staleReason,
    isEntering,
    onSelect,
}: {
    run: LiveRun;
    isActive: boolean;
    staleReason?: StaleReason;
    isEntering?: boolean;
    onSelect: () => void;
}) => {
    // ... existing logic ...

    return (
        <button
            type="button"
            className={clsx(
                styles.sidebarCard,
                isActive && styles.sidebarCardActive,
                !staleReason && flash === 'gold' && styles.sidebarCardGold,
                !staleReason && flash === 'ahead' && styles.sidebarCardGreen,
                !staleReason && flash === 'behind' && styles.sidebarCardRed,
                staleReason && styles.sidebarCardStale,
                isEntering && styles.sidebarCardEnter,
            )}
            onClick={onSelect}
        >
            {staleReason && (
                <div className={styles.staleBadge}>
                    {staleReason === 'finished'
                        ? 'Finished'
                        : staleReason === 'reset'
                          ? 'Reset'
                          : 'Offline'}
                </div>
            )}
            {/* ... rest of existing JSX unchanged ... */}
        </button>
    );
};
```

**Step 5: Commit**

```bash
git add app/(new-layout)/frontpage/components/hero-content.tsx
git commit -m "feat: integrate useRunRefresh into hero for live run cycling"
```

---

### Task 4: Verify build and test manually

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors

**Step 3: Run build**

Run: `rm -rf .next && npm run build`
Expected: Build succeeds

**Step 4: Commit any fixes**

If typecheck/lint/build revealed issues, fix and commit.
