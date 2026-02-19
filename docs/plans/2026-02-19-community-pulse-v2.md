# Community Pulse v2 — Ticker/Scoreboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Community Pulse as a full-width ticker/scoreboard with animated count-up numbers, 24h delta stats as heroes, and all-time totals in a compact footer.

**Architecture:** Server component fetches current + 24h-ago global stats and computes deltas. Client component renders a full-width scoreboard with IntersectionObserver-triggered count-up animations. Data fetching is cleanly separated from presentation.

**Tech Stack:** Next.js 16 (App Router, `'use cache'`), React 19, SCSS Modules, IntersectionObserver API

---

### Task 1: Add `totalRaces` to GlobalStats interface

**Files:**
- Modify: `src/lib/highlights.ts:8-17`

**Step 1: Add the field**

In `src/lib/highlights.ts`, add `totalRaces` to the `GlobalStats` interface:

```typescript
export interface GlobalStats {
    totalRunTime: number;
    totalAttemptCount: number;
    totalFinishedAttemptCount: number;
    totalRunners: number;
    totalGames: number;
    totalCategories: number;
    totalPbs: number;
    totalPbsWithPrevious: number;
    totalRaces: number;
}
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS (the API already returns this field, we're just adding it to the interface)

**Step 3: Commit**

```bash
git add src/lib/highlights.ts
git commit -m "feat: add totalRaces to GlobalStats interface"
```

---

### Task 2: Update server component with new data shape

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.tsx`

**Step 1: Update the server component**

Rewrite `community-pulse.tsx` to compute the additional 24h deltas (totalAttemptCount) and pass all data to the client:

```typescript
import { Panel } from '~app/(new-layout)/components/panel.component';
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
        attempts:
            globalStats.totalAttemptCount -
            globalStats24hAgo.totalAttemptCount,
        playtimeMs: globalStats.totalRunTime - globalStats24hAgo.totalRunTime,
    };

    return (
        <Panel title="Community Pulse" subtitle="Last 24 Hours" className="p-0">
            <CommunityPulseClient
                last24h={last24h}
                allTime={globalStats}
                liveCount={liveCount}
            />
        </Panel>
    );
};
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: Will fail because client component interface doesn't match yet. That's fine — we fix it in Task 3.

**Step 3: Commit**

```bash
git add "app/(new-layout)/frontpage/sections/community-pulse.tsx"
git commit -m "feat: add attempts delta to community pulse server component"
```

---

### Task 3: Rewrite client component — ticker/scoreboard with count-up animation

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse-client.tsx`

**Step 1: Rewrite the client component**

Replace `community-pulse-client.tsx` entirely with the ticker/scoreboard layout and count-up animation:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobalStats } from '~src/lib/highlights';
import styles from './community-pulse.module.scss';

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function formatHours(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000_000) return `${(hours / 1_000_000).toFixed(1)}M`;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

function useCountUp(target: number, duration = 1400, active = false): number {
    const [value, setValue] = useState(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        if (!active) return;
        const start = performance.now();
        const tick = (now: number) => {
            const elapsed = Math.min((now - start) / duration, 1);
            setValue(Math.round(easeOutExpo(elapsed) * target));
            if (elapsed < 1) {
                frameRef.current = requestAnimationFrame(tick);
            }
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [active, target, duration]);

    return active ? value : 0;
}

interface Last24h {
    pbs: number;
    runs: number;
    attempts: number;
    playtimeMs: number;
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

    const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
        if (entries[0].isIntersecting) setVisible(true);
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(onIntersect, { threshold: 0.2 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [onIntersect]);

    const pbs = useCountUp(last24h.pbs, 1400, visible);
    const runs = useCountUp(last24h.runs, 1400, visible);
    const attempts = useCountUp(last24h.attempts, 1400, visible);
    const hours = useCountUp(
        Math.round(last24h.playtimeMs / 3_600_000),
        1400,
        visible,
    );

    return (
        <div ref={ref} className={styles.content}>
            <div className={styles.ticker}>
                <div className={`${styles.cell} ${styles.hero}`}>
                    <span className={styles.number}>
                        {pbs.toLocaleString()}
                    </span>
                    <span className={styles.label}>Personal Bests</span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalPbs)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {runs.toLocaleString()}
                    </span>
                    <span className={styles.label}>Runs Completed</span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalFinishedAttemptCount)} all
                        time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {attempts.toLocaleString()}
                    </span>
                    <span className={styles.label}>Total Attempts</span>
                    <span className={styles.allTime}>
                        {compact.format(allTime.totalAttemptCount)} all time
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.number}>
                        {hours.toLocaleString()}
                    </span>
                    <span className={styles.label}>Hours Played</span>
                    <span className={styles.allTime}>
                        {formatHours(allTime.totalRunTime)} all time
                    </span>
                </div>
            </div>

            <div className={styles.footer}>
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalRunners)}</strong>{' '}
                    runners
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalGames)}</strong> games
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalCategories)}</strong>{' '}
                    categories
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{compact.format(allTime.totalRaces)}</strong> races
                </span>
                <span className={styles.dot} />
                <span className={styles.footerStat}>
                    <strong>{liveCount}</strong>{' '}
                    <span className={styles.liveDot} /> live
                </span>
            </div>
        </div>
    );
};
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add "app/(new-layout)/frontpage/sections/community-pulse-client.tsx"
git commit -m "feat: rewrite community pulse client as ticker/scoreboard with count-up"
```

---

### Task 4: Restyle SCSS for ticker/scoreboard layout

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.module.scss`

**Step 1: Replace SCSS entirely**

Replace `community-pulse.module.scss` with the scoreboard styling:

```scss
$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
$amber: #f59e0b;

.content {
    padding: 1.5rem 2rem;
}

/* ── Ticker grid ── */

.ticker {
    display: flex;
    align-items: stretch;
}

.cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1.5rem;
    border-left: 1px solid var(--bs-border-color);

    &:first-child {
        border-left: none;
        padding-left: 0;
    }

    &:last-child {
        padding-right: 0;
    }
}

/* ── Numbers ── */

.number {
    font-family: $mono;
    font-size: 2.25rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--bs-body-color);
}

.hero .number {
    color: $amber;
    text-shadow: 0 0 40px rgba($amber, 0.15);
}

.label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--bs-secondary-color);
    margin-top: 0.5rem;
}

.allTime {
    font-size: 0.6rem;
    font-family: $mono;
    color: var(--bs-secondary-color);
    opacity: 0.5;
    margin-top: 0.15rem;
}

/* ── Footer ── */

.footer {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--bs-border-color);
}

.footerStat {
    font-size: 0.7rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;

    strong {
        font-family: $mono;
        font-weight: 700;
        color: var(--bs-body-color);
    }
}

.dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--bs-secondary-color);
    opacity: 0.3;
    flex-shrink: 0;
}

.liveDot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $amber;
    box-shadow: 0 0 6px rgba($amber, 0.5);
    animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
        box-shadow: 0 0 6px rgba($amber, 0.5);
    }

    50% {
        opacity: 0.3;
        box-shadow: 0 0 2px rgba($amber, 0.2);
    }
}

/* ── Responsive ── */

@media (max-width: 768px) {
    .content {
        padding: 1.25rem 1.5rem;
    }

    .ticker {
        flex-wrap: wrap;
    }

    .cell {
        flex: 1 1 45%;
        padding: 0.5rem 1rem;
        min-width: 0;

        &:nth-child(n + 3) {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--bs-border-color);
        }

        &:nth-child(3) {
            border-left: none;
            padding-left: 0;
        }
    }

    .number {
        font-size: 1.75rem;
    }
}

@media (max-width: 480px) {
    .content {
        padding: 1rem;
    }

    .cell {
        flex: 1 1 100%;
        border-left: none;
        padding: 0.75rem 0;
        border-top: 1px solid var(--bs-border-color);

        &:first-child {
            border-top: none;
            padding-top: 0;
        }

        &:nth-child(3) {
            margin-top: 0;
            padding-top: 0.75rem;
        }
    }

    .number {
        font-size: 1.5rem;
    }
}
```

**Step 2: Verify build works**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add "app/(new-layout)/frontpage/sections/community-pulse.module.scss"
git commit -m "feat: restyle community pulse as full-width ticker/scoreboard"
```

---

### Task 5: Update frontpage layout — full-width Community Pulse

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

**Step 1: Move CommunityPulse to its own full-width row**

Update `frontpage.tsx` to give CommunityPulse full width and rearrange remaining panels:

```tsx
import { Suspense } from 'react';
import { Col, Row } from 'react-bootstrap';
import { FrontpageHero } from './components/frontpage-hero';
import { SectionSkeleton } from './components/section-skeleton';
import { CommunityPulse } from './sections/community-pulse';
import { PatreonSection } from './sections/patreon-section';
import { PbFeedSection } from './sections/pb-feed-section';
import { RacesSection } from './sections/races-section';
import { TrendingSection } from './sections/trending-section';
import { YourStatsSection } from './sections/your-stats-section';

export default async function FrontPage() {
    return (
        <div className="d-flex flex-column gap-4">
            <Suspense fallback={<SectionSkeleton height={340} />}>
                <FrontpageHero />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height={180} />}>
                <CommunityPulse />
            </Suspense>
            <Row className="g-4">
                <Col lg={5} xs={12}>
                    <Suspense fallback={<SectionSkeleton height={400} />}>
                        <TrendingSection />
                    </Suspense>
                </Col>
                <Col lg={7} xs={12}>
                    <Suspense fallback={<SectionSkeleton height={400} />}>
                        <PbFeedSection />
                    </Suspense>
                </Col>
            </Row>
            <Row className="g-4">
                <Col lg={7} xs={12}>
                    <Suspense fallback={<SectionSkeleton height={400} />}>
                        <RacesSection />
                    </Suspense>
                </Col>
                <Col lg={5} xs={12}>
                    <Suspense fallback={<SectionSkeleton height={400} />}>
                        <YourStatsSection />
                    </Suspense>
                </Col>
            </Row>
            <Suspense fallback={<SectionSkeleton height={150} />}>
                <PatreonSection />
            </Suspense>
        </div>
    );
}
```

Note: Trending moves to pair with PbFeed (col-5 + col-7). Races pairs with YourStats. Adjust pairings as needed after visual review.

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add "app/(new-layout)/frontpage/frontpage.tsx"
git commit -m "feat: move community pulse to full-width row in frontpage layout"
```

---

### Task 6: Visual verification and cleanup

**Step 1: Clear build cache and start dev server**

Run: `rm -rf .next && npm run dev`

**Step 2: Visual check**

Open `http://localhost:3000` and verify:
- Community Pulse is full-width below the hero
- 4 ticker cells show 24h stats (PBs amber, rest default color)
- Count-up animation fires when panel scrolls into view
- Footer shows runners, games, categories, races, live count
- Responsive: 2-column at tablet, 1-column at mobile
- Live dot pulses amber

**Step 3: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 4: Delete old design plan**

Remove the outdated `docs/plans/2026-02-19-community-pulse-redesign.md` if it exists from a previous iteration.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: cleanup old community pulse design plan"
```
