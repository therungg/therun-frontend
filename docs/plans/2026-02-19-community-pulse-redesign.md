# Community Pulse Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the community pulse section to show 24h activity paired with all-time totals in a two-tier layout.

**Architecture:** Top tier is a 3-column grid showing 24h deltas (PBs, runs, hours) computed by subtracting `getGlobalStats('24h')` from `getGlobalStats()`. Bottom tier is a compact inline row of all-time-only stats (runners, games, categories, live count). Client component handles count-up animations and intersection observer.

**Tech Stack:** Next.js 16 (App Router, `'use cache'`), React 19, TypeScript, SCSS modules

---

### Task 1: Extract `getLiveCount` to shared module

**Files:**
- Modify: `src/lib/highlights.ts` — add exported `getLiveCount` function
- Modify: `app/(new-layout)/frontpage/components/frontpage-hero.tsx` — import from highlights instead of local

**Step 1: Add `getLiveCount` to highlights.ts**

Add at the end of the data fetching section in `src/lib/highlights.ts`:

```typescript
export async function getLiveCount(): Promise<number> {
    'use cache';
    cacheLife('seconds');
    cacheTag('live-count');

    const res = await fetch('https://api.therun.gg/live/count');
    if (!res.ok) return 0;
    const data = await res.json();
    return data.result ?? data.count ?? 0;
}
```

**Step 2: Update frontpage-hero.tsx to import from highlights**

Remove the local `getLiveCount` function. Replace with:

```typescript
import { getLiveCount } from '~src/lib/highlights';
```

Keep the rest of `FrontpageHero` unchanged.

**Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```
feat: extract getLiveCount to shared highlights module
```

---

### Task 2: Rewrite `community-pulse.tsx` server component

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.tsx`

**Step 1: Replace the server component**

Replace entire file with:

```typescript
import { getGlobalStats, getLiveCount } from '~src/lib/highlights';
import { CommunityPulseClient } from './community-pulse-client';

export const CommunityPulse = async () => {
    const [globalStats, globalStats24hAgo, liveCount] = await Promise.all([
        getGlobalStats(),
        getGlobalStats('24h'),
        getLiveCount(),
    ]);

    const last24h = {
        pbs: globalStats.totalPbs - globalStats24hAgo.totalPbs,
        runs:
            globalStats.totalFinishedAttemptCount -
            globalStats24hAgo.totalFinishedAttemptCount,
        hoursMs: globalStats.totalRunTime - globalStats24hAgo.totalRunTime,
    };

    return (
        <CommunityPulseClient
            last24h={last24h}
            allTime={globalStats}
            liveCount={liveCount}
        />
    );
};
```

This removes all imports of `getTodayStats`, `getPeriodStats`, `getPreviousPeriodStats`.

**Step 2: Verify typecheck fails expectedly**

Run: `npm run typecheck`
Expected: FAIL — `CommunityPulseClient` props don't match yet (that's Task 3)

**Step 3: Commit**

```
feat: rewrite community pulse server component for 24h delta model
```

---

### Task 3: Rewrite `community-pulse-client.tsx`

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse-client.tsx`

**Step 1: Replace the client component**

Replace entire file with:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import type { GlobalStats } from '~src/lib/highlights';
import styles from './community-pulse.module.scss';

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target: number, duration: number, active: boolean): number {
    const [value, setValue] = useState(0);
    const ran = useRef(false);

    useEffect(() => {
        if (!active || ran.current || target === 0) return;
        ran.current = true;

        const t0 = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - t0) / duration, 1);
            setValue(Math.round(easeOutExpo(p) * target));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [active, target, duration]);

    return value;
}

function formatHours(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) return `${(hours / 1_000_000).toFixed(1)}M`;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

interface Last24h {
    pbs: number;
    runs: number;
    hoursMs: number;
}

export const CommunityPulseClient = ({
    last24h,
    allTime,
    liveCount,
}: {
    last24h: Last24h;
    allTime: GlobalStats;
    liveCount: number;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    setVisible(true);
                    obs.disconnect();
                }
            },
            { threshold: 0.15 },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const pbs = useCountUp(last24h.pbs, 1400, visible);
    const runs = useCountUp(last24h.runs, 1600, visible);
    const hours = useCountUp(Math.round(last24h.hoursMs / 3_600_000), 1400, visible);

    return (
        <div
            ref={ref}
            className={`${styles.pulse} ${visible ? styles.visible : ''}`}
        >
            {/* Top tier — The Pulse: 24h activity */}
            <div className={styles.pulseGrid}>
                <div className={`${styles.cell} ${styles.heroCell}`}>
                    <span className={styles.bigNumber}>
                        {pbs.toLocaleString()}
                    </span>
                    <span className={styles.cellLabel}>personal bests</span>
                    <span className={styles.allTimeLabel}>
                        {compact.format(allTime.totalPbs)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.bigNumber}>
                        {runs.toLocaleString()}
                    </span>
                    <span className={styles.cellLabel}>runs completed</span>
                    <span className={styles.allTimeLabel}>
                        {compact.format(allTime.totalFinishedAttemptCount)} all
                        time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.bigNumber}>
                        {hours.toLocaleString()}
                    </span>
                    <span className={styles.cellLabel}>hours played</span>
                    <span className={styles.allTimeLabel}>
                        {formatHours(allTime.totalRunTime)} all time
                    </span>
                </div>
            </div>

            <div className={styles.pulseTag}>
                <span className={styles.pulseDot} />
                last 24 hours
            </div>

            {/* Bottom tier — The Scale: all-time totals */}
            <div className={styles.scale}>
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {compact.format(allTime.totalRunners)}
                    </span>{' '}
                    runners
                </span>
                <span className={styles.dot} />
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {compact.format(allTime.totalGames)}
                    </span>{' '}
                    games
                </span>
                <span className={styles.dot} />
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {compact.format(allTime.totalCategories)}
                    </span>{' '}
                    categories
                </span>
                <span className={styles.dot} />
                <span className={styles.scaleStat}>
                    <span className={styles.scaleValue}>
                        {liveCount}
                    </span>{' '}
                    <span className={styles.liveDot} />
                    live now
                </span>
            </div>
        </div>
    );
};
```

**Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (or FAIL only on missing SCSS classes, which Task 4 fixes)

**Step 3: Commit**

```
feat: rewrite community pulse client with 24h + all-time layout
```

---

### Task 4: Rewrite `community-pulse.module.scss`

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.module.scss`

**Step 1: Replace the stylesheet**

Replace entire file with:

```scss
$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
$amber: #f59e0b;

/* ── Container ── */

.pulse {
    background: var(--bs-body-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: 1rem;
    padding: 2.5rem;
    opacity: 0;
    transform: translateY(12px);
    transition:
        opacity 0.6s ease,
        transform 0.7s ease;
}

.visible {
    opacity: 1;
    transform: translateY(0);
}

/* ── Top Tier — The Pulse ── */

.pulseGrid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
}

.cell {
    display: flex;
    flex-direction: column;
    padding: 0 2rem;
    border-left: 1px solid var(--bs-border-color);
    opacity: 0;
    transform: translateY(8px);
    transition:
        opacity 0.5s ease,
        transform 0.5s ease;

    &:first-child {
        border-left: none;
        padding-left: 0;
    }

    &:last-child {
        padding-right: 0;
    }

    .visible & {
        opacity: 1;
        transform: translateY(0);

        &:nth-child(1) {
            transition-delay: 0.08s;
        }

        &:nth-child(2) {
            transition-delay: 0.2s;
        }

        &:nth-child(3) {
            transition-delay: 0.32s;
        }
    }
}

.bigNumber {
    font-family: $mono;
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--bs-body-color);
}

.heroCell .bigNumber {
    font-size: 3.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: $amber;
    text-shadow: 0 0 50px rgba($amber, 0.12);
}

.cellLabel {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--bs-secondary-color);
    margin-top: 0.65rem;
}

.allTimeLabel {
    font-size: 0.7rem;
    color: var(--bs-secondary-color);
    opacity: 0.6;
    margin-top: 0.25rem;
    font-family: $mono;
}

/* ── "last 24 hours" tag ── */

.pulseTag {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-top: 1.25rem;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--bs-secondary-color);
    opacity: 0;
    transition: opacity 0.5s ease;

    .visible & {
        opacity: 0.5;
        transition-delay: 0.4s;
    }
}

.pulseDot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $amber;
    flex-shrink: 0;
    animation: dotPulse 3s ease-in-out infinite;
}

@keyframes dotPulse {
    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.25;
    }
}

/* ── Bottom Tier — The Scale ── */

.scale {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1.75rem;
    padding-top: 1.75rem;
    border-top: 1px solid var(--bs-border-color);
    opacity: 0;
    transition: opacity 0.5s ease;

    .visible & {
        opacity: 1;
        transition-delay: 0.55s;
    }
}

.scaleStat {
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.3rem;
}

.scaleValue {
    font-weight: 700;
    color: var(--bs-body-color);
    font-family: $mono;
    font-size: 0.8rem;
}

.liveDot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: $amber;
    animation: dotPulse 3s ease-in-out infinite;
}

.dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--bs-secondary-color);
    opacity: 0.35;
    flex-shrink: 0;
}

/* ── Responsive ── */

@media (max-width: 768px) {
    .pulse {
        padding: 2rem 1.5rem 1.5rem;
    }

    .pulseGrid {
        grid-template-columns: 1fr;
        gap: 0;
    }

    .cell {
        border-left: none;
        padding: 1.25rem 0;
        border-bottom: 1px solid var(--bs-border-color);

        &:first-child {
            padding-top: 0;
        }

        &:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
    }

    .heroCell .bigNumber {
        font-size: 3rem;
    }

    .bigNumber {
        font-size: 1.85rem;
    }
}

@media (max-width: 480px) {
    .pulse {
        padding: 1.5rem 1.25rem 1.25rem;
    }

    .heroCell .bigNumber {
        font-size: 2.5rem;
    }

    .bigNumber {
        font-size: 1.6rem;
    }

    .scale {
        gap: 0.5rem;
    }

    .scaleStat {
        font-size: 0.7rem;
    }
}
```

**Step 2: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```
feat: restyle community pulse for two-tier layout
```

---

### Task 5: Clean up unused code

**Files:**
- Modify: `src/lib/highlights.ts` — remove `TodayStats`, `PeriodStats`, `getTodayStats`, `getPeriodStats`, `getPreviousPeriodStats`, `getPeriodStartDate` if no other consumers exist

**Step 1: Verify no other consumers**

Search for imports of these functions/types outside of community-pulse and docs/plans. They should only appear in docs.

**Step 2: Remove unused exports from highlights.ts**

Remove:
- `TodayStats` interface
- `PeriodStats` interface
- `getTodayStats` function
- `getPeriodStats` function
- `getPreviousPeriodStats` function
- `getPeriodStartDate` helper

**Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```
chore: remove unused today/period stats from highlights
```

---

### Task 6: Visual verification

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Check the frontpage**

Verify:
- Top tier shows 3 cells with 24h numbers and all-time totals
- PBs cell has amber accent
- Count-up animations work on scroll
- "last 24 hours" tag with pulsing dot appears below the grid
- Bottom tier shows runners, games, categories, live count
- Mobile layout stacks properly

**Step 3: Commit any fixes**

If tweaks needed, commit with appropriate message.
