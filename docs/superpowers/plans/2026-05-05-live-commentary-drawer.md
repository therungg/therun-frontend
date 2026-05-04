# Live Commentary Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an openable, closable side drawer to the live page with a stat-sheet aesthetic that gives commentators dense, navigable per-split data, run analytics, the live story feed, and career context for the currently-active run.

**Architecture:** Drawer is mounted at `live.tsx` top level so it can keep resolving its pinned user from the full `liveDataMap` independent of the page's auto-swap. A small React context exposes open/close to the trigger button on `RecommendedStream`'s identity bar. Drawer uses tabs (`Split | Run | Story | Career`) and a split selector (`← / →` keyboard + arrow buttons). Live and story data flow through props/existing hooks; historical data is fetched via the existing `'use server'` lib functions called as server actions from a new `useCommentatorData` hook.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, react-bootstrap, SCSS modules. The project has no JS test runner; verification is via `npm run typecheck`, `npm run lint`, and manual browser smoke tests.

**Spec:** `docs/superpowers/specs/2026-05-05-live-commentary-drawer-design.md`

**Conventions:**
- 4-space indentation, single quotes, trailing commas, semicolons (Biome).
- Path aliases: `~app/*` → `app/*`, `~src/*` → `src/*`.
- Unused params prefixed `_`.
- SCSS module file paired 1:1 with the component file.
- After significant changes: `rm -rf .next` per CLAUDE.md.

---

## File Structure

**Create:**
- `src/components/live/commentary-drawer/commentary-drawer-context.tsx` — React context for `{ open, setOpen, toggle }`.
- `src/components/live/commentary-drawer/use-commentary-drawer-state.ts` — hook owning open / pinned / pinnedUser / selected tab / selected split / followLive.
- `src/components/live/commentary-drawer/derive-snapshot.ts` — pure function projecting `(liveRun, selectedIndex)` to the five snapshot tile values.
- `src/components/live/commentary-drawer/format.ts` — small shared formatters used inside the drawer (delta with sign + color class, percent, ms→time fallback).
- `src/components/live/commentary-drawer/use-commentator-data.ts` — fetches `getAdvancedUserStats` + `getRun` in parallel; caches per `(user, game, category)`.
- `src/components/live/commentary-drawer/split-selector.tsx`
- `src/components/live/commentary-drawer/snapshot-strip.tsx`
- `src/components/live/commentary-drawer/tabs/split-tab.tsx`
- `src/components/live/commentary-drawer/tabs/run-tab.tsx`
- `src/components/live/commentary-drawer/tabs/story-tab.tsx`
- `src/components/live/commentary-drawer/tabs/career-tab.tsx`
- `src/components/live/commentary-drawer/commentary-drawer.tsx` — shell.
- `src/components/live/commentary-drawer/commentary-drawer.module.scss` — drawer chrome and stat-sheet typography.

**Modify:**
- `app/(new-layout)/live/live.tsx` — wrap children in `CommentaryDrawerProvider`, mount `<CommentaryDrawer liveDataMap={updatedLiveDataMap} currentlyViewing={currentlyViewing} />` at the bottom.
- `src/components/live/recommended-stream.tsx` — add "Commentary" trigger button to the identity bar; consumes `CommentaryDrawerContext`.

---

## Task 1: Drawer state hook

**Files:**
- Create: `src/components/live/commentary-drawer/use-commentary-drawer-state.ts`

This hook owns the persistent UI state. Open / pinned / activeTab go through localStorage; selected split + followLive are session-only.

- [ ] **Step 1: Create the hook**

```typescript
'use client';

import { useCallback, useEffect, useState } from 'react';

export type CommentaryTab = 'split' | 'run' | 'story' | 'career';

const TAB_KEY = 'commentary-drawer:tab';
const OPEN_KEY = 'commentary-drawer:open';
const PINNED_KEY = 'commentary-drawer:pinned';

const isTab = (v: unknown): v is CommentaryTab =>
    v === 'split' || v === 'run' || v === 'story' || v === 'career';

const readBool = (key: string, fallback: boolean): boolean => {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
};

const writeBool = (key: string, value: boolean) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value ? '1' : '0');
};

export interface CommentaryDrawerState {
    open: boolean;
    pinned: boolean;
    pinnedUser: string | null;
    activeTab: CommentaryTab;
    selectedSplitIndex: number;
    followLive: boolean;
    setOpen: (open: boolean) => void;
    toggleOpen: () => void;
    setActiveTab: (tab: CommentaryTab) => void;
    setSelectedSplitIndex: (index: number) => void;
    jumpToLive: () => void;
    pinTo: (user: string) => void;
    unpin: () => void;
    resetForNewUser: (currentSplitIndex: number) => void;
}

export const useCommentaryDrawerState = (
    currentSplitIndex: number,
): CommentaryDrawerState => {
    const [open, setOpenState] = useState<boolean>(false);
    const [pinned, setPinned] = useState<boolean>(false);
    const [pinnedUser, setPinnedUser] = useState<string | null>(null);
    const [activeTab, setActiveTabState] = useState<CommentaryTab>('split');
    const [selectedSplitIndex, setSelectedSplitIndexState] =
        useState<number>(currentSplitIndex);
    const [followLive, setFollowLive] = useState<boolean>(true);

    // Hydrate from localStorage once on mount.
    useEffect(() => {
        setOpenState(readBool(OPEN_KEY, false));
        setPinned(readBool(PINNED_KEY, false));
        const rawTab = window.localStorage.getItem(TAB_KEY);
        if (isTab(rawTab)) setActiveTabState(rawTab);
    }, []);

    const setOpen = useCallback((next: boolean) => {
        setOpenState(next);
        writeBool(OPEN_KEY, next);
    }, []);

    const toggleOpen = useCallback(() => {
        setOpenState((prev) => {
            writeBool(OPEN_KEY, !prev);
            return !prev;
        });
    }, []);

    const setActiveTab = useCallback((tab: CommentaryTab) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(TAB_KEY, tab);
        }
    }, []);

    const setSelectedSplitIndex = useCallback((index: number) => {
        setSelectedSplitIndexState(index);
        setFollowLive(false);
    }, []);

    const jumpToLive = useCallback(() => {
        setSelectedSplitIndexState(currentSplitIndex);
        setFollowLive(true);
    }, [currentSplitIndex]);

    const pinTo = useCallback((user: string) => {
        setPinned(true);
        setPinnedUser(user);
        writeBool(PINNED_KEY, true);
    }, []);

    const unpin = useCallback(() => {
        setPinned(false);
        setPinnedUser(null);
        writeBool(PINNED_KEY, false);
    }, []);

    const resetForNewUser = useCallback((nextCurrentSplitIndex: number) => {
        setSelectedSplitIndexState(nextCurrentSplitIndex);
        setFollowLive(true);
    }, []);

    // Auto-follow live split unless user navigated away.
    useEffect(() => {
        if (followLive) {
            setSelectedSplitIndexState(currentSplitIndex);
        }
    }, [currentSplitIndex, followLive]);

    return {
        open,
        pinned,
        pinnedUser,
        activeTab,
        selectedSplitIndex,
        followLive,
        setOpen,
        toggleOpen,
        setActiveTab,
        setSelectedSplitIndex,
        jumpToLive,
        pinTo,
        unpin,
        resetForNewUser,
    };
};
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/use-commentary-drawer-state.ts
git commit -m "feat(live): add commentary drawer state hook"
```

---

## Task 2: Snapshot derivation (pure)

**Files:**
- Create: `src/components/live/commentary-drawer/derive-snapshot.ts`
- Create: `src/components/live/commentary-drawer/format.ts`

A pure function so the snapshot strip is dumb. Takes a `LiveRun` + selected index and returns the five tile values.

- [ ] **Step 1: Create `format.ts`**

```typescript
export const formatDelta = (
    deltaMs: number | null | undefined,
): { text: string; tone: 'ahead' | 'behind' | 'neutral' } => {
    if (deltaMs == null || Number.isNaN(deltaMs)) {
        return { text: '—', tone: 'neutral' };
    }
    const sign = deltaMs < 0 ? '-' : '+';
    const abs = Math.abs(deltaMs);
    const totalSeconds = abs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((totalSeconds * 10) % 10);
    const body = minutes > 0
        ? `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`
        : `${seconds}.${tenths}`;
    const tone = deltaMs < 0 ? 'ahead' : deltaMs > 0 ? 'behind' : 'neutral';
    return { text: `${sign}${body}`, tone };
};

export const formatPercent = (n: number | null | undefined): string => {
    if (n == null || Number.isNaN(n)) return '—';
    return `${Math.round(n * 100)}%`;
};

export const formatTimeMs = (ms: number | null | undefined): string => {
    if (ms == null || Number.isNaN(ms) || ms <= 0) return '—';
    const totalSeconds = ms / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
```

- [ ] **Step 2: Create `derive-snapshot.ts`**

```typescript
import { LiveRun } from '~app/(new-layout)/live/live.types';

export type SnapshotKind = 'past' | 'live' | 'upcoming' | 'finished';

export interface SnapshotData {
    kind: SnapshotKind;
    splitName: string;
    splitIndexLabel: string;
    timeMs: number | null;
    deltaMs: number | null;
    p50Ms: number | null;
    resetRate: number | null;
}

const resetRateAt = (liveRun: LiveRun, index: number): number | null => {
    const split = liveRun.splits?.[index];
    if (!split) return null;
    const started = split.attemptsStarted ?? 0;
    const finished = split.attemptsFinished ?? 0;
    if (started <= 0) return null;
    return Math.max(0, Math.min(1, 1 - finished / started));
};

const deltaAtPast = (liveRun: LiveRun, index: number): number | null => {
    const s = liveRun.splits?.[index];
    if (!s || s.splitTime == null || s.pbSplitTime == null) return null;
    return s.splitTime - s.pbSplitTime;
};

export const deriveSnapshot = (
    liveRun: LiveRun,
    selectedIndex: number,
): SnapshotData => {
    const total = liveRun.splits?.length ?? 0;
    const current = liveRun.currentSplitIndex;
    const p50Ms = liveRun.monteCarloPrediction?.percentiles?.p50 ?? null;

    if (total === 0 || selectedIndex >= total) {
        return {
            kind: 'finished',
            splitName: 'Finish',
            splitIndexLabel: `${total}/${total}`,
            timeMs: null,
            deltaMs: null,
            p50Ms,
            resetRate: null,
        };
    }

    const split = liveRun.splits[selectedIndex];
    const splitName = split?.name ?? '—';
    const splitIndexLabel = `${selectedIndex + 1}/${total}`;
    const resetRate = resetRateAt(liveRun, selectedIndex);

    if (selectedIndex < current) {
        return {
            kind: 'past',
            splitName,
            splitIndexLabel,
            timeMs: split.splitTime ?? null,
            deltaMs: deltaAtPast(liveRun, selectedIndex),
            p50Ms,
            resetRate,
        };
    }

    if (selectedIndex === current) {
        return {
            kind: 'live',
            splitName,
            splitIndexLabel,
            timeMs: liveRun.currentTime ?? null,
            deltaMs: liveRun.delta ?? null,
            p50Ms,
            resetRate,
        };
    }

    return {
        kind: 'upcoming',
        splitName,
        splitIndexLabel,
        timeMs: split.predictedTotalTime ?? null,
        deltaMs:
            split.predictedTotalTime != null && split.pbSplitTime != null
                ? split.predictedTotalTime - split.pbSplitTime
                : null,
        p50Ms,
        resetRate,
    };
};
```

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/live/commentary-drawer/derive-snapshot.ts src/components/live/commentary-drawer/format.ts
git commit -m "feat(live): add commentary drawer snapshot derivation"
```

---

## Task 3: Commentator data hook

**Files:**
- Create: `src/components/live/commentary-drawer/use-commentator-data.ts`

Fans out to `getAdvancedUserStats(user, '0')` and `getRun(user, game, category)` (both `'use server'` lib functions, called as server actions). Refetches when the key tuple changes. Tracks loading + error.

- [ ] **Step 1: Create the hook**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Run } from '~src/common/types';
import { getAdvancedUserStats } from '~src/lib/get-advanced-user-stats';
import { getRun } from '~src/lib/get-run';

export interface CommentatorData {
    advanced: unknown | null;
    run: Run | null;
}

export interface CommentatorDataState {
    data: CommentatorData;
    isLoading: boolean;
    error: string | null;
}

export const useCommentatorData = (
    user: string | null,
    game: string | null,
    category: string | null,
): CommentatorDataState => {
    const [state, setState] = useState<CommentatorDataState>({
        data: { advanced: null, run: null },
        isLoading: false,
        error: null,
    });

    useEffect(() => {
        if (!user || !game || !category) {
            setState({
                data: { advanced: null, run: null },
                isLoading: false,
                error: null,
            });
            return;
        }
        let cancelled = false;
        setState((s) => ({ ...s, isLoading: true, error: null }));

        Promise.allSettled([
            getAdvancedUserStats(user, '0'),
            getRun(user, game, category),
        ])
            .then(([advancedResult, runResult]) => {
                if (cancelled) return;
                const advanced =
                    advancedResult.status === 'fulfilled'
                        ? advancedResult.value
                        : null;
                const run =
                    runResult.status === 'fulfilled' ? runResult.value : null;
                const failed =
                    advancedResult.status === 'rejected' &&
                    runResult.status === 'rejected';
                setState({
                    data: { advanced, run },
                    isLoading: false,
                    error: failed ? 'Career data unavailable.' : null,
                });
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setState({
                    data: { advanced: null, run: null },
                    isLoading: false,
                    error: e instanceof Error ? e.message : 'Career data unavailable.',
                });
            });

        return () => {
            cancelled = true;
        };
    }, [user, game, category]);

    return state;
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/use-commentator-data.ts
git commit -m "feat(live): add commentator-data hook"
```

---

## Task 4: Drawer context + provider

**Files:**
- Create: `src/components/live/commentary-drawer/commentary-drawer-context.tsx`

Tiny context for the trigger button to talk to the drawer without prop-drilling.

- [ ] **Step 1: Create the context**

```typescript
'use client';

import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface CommentaryDrawerContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

const CommentaryDrawerContext =
    createContext<CommentaryDrawerContextValue | null>(null);

export const CommentaryDrawerProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [open, setOpen] = useState(false);

    const value = useMemo<CommentaryDrawerContextValue>(
        () => ({
            open,
            setOpen,
            toggle: () => setOpen((p) => !p),
        }),
        [open],
    );

    return (
        <CommentaryDrawerContext.Provider value={value}>
            {children}
        </CommentaryDrawerContext.Provider>
    );
};

export const useCommentaryDrawerContext = (): CommentaryDrawerContextValue => {
    const ctx = useContext(CommentaryDrawerContext);
    if (!ctx) {
        // Provider missing — return inert no-op so renders don't crash.
        return { open: false, setOpen: () => {}, toggle: () => {} };
    }
    return ctx;
};
```

Note: the local `open` state here mirrors the persistent state owned by `useCommentaryDrawerState`. The drawer shell will sync the two: when the context's `open` flips, the shell calls `useCommentaryDrawerState.setOpen` to persist. We keep the context lightweight so the trigger button never needs to know about persistence.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/commentary-drawer-context.tsx
git commit -m "feat(live): add commentary drawer context provider"
```

---

## Task 5: Stat-sheet styling module

**Files:**
- Create: `src/components/live/commentary-drawer/commentary-drawer.module.scss`

- [ ] **Step 1: Create the SCSS module**

```scss
.backdrop {
    position: fixed;
    inset: 0;
    pointer-events: none; /* non-blocking */
    z-index: 1040;
}

.drawer {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: min(440px, 100vw);
    background: var(--bs-body-bg);
    border-left: 1px solid var(--bs-border-color);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.18);
    z-index: 1050;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 180ms ease;
    pointer-events: auto;
}

.drawerOpen {
    transform: translateX(0);
}

.header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--bs-border-color);
}

.runnerMeta {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
    flex: 1 1 auto;
    min-width: 0;
}

.runnerName {
    font-weight: 600;
    font-size: 0.95rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.runnerGame {
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.headerButton {
    background: transparent;
    border: 1px solid var(--bs-border-color);
    color: inherit;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
}

.headerButton:hover {
    background: var(--bs-tertiary-bg);
}

.selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--bs-border-color);
}

.selectorTitle {
    flex: 1 1 auto;
    text-align: center;
    font-weight: 500;
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.selectorButton {
    background: transparent;
    border: none;
    color: inherit;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
}

.selectorButton:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.selectorButton:not(:disabled):hover {
    background: var(--bs-tertiary-bg);
}

.livePip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: var(--bs-danger);
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 0;
}

.livePipDot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--bs-danger);
    animation: pulse 1.4s infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.4;
    }
}

.snapshot {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--bs-border-color);
}

.snapshotTile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.25rem 0.25rem;
    border-right: 1px solid var(--bs-border-color);
}

.snapshotTile:last-child {
    border-right: none;
}

.snapshotLabel {
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--bs-secondary-color);
}

.snapshotValue {
    font-family: var(--bs-font-monospace);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    font-size: 0.95rem;
}

.toneAhead {
    color: var(--bs-success);
}

.toneBehind {
    color: var(--bs-danger);
}

.toneNeutral {
    color: inherit;
}

.tabs {
    display: flex;
    border-bottom: 1px solid var(--bs-border-color);
}

.tab {
    flex: 1 1 0;
    background: transparent;
    border: none;
    color: inherit;
    padding: 0.55rem 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    border-bottom: 2px solid transparent;
}

.tabActive {
    border-bottom-color: var(--bs-primary);
    font-weight: 600;
}

.tabContent {
    padding: 0.75rem 1rem;
    overflow-y: auto;
    flex: 1 1 auto;
}

.statRow {
    display: flex;
    justify-content: space-between;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--bs-border-color);
    font-size: 0.85rem;
}

.statRow:last-child {
    border-bottom: none;
}

.statLabel {
    color: var(--bs-secondary-color);
}

.statValue {
    font-family: var(--bs-font-monospace);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
}

.sectionTitle {
    margin: 0.25rem 0 0.5rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--bs-secondary-color);
}

.storyEntry {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--bs-border-color);
}

.storyEntryActive {
    background: var(--bs-tertiary-bg);
    border-radius: 0.25rem;
    padding: 0.5rem;
    margin: 0.25rem -0.5rem;
}

.storyHeader {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    margin-bottom: 0.25rem;
}

.rarityBadge {
    font-size: 0.65rem;
    padding: 0.05rem 0.4rem;
    border-radius: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.rarityCommon { background: var(--bs-secondary-bg); color: var(--bs-secondary-color); }
.rarityRare { background: rgba(13, 110, 253, 0.15); color: var(--bs-primary); }
.raritySuper { background: rgba(25, 135, 84, 0.15); color: var(--bs-success); }
.rarityUltra { background: rgba(255, 193, 7, 0.18); color: #c79100; }
.rarityUltimate { background: rgba(220, 53, 69, 0.18); color: var(--bs-danger); }
.raritySecret { background: rgba(111, 66, 193, 0.18); color: #8540f5; }

.empty {
    color: var(--bs-secondary-color);
    font-size: 0.85rem;
    padding: 1rem 0;
    text-align: center;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/live/commentary-drawer/commentary-drawer.module.scss
git commit -m "feat(live): add commentary drawer styles"
```

---

## Task 6: Snapshot strip component

**Files:**
- Create: `src/components/live/commentary-drawer/snapshot-strip.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from './commentary-drawer.module.scss';
import { deriveSnapshot } from './derive-snapshot';
import { formatDelta, formatPercent, formatTimeMs } from './format';

export const SnapshotStrip = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const snap = deriveSnapshot(liveRun, selectedIndex);
    const delta = formatDelta(snap.deltaMs);

    const tile = (label: string, value: string, toneClass?: string) => (
        <div className={styles.snapshotTile} key={label}>
            <span className={styles.snapshotLabel}>{label}</span>
            <span className={clsx(styles.snapshotValue, toneClass)}>
                {value}
            </span>
        </div>
    );

    return (
        <div className={styles.snapshot}>
            {tile('Split', snap.splitIndexLabel)}
            {tile('Time', formatTimeMs(snap.timeMs))}
            {tile(
                'Δ PB',
                delta.text,
                delta.tone === 'ahead'
                    ? styles.toneAhead
                    : delta.tone === 'behind'
                      ? styles.toneBehind
                      : styles.toneNeutral,
            )}
            {tile('p50', formatTimeMs(snap.p50Ms))}
            {tile('Reset %', formatPercent(snap.resetRate))}
        </div>
    );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/snapshot-strip.tsx
git commit -m "feat(live): add snapshot strip component"
```

---

## Task 7: Split selector

**Files:**
- Create: `src/components/live/commentary-drawer/split-selector.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from './commentary-drawer.module.scss';

export const SplitSelector = ({
    liveRun,
    selectedIndex,
    currentSplitIndex,
    followLive,
    onChange,
    onJumpToLive,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
    currentSplitIndex: number;
    followLive: boolean;
    onChange: (index: number) => void;
    onJumpToLive: () => void;
}) => {
    const total = liveRun.splits?.length ?? 0;
    const lastIndex = Math.max(0, total - 1);
    const split = liveRun.splits?.[selectedIndex];
    const title =
        selectedIndex >= total
            ? 'Run finished'
            : split?.name
              ? `Split ${selectedIndex + 1} — ${split.name}`
              : `Split ${selectedIndex + 1}`;

    const canPrev = selectedIndex > 0;
    const canNext = selectedIndex < lastIndex;

    return (
        <div className={styles.selector}>
            <button
                type="button"
                className={styles.selectorButton}
                disabled={!canPrev}
                onClick={() => canPrev && onChange(selectedIndex - 1)}
                aria-label="Previous split"
            >
                <ChevronLeft />
            </button>
            <div className={styles.selectorTitle}>{title}</div>
            <button
                type="button"
                className={styles.selectorButton}
                disabled={!canNext}
                onClick={() => canNext && onChange(selectedIndex + 1)}
                aria-label="Next split"
            >
                <ChevronRight />
            </button>
            {!followLive && selectedIndex !== currentSplitIndex && (
                <button
                    type="button"
                    className={styles.livePip}
                    onClick={onJumpToLive}
                    aria-label="Jump to live split"
                >
                    <span className={styles.livePipDot} />
                    Live
                </button>
            )}
        </div>
    );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/split-selector.tsx
git commit -m "feat(live): add split selector"
```

---

## Task 8: Split tab

**Files:**
- Create: `src/components/live/commentary-drawer/tabs/split-tab.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { LiveRun, Split } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatPercent, formatTimeMs } from '../format';

const Row = ({ label, value }: { label: string; value: string }) => (
    <div className={styles.statRow}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
    </div>
);

const resetRate = (s: Split): number | null => {
    if (!s.attemptsStarted) return null;
    return Math.max(0, Math.min(1, 1 - (s.attemptsFinished ?? 0) / s.attemptsStarted));
};

const timeSavePotential = (s: Split): number | null => {
    const pbSingle = s.pbSplitTime;
    const bestPossible = s.bestPossible;
    if (pbSingle == null || bestPossible == null) return null;
    return pbSingle - bestPossible;
};

export const SplitTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const total = liveRun.splits?.length ?? 0;

    if (total === 0) {
        return <div className={styles.empty}>No split data.</div>;
    }

    if (selectedIndex >= total) {
        return (
            <div className={styles.empty}>
                Run finished — no upcoming split.
            </div>
        );
    }

    const split = liveRun.splits[selectedIndex];
    const current = liveRun.currentSplitIndex;
    const role: 'past' | 'live' | 'upcoming' =
        selectedIndex < current
            ? 'past'
            : selectedIndex === current
              ? 'live'
              : 'upcoming';

    const delta =
        role === 'past' && split.splitTime != null && split.pbSplitTime != null
            ? formatDelta(split.splitTime - split.pbSplitTime)
            : { text: '—', tone: 'neutral' as const };

    const recent = split.recentCompletionsSingle ?? [];

    return (
        <>
            <div className={styles.sectionTitle}>
                {role === 'past' && 'What happened'}
                {role === 'live' && 'Live split'}
                {role === 'upcoming' && 'What to watch for'}
            </div>
            <Row
                label="Single time"
                value={formatTimeMs(
                    role === 'past'
                        ? split.splitTime != null && selectedIndex > 0
                            ? split.splitTime -
                              (liveRun.splits[selectedIndex - 1]?.splitTime ?? 0)
                            : (split.splitTime ?? null)
                        : (split.predictedSingleTime ?? null),
                )}
            />
            <Row
                label="Cumulative"
                value={formatTimeMs(
                    role === 'past'
                        ? (split.splitTime ?? null)
                        : (split.predictedTotalTime ?? null),
                )}
            />
            <Row
                label="PB split"
                value={formatTimeMs(split.pbSplitTime ?? null)}
            />
            <Row label="Average" value={formatTimeMs(split.average ?? null)} />
            <Row
                label="Best possible"
                value={formatTimeMs(split.bestPossible ?? null)}
            />
            <Row
                label="Time save potential"
                value={formatTimeMs(timeSavePotential(split))}
            />
            <Row
                label="Consistency"
                value={
                    split.consistency != null
                        ? split.consistency.toFixed(2)
                        : '—'
                }
            />
            <Row
                label="Attempts"
                value={`${split.attemptsFinished ?? 0} / ${split.attemptsStarted ?? 0}`}
            />
            <Row label="Reset %" value={formatPercent(resetRate(split))} />
            {role === 'past' && (
                <Row label="Δ PB at split" value={delta.text} />
            )}
            {recent.length > 0 && (
                <>
                    <div className={styles.sectionTitle}>Recent completions</div>
                    {recent.slice(-8).map((ms, i) => (
                        <Row
                            key={i}
                            label={`#${recent.length - Math.min(8, recent.length) + i + 1}`}
                            value={formatTimeMs(ms)}
                        />
                    ))}
                </>
            )}
        </>
    );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/tabs/split-tab.tsx
git commit -m "feat(live): add split tab"
```

---

## Task 9: Run tab

**Files:**
- Create: `src/components/live/commentary-drawer/tabs/run-tab.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import clsx from 'clsx';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatDelta, formatTimeMs } from '../format';

const Row = ({
    label,
    value,
    toneClass,
}: {
    label: string;
    value: string;
    toneClass?: string;
}) => (
    <div className={styles.statRow}>
        <span className={styles.statLabel}>{label}</span>
        <span className={clsx(styles.statValue, toneClass)}>{value}</span>
    </div>
);

export const RunTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const mc = liveRun.monteCarloPrediction;
    const projectedDelta =
        mc?.bestEstimate != null && liveRun.pb != null
            ? mc.bestEstimate - liveRun.pb
            : null;
    const projectedTone = formatDelta(projectedDelta);

    return (
        <>
            <div className={styles.sectionTitle}>Projection</div>
            <Row label="PB" value={formatTimeMs(liveRun.pb)} />
            <Row label="SOB" value={formatTimeMs(liveRun.sob)} />
            <Row
                label="Best possible"
                value={formatTimeMs(liveRun.bestPossible)}
            />
            {mc ? (
                <>
                    <Row
                        label="Projected finish"
                        value={formatTimeMs(mc.bestEstimate)}
                    />
                    <Row
                        label="vs PB"
                        value={projectedTone.text}
                        toneClass={
                            projectedTone.tone === 'ahead'
                                ? styles.toneAhead
                                : projectedTone.tone === 'behind'
                                  ? styles.toneBehind
                                  : styles.toneNeutral
                        }
                    />
                    <Row label="p10" value={formatTimeMs(mc.percentiles.p10)} />
                    <Row label="p25" value={formatTimeMs(mc.percentiles.p25)} />
                    <Row label="p50" value={formatTimeMs(mc.percentiles.p50)} />
                    <Row label="p75" value={formatTimeMs(mc.percentiles.p75)} />
                    <Row label="p90" value={formatTimeMs(mc.percentiles.p90)} />
                    <Row
                        label="CI low"
                        value={formatTimeMs(mc.confidenceInterval.lower)}
                    />
                    <Row
                        label="CI high"
                        value={formatTimeMs(mc.confidenceInterval.upper)}
                    />
                </>
            ) : (
                <div className={styles.empty}>No projection yet.</div>
            )}

            <div className={styles.sectionTitle}>Per-split deltas</div>
            {liveRun.splits.slice(0, liveRun.currentSplitIndex).map((s, i) => {
                const d =
                    s.splitTime != null && s.pbSplitTime != null
                        ? s.splitTime - s.pbSplitTime
                        : null;
                const fd = formatDelta(d);
                return (
                    <Row
                        key={i}
                        label={`${i === selectedIndex ? '▶ ' : ''}${s.name}`}
                        value={fd.text}
                        toneClass={
                            fd.tone === 'ahead'
                                ? styles.toneAhead
                                : fd.tone === 'behind'
                                  ? styles.toneBehind
                                  : styles.toneNeutral
                        }
                    />
                );
            })}
        </>
    );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/tabs/run-tab.tsx
git commit -m "feat(live): add run tab"
```

---

## Task 10: Story tab

**Files:**
- Create: `src/components/live/commentary-drawer/tabs/story-tab.tsx`

Wraps the existing `useStory` hook, auto-scrolls to the SplitStory at `selectedIndex`, renders entries with rarity badges + Twitch indicator.

- [ ] **Step 1: Create the component**

```typescript
'use client';

import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { LiveRun } from '~app/(new-layout)/live/live.types';
import { useStory } from '~app/(new-layout)/live/stories/use-story';
import { SplitStory } from '~app/(new-layout)/live/story.types';
import styles from '../commentary-drawer.module.scss';

const rarityClass: Record<string, string> = {
    common: styles.rarityCommon,
    rare: styles.rarityRare,
    super: styles.raritySuper,
    ultra: styles.rarityUltra,
    ultimate: styles.rarityUltimate,
    secret: styles.raritySecret,
};

export const StoryTab = ({
    liveRun,
    selectedIndex,
}: {
    liveRun: LiveRun;
    selectedIndex: number;
}) => {
    const { story, isLoaded } = useStory(liveRun.user);
    const containerRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }
    }, [selectedIndex, story?.stories?.length]);

    if (!isLoaded) return <div className={styles.empty}>Loading story…</div>;
    if (!story)
        return (
            <div className={styles.empty}>
                No story currently available. Stories only get generated when
                you have finished at least 3 runs, and started at least 20.
            </div>
        );

    return (
        <div ref={containerRef}>
            {story.stories.map((entry: SplitStory) => {
                const isActive = entry.splitIndex === selectedIndex;
                const selected = entry.storyElements.filter((e) => e.selected);
                if (selected.length === 0) return null;
                return (
                    <div
                        key={entry['startedAt#index']}
                        ref={isActive ? activeRef : undefined}
                        className={clsx(
                            styles.storyEntry,
                            isActive && styles.storyEntryActive,
                        )}
                    >
                        <div className={styles.storyHeader}>
                            <span>{entry.splitName}</span>
                            <span>#{entry.splitIndex + 1}</span>
                        </div>
                        {selected.map((el) => (
                            <div key={el.id}>
                                <span
                                    className={clsx(
                                        styles.rarityBadge,
                                        rarityClass[el.rarity] ??
                                            styles.rarityCommon,
                                    )}
                                >
                                    {el.rarity}
                                </span>{' '}
                                {el.text}{' '}
                                {el.wasSentToTwitch && (
                                    <TwitchIcon height={14} color="#6441a5" />
                                )}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/tabs/story-tab.tsx
git commit -m "feat(live): add story tab"
```

---

## Task 11: Career tab

**Files:**
- Create: `src/components/live/commentary-drawer/tabs/career-tab.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { LiveRun } from '~app/(new-layout)/live/live.types';
import styles from '../commentary-drawer.module.scss';
import { formatTimeMs } from '../format';
import { useCommentatorData } from '../use-commentator-data';

const Row = ({
    label,
    value,
}: {
    label: string;
    value: string | number | null | undefined;
}) => (
    <div className={styles.statRow}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>
            {value === null || value === undefined || value === '' ? '—' : String(value)}
        </span>
    </div>
);

interface AdvancedShape {
    pronouns?: string;
    country?: string;
    totalPlaytime?: number;
    firstRunDate?: string;
    runsToday?: number;
    resetsToday?: number;
    [k: string]: unknown;
}

interface RunShape {
    pb?: number;
    pbDate?: string;
    sob?: number;
    attemptCount?: number;
    finishedCount?: number;
    [k: string]: unknown;
}

export const CareerTab = ({ liveRun }: { liveRun: LiveRun }) => {
    const { data, isLoading, error } = useCommentatorData(
        liveRun.user,
        liveRun.game,
        liveRun.category,
    );

    if (isLoading) {
        return <div className={styles.empty}>Loading career data…</div>;
    }
    if (error) {
        return <div className={styles.empty}>Career data unavailable.</div>;
    }

    const advanced = (data.advanced ?? {}) as AdvancedShape;
    const run = (data.run ?? {}) as RunShape;

    return (
        <>
            <div className={styles.sectionTitle}>Profile</div>
            <Row label="User" value={liveRun.user} />
            <Row label="Pronouns" value={advanced.pronouns} />
            <Row label="Country" value={advanced.country} />
            <Row
                label="Total playtime"
                value={formatTimeMs(advanced.totalPlaytime)}
            />
            <Row label="First run" value={advanced.firstRunDate} />

            <div className={styles.sectionTitle}>This game/category</div>
            <Row label="PB" value={formatTimeMs(run.pb ?? liveRun.pb)} />
            <Row label="PB date" value={run.pbDate} />
            <Row label="SOB" value={formatTimeMs(run.sob ?? liveRun.sob)} />
            <Row
                label="Attempts"
                value={
                    run.attemptCount != null
                        ? `${run.finishedCount ?? 0} / ${run.attemptCount}`
                        : null
                }
            />

            <div className={styles.sectionTitle}>Today</div>
            <Row label="Runs today" value={advanced.runsToday} />
            <Row label="Resets today" value={advanced.resetsToday} />
        </>
    );
};
```

Note: the `Run` and advanced-stats response shapes vary across the codebase; we read fields permissively via `unknown` and shape interfaces, falling back to `'—'` (via the `Row` component) when missing. This keeps the tab resilient to backend changes without speculative types.

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/tabs/career-tab.tsx
git commit -m "feat(live): add career tab"
```

---

## Task 12: Drawer shell

**Files:**
- Create: `src/components/live/commentary-drawer/commentary-drawer.tsx`

Owns: portal mount, sync between `CommentaryDrawerContext` and persistent `useCommentaryDrawerState`, escape-key, run resolution (pinned vs follow), reset on user change, keyboard arrow-key split nav, render of header / selector / snapshot / tabs / active-tab content.

- [ ] **Step 1: Create the shell**

```typescript
'use client';

import clsx from 'clsx';
import NextImage from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    PinAngle,
    PinAngleFill,
    X as XIcon,
} from 'react-bootstrap-icons';
import { LiveDataMap, LiveRun } from '~app/(new-layout)/live/live.types';
import styles from './commentary-drawer.module.scss';
import { useCommentaryDrawerContext } from './commentary-drawer-context';
import { SnapshotStrip } from './snapshot-strip';
import { SplitSelector } from './split-selector';
import { CareerTab } from './tabs/career-tab';
import { RunTab } from './tabs/run-tab';
import { SplitTab } from './tabs/split-tab';
import { StoryTab } from './tabs/story-tab';
import {
    CommentaryTab,
    useCommentaryDrawerState,
} from './use-commentary-drawer-state';

const TABS: { key: CommentaryTab; label: string }[] = [
    { key: 'split', label: 'Split' },
    { key: 'run', label: 'Run' },
    { key: 'story', label: 'Story' },
    { key: 'career', label: 'Career' },
];

export const CommentaryDrawer = ({
    liveDataMap,
    currentlyViewing,
}: {
    liveDataMap: LiveDataMap;
    currentlyViewing: string;
}) => {
    const ctx = useCommentaryDrawerContext();

    const followingUser = currentlyViewing;
    const followingRun: LiveRun | undefined = liveDataMap[followingUser];
    const followingCurrentSplitIndex = followingRun?.currentSplitIndex ?? 0;

    const state = useCommentaryDrawerState(followingCurrentSplitIndex);

    // Sync persistent open state ↔ context.
    useEffect(() => {
        if (state.open !== ctx.open) ctx.setOpen(state.open);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.open]);
    useEffect(() => {
        if (ctx.open !== state.open) state.setOpen(ctx.open);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.open]);

    // Resolve which run the drawer displays.
    const displayedUser = state.pinned && state.pinnedUser
        ? state.pinnedUser
        : followingUser;
    const liveRun: LiveRun | undefined = liveDataMap[displayedUser];

    // Reset selected split when displayed user changes (only when not pinned;
    // pinned drawer keeps its own navigation since the user isn't switching).
    const [lastDisplayedUser, setLastDisplayedUser] = useState(displayedUser);
    useEffect(() => {
        if (displayedUser !== lastDisplayedUser) {
            setLastDisplayedUser(displayedUser);
            state.resetForNewUser(liveRun?.currentSplitIndex ?? 0);
        }
    }, [displayedUser, lastDisplayedUser, liveRun?.currentSplitIndex, state]);

    const close = useCallback(() => ctx.setOpen(false), [ctx]);

    // Esc and arrow-key handlers — only when drawer is open.
    useEffect(() => {
        if (!state.open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
                return;
            }
            const target = e.target as HTMLElement | null;
            const inField =
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);
            if (inField) return;
            if (!liveRun) return;
            const total = liveRun.splits?.length ?? 0;
            if (e.key === 'ArrowLeft' && state.selectedSplitIndex > 0) {
                state.setSelectedSplitIndex(state.selectedSplitIndex - 1);
            } else if (
                e.key === 'ArrowRight' &&
                state.selectedSplitIndex < Math.max(0, total - 1)
            ) {
                state.setSelectedSplitIndex(state.selectedSplitIndex + 1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [state.open, state.selectedSplitIndex, liveRun, close, state]);

    // Don't render before mount (portal target unavailable on SSR).
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    const togglePin = () => {
        if (state.pinned) {
            state.unpin();
        } else {
            state.pinTo(displayedUser);
        }
    };

    const drawer = (
        <div className={styles.backdrop}>
            <aside
                className={clsx(
                    styles.drawer,
                    state.open && styles.drawerOpen,
                )}
                role="dialog"
                aria-label="Commentary drawer"
            >
                <div className={styles.header}>
                    {liveRun?.picture &&
                        liveRun.picture !== 'noimage' && (
                            <div
                                style={{
                                    position: 'relative',
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                }}
                            >
                                <NextImage
                                    src={liveRun.picture}
                                    alt=""
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>
                        )}
                    <div className={styles.runnerMeta}>
                        <div className={styles.runnerName}>
                            {liveRun?.user ?? displayedUser}
                        </div>
                        <div className={styles.runnerGame}>
                            {liveRun
                                ? `${liveRun.game} · ${liveRun.category}`
                                : 'Run ended'}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.headerButton}
                        onClick={togglePin}
                        aria-label={state.pinned ? 'Unpin' : 'Pin to this run'}
                        title={state.pinned ? 'Unpin' : 'Pin to this run'}
                    >
                        {state.pinned ? <PinAngleFill /> : <PinAngle />}
                    </button>
                    <button
                        type="button"
                        className={styles.headerButton}
                        onClick={close}
                        aria-label="Close commentary"
                    >
                        <XIcon />
                    </button>
                </div>

                {liveRun ? (
                    <>
                        <SplitSelector
                            liveRun={liveRun}
                            selectedIndex={state.selectedSplitIndex}
                            currentSplitIndex={liveRun.currentSplitIndex}
                            followLive={state.followLive}
                            onChange={state.setSelectedSplitIndex}
                            onJumpToLive={state.jumpToLive}
                        />
                        <SnapshotStrip
                            liveRun={liveRun}
                            selectedIndex={state.selectedSplitIndex}
                        />
                        <div className={styles.tabs} role="tablist">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={state.activeTab === t.key}
                                    className={clsx(
                                        styles.tab,
                                        state.activeTab === t.key &&
                                            styles.tabActive,
                                    )}
                                    onClick={() => state.setActiveTab(t.key)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className={styles.tabContent}>
                            {state.activeTab === 'split' && (
                                <SplitTab
                                    liveRun={liveRun}
                                    selectedIndex={state.selectedSplitIndex}
                                />
                            )}
                            {state.activeTab === 'run' && (
                                <RunTab
                                    liveRun={liveRun}
                                    selectedIndex={state.selectedSplitIndex}
                                />
                            )}
                            {state.activeTab === 'story' && (
                                <StoryTab
                                    liveRun={liveRun}
                                    selectedIndex={state.selectedSplitIndex}
                                />
                            )}
                            {state.activeTab === 'career' && (
                                <CareerTab liveRun={liveRun} />
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.tabContent}>
                        <div className={styles.empty}>
                            Run ended.{' '}
                            {state.pinned && (
                                <button
                                    type="button"
                                    className={styles.headerButton}
                                    onClick={state.unpin}
                                >
                                    Unpin
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </aside>
        </div>
    );

    return createPortal(drawer, document.body);
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/commentary-drawer/commentary-drawer.tsx
git commit -m "feat(live): add commentary drawer shell"
```

---

## Task 13: Wire trigger into RecommendedStream

**Files:**
- Modify: `src/components/live/recommended-stream.tsx`

Add a "Commentary" button to the existing identity bar; clicking calls `toggle()` from the context.

- [ ] **Step 1: Add the import + button**

In `src/components/live/recommended-stream.tsx`, add this import alongside the existing imports near the top:

```typescript
import { useCommentaryDrawerContext } from './commentary-drawer/commentary-drawer-context';
import { ChatLeftQuote } from 'react-bootstrap-icons';
```

Inside `RecommendedStream`, near the top of the function body (alongside existing hook calls like `usePatreons`):

```typescript
const commentaryCtx = useCommentaryDrawerContext();
```

Inside the `heroIdentityBar` div, immediately after the existing `OverlayTrigger`/Supporter chip block (i.e. just before `<div className={styles.heroIdentityLeft}>`), add:

```tsx
<button
    type="button"
    onClick={(e) => {
        e.stopPropagation();
        commentaryCtx.toggle();
    }}
    className={styles.heroSupporterChip}
    aria-label="Open commentary view"
    title="Commentary view"
>
    <ChatLeftQuote /> Commentary
</button>
```

(The `heroSupporterChip` class gives us a matching pill style — there's no need for a new class.)

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/live/recommended-stream.tsx
git commit -m "feat(live): add commentary trigger to hero identity bar"
```

---

## Task 14: Mount drawer + provider in live.tsx

**Files:**
- Modify: `app/(new-layout)/live/live.tsx`

Wrap the page contents in `CommentaryDrawerProvider` and mount the drawer once at the bottom. The drawer reads `liveDataMap` and `currentlyViewing` directly so pinning works regardless of swap.

- [ ] **Step 1: Add imports**

At the top of `app/(new-layout)/live/live.tsx`, alongside existing imports:

```typescript
import { CommentaryDrawer } from '~src/components/live/commentary-drawer/commentary-drawer';
import { CommentaryDrawerProvider } from '~src/components/live/commentary-drawer/commentary-drawer-context';
```

- [ ] **Step 2: Wrap the return value**

Replace the outer `return ( <> ... </> )` with a `CommentaryDrawerProvider` wrapper and add the drawer just before the closing tag:

```tsx
return (
    <CommentaryDrawerProvider>
        {showTitle && (
            // ...existing title row...
        )}
        {/* ...existing content unchanged... */}
        <Row xs={1} md={2} lg={2} xl={3} className="g-3">
            {/* ...existing live cards loop... */}
        </Row>
        <CommentaryDrawer
            liveDataMap={updatedLiveDataMap}
            currentlyViewing={currentlyViewing}
        />
    </CommentaryDrawerProvider>
);
```

(Keep every existing child intact — only the wrapper element and the new `<CommentaryDrawer />` are added.)

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Clear build cache and start dev**

Run: `rm -rf .next && npm run dev`
Expected: dev server starts on `http://localhost:3000` (or configured port).

- [ ] **Step 5: Manual smoke test**

In the browser at `/live` or `/live/<an-active-runner>`:

1. Confirm the "Commentary" pill is visible on the hero identity bar.
2. Click it → drawer slides in from the right.
3. Verify `Split` tab shows the current split's stats; tabs switch with no errors.
4. Press `←` / `→` (with focus on the page, not in an input). Selected split moves; snapshot tiles update; "Live" pill appears; clicking it returns to current.
5. Switch to `Story` tab → entries render; the active split entry is highlighted; auto-scrolls.
6. Switch to `Career` tab → "Loading…" then data (or "Career data unavailable" gracefully).
7. Press `Esc` → drawer closes.
8. Reload the page. Drawer's last open/closed state and last tab persist.
9. Click the pin icon. Then click a different live card to swap the page's active runner. Drawer keeps showing the original runner.
10. Click pin again to unpin. Drawer resyncs to the current `currentlyViewing`.
11. While drawer is open, the live page underneath remains clickable (non-blocking backdrop).

- [ ] **Step 6: Commit**

```bash
git add app/\(new-layout\)/live/live.tsx
git commit -m "feat(live): mount commentary drawer on live page"
```

---

## Task 15: Final verification

- [ ] **Step 1: Full typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 2: Production build sanity check**

Run: `rm -rf .next && npm run build`
Expected: build completes without errors. (Warnings about pre-existing files are fine.)

- [ ] **Step 3: Update spec status**

Append a single line to the bottom of `docs/superpowers/specs/2026-05-05-live-commentary-drawer-design.md`:

```markdown
---

**Status:** Implemented 2026-05-05.
```

- [ ] **Step 4: Commit and push**

```bash
git add docs/superpowers/specs/2026-05-05-live-commentary-drawer-design.md
git commit -m "docs(live): mark commentary drawer spec implemented"
git push
```
