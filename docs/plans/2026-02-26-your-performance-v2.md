# Your Performance Panel v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Your Performance sidebar panel for daily engagement — streak-first, highlight carousel, reordered content, and richer data display.

**Architecture:** Rewrite `your-stats-client.tsx` and `your-stats.module.scss` in place. Update TypeScript types to support new API fields (highlights array, streak milestone, race game images). Add backwards-compat handling for the transition period while API is updated. Server component (`your-stats-section.tsx`) gets minor updates for the new response shape.

**Tech Stack:** React 19, Next.js 16 App Router, SCSS Modules, clsx, next/image, react-icons/fa

---

### Task 1: Update TypeScript Types

**Files:**
- Modify: `src/types/dashboard.types.ts`

**Step 1: Add DashboardStreakMilestone interface and update DashboardResponse**

Add the new streak milestone type and update the response to support highlights array. Add `gameImage` to `DashboardRace`.

```typescript
// Add after DashboardHighlight interface (line 63):

export interface DashboardStreakMilestone {
    type: 'near_record' | 'new_record' | 'at_risk';
    daysToRecord?: number;
    message: string;
}
```

Update `DashboardRace` to add optional `gameImage`:
```typescript
export interface DashboardRace {
    game: string;
    category: string;
    gameImage?: string | null;  // ADD THIS
    position: number;
    ratingBefore: number;
    ratingAfter: number;
    date: number;
}
```

Update `DashboardResponse`:
```typescript
export interface DashboardResponse {
    period: DashboardPeriod;
    stats: DashboardStats;
    previousStats: DashboardStats;
    streak: DashboardStreak | null;
    streakMilestone: DashboardStreakMilestone | null;  // ADD
    topGames: DashboardTopGame[];
    allTimeTopGames: DashboardAllTimeGame[];
    recentPbs: DashboardPb[];
    recentRaces: DashboardRace[];
    highlight: DashboardHighlight | null;       // keep for backwards compat
    highlights: DashboardHighlight[];            // ADD — new array field
    globalStats: DashboardGlobalStats | null;
}
```

**Step 2: Verify types compile**

Run: `npm run typecheck`
Expected: Type errors in `your-stats-client.tsx` (it references `highlight` but not `highlights` yet — that's fine, we'll fix it in later tasks)

**Step 3: Commit**

```bash
git add src/types/dashboard.types.ts
git commit -m "feat: add streak milestone and highlights array types for dashboard v2"
```

---

### Task 2: Build StreakBar Component

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx` (add StreakBar function)
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss` (add streak styles)

**Step 1: Add streak bar SCSS**

Add to `your-stats.module.scss`, after the `/* ── Hero Highlight ── */` comment block (before line 14), insert a new section:

```scss
/* ── Streak Bar ── */

.streakBar {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.6rem 0;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--bs-border-color);
}

.streakCurrent {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-family: $mono;
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--bs-emphasis-color);
    white-space: nowrap;
}

.streakIcon {
    color: $amber;
    flex-shrink: 0;
}

.streakIconRecord {
    color: $gold;
}

.streakMeta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.4rem;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    white-space: nowrap;
}

.streakMilestone {
    font-size: 0.68rem;
    font-weight: 700;
    color: $amber;
}

.streakRecord {
    color: $gold;
    font-weight: 700;
}

.streakZero {
    font-size: 0.8rem;
    color: var(--bs-secondary-color);
    padding: 0.4rem 0;
    margin-bottom: 0.75rem;
    border-bottom: 1px solid var(--bs-border-color);
}
```

**Step 2: Add StreakBar component in your-stats-client.tsx**

Add this function after the `ordinal()` function (after line 93):

```tsx
function StreakBar({
    streak,
    streakMilestone,
}: {
    streak: DashboardStreak | null;
    streakMilestone: DashboardStreakMilestone | null;
}) {
    const current = streak?.current ?? 0;
    const periodBest = streak?.periodLongest ?? 0;
    const allTimeBest = streak?.longest ?? 0;
    const isRecord = current > 0 && current >= allTimeBest;

    if (current === 0) {
        return (
            <div className={styles.streakZero}>
                <FaFire size={12} className={styles.streakIcon} /> No active
                streak
            </div>
        );
    }

    return (
        <div className={styles.streakBar}>
            <span className={styles.streakCurrent}>
                <FaFire
                    size={18}
                    className={clsx(
                        styles.streakIcon,
                        isRecord && styles.streakIconRecord,
                    )}
                />
                {current}d
            </span>
            <span className={styles.streakMeta}>
                {isRecord ? (
                    <span className={styles.streakRecord}>New Record!</span>
                ) : streakMilestone &&
                  streakMilestone.type === 'near_record' ? (
                    <span className={styles.streakMilestone}>
                        {streakMilestone.message}
                    </span>
                ) : (
                    <>
                        {periodBest > 0 && (
                            <span>best this period: {periodBest}d</span>
                        )}
                        {allTimeBest > 0 && <span>record: {allTimeBest}d</span>}
                    </>
                )}
            </span>
        </div>
    );
}
```

**Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: Should compile (StreakBar isn't used yet, but should have no syntax errors). May see errors from other parts of the file — that's expected until Task 5.

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "feat: add StreakBar component for dashboard v2"
```

---

### Task 3: Build Highlight Carousel

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx` (replace HighlightCard with HighlightCarousel)
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss` (add carousel styles)

**Step 1: Add carousel SCSS**

Add to the SCSS file, after the existing `.highlightGame` block (after line 143):

```scss
/* ── Highlight Carousel ── */

.highlightCarousel {
    position: relative;
    margin-bottom: 1rem;
}

.highlightSlide {
    transition: opacity 0.4s ease-in-out;
    opacity: 1;
}

.highlightSlideHidden {
    display: none;
    opacity: 0;
}

.carouselDots {
    display: flex;
    justify-content: center;
    gap: 0.35rem;
    margin-top: 0.5rem;
}

.carouselDot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: var(--bs-secondary-color);
    opacity: 0.25;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        opacity: 0.5;
    }
}

.carouselDotActive {
    opacity: 0.7;
    transform: scale(1.3);
}
```

**Step 2: Add HIGHLIGHT_TAGS map and HighlightCarousel component**

Replace the `HIGHLIGHT_ICONS` map (keep it) and add `HIGHLIGHT_TAGS` right after it in `your-stats-client.tsx`:

```tsx
const HIGHLIGHT_TAGS: Record<string, string> = {
    new_pb: 'Personal Best',
    pb_improvement: 'Personal Best',
    pb_spree: 'Personal Best',
    pb_machine: 'Personal Best',
    streak: 'On Fire',
    longest_streak: 'On Fire',
    race_win: 'Race Result',
    race_placement: 'Race Result',
    consistency: 'Dedication',
    grinder: 'Dedication',
    busiest_game: 'Dedication',
    comeback: 'Comeback',
    playtime_surge: 'Comeback',
    completion_rate: 'Efficiency',
    runs_per_pb: 'Efficiency',
    alltime_finish_rate: 'Efficiency',
    total_playtime: 'Milestone',
    alltime_playtime: 'Milestone',
    alltime_runs: 'Milestone',
    alltime_games: 'Milestone',
};

function getHighlightTag(type: string): string {
    return HIGHLIGHT_TAGS[type] ?? 'Highlight';
}
```

**Step 3: Build the HighlightCarousel component**

Add after the existing `HighlightCard` function. We'll need `useEffect` and `useCallback` imports (add to the existing import from 'react'):

Update the react import at line 6 to include `useEffect` and `useCallback`:
```tsx
import { useCallback, useEffect, useState } from 'react';
```

Add the carousel component:

```tsx
function HighlightCarousel({
    highlights,
}: {
    highlights: DashboardHighlight[];
}) {
    const [activeIndex, setActiveIndex] = useState(0);

    const count = highlights.length;

    const advance = useCallback(() => {
        setActiveIndex((i) => (i + 1) % count);
    }, [count]);

    useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(advance, 6000);
        return () => clearInterval(timer);
    }, [count, advance]);

    // Reset index when highlights change (period switch)
    useEffect(() => {
        setActiveIndex(0);
    }, [highlights]);

    return (
        <div className={styles.highlightCarousel}>
            {highlights.map((h, i) => (
                <div
                    key={`${h.type}-${h.game ?? ''}-${i}`}
                    className={clsx(
                        styles.highlightSlide,
                        i !== activeIndex && styles.highlightSlideHidden,
                    )}
                >
                    <HighlightCard highlight={h} />
                </div>
            ))}
            {count > 1 && (
                <div className={styles.carouselDots}>
                    {highlights.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={clsx(
                                styles.carouselDot,
                                i === activeIndex && styles.carouselDotActive,
                            )}
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Show highlight ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
```

**Step 4: Update HighlightCard to use contextual tags**

In the existing `HighlightCard` function, change the tag from "Fun Fact" to use the contextual tag:

Replace:
```tsx
<div className={styles.highlightTag}>Fun Fact</div>
```
With:
```tsx
<div className={styles.highlightTag}>{getHighlightTag(highlight.type)}</div>
```

**Step 5: Remove the margin-bottom from .highlight in SCSS**

Since the carousel wrapper now handles spacing, remove `margin-bottom: 1rem;` from `.highlight` in the SCSS. The carousel's margin-bottom handles it.

**Step 6: Verify it compiles**

Run: `npm run typecheck`

**Step 7: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "feat: add HighlightCarousel with contextual tags"
```

---

### Task 4: Update Stat Ribbon (3 cells, all with deltas)

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx` (update DashboardContent stat ribbon)
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss` (remove `statAllTime` class, update container query)

**Step 1: Remove `.statAllTime` styles from SCSS**

Delete the `.statAllTime` block (lines 249-255 approximately):

```scss
// DELETE:
.statAllTime {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    opacity: 0.5;
    white-space: nowrap;
}
```

Also update the container query `@container (max-width: 320px)` — since we now have 3 cells instead of 4, the 2×2 grid breakpoint can be simpler. Update to only handle 3 cells:

```scss
@container (max-width: 320px) {
    .statRibbon {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .statCell {
        border-left: none;
        padding: 0.4rem 0;

        &:nth-child(even) {
            border-left: 1px solid var(--bs-border-color);
        }

        &:nth-child(n + 3) {
            border-top: 1px solid var(--bs-border-color);
            padding-top: 0.5rem;
        }
    }
}
```

(This is actually the same grid — works for both 3 and 4 cells. Keep it as-is but remove the chip overrides since those move to Task 6.)

**Step 2: This step happens in Task 5 (DashboardContent rewrite)**

The stat ribbon JSX changes are part of the full DashboardContent rewrite in Task 5. No separate change here — the SCSS is ready.

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "refactor: simplify stat ribbon SCSS for 3-cell layout"
```

---

### Task 5: Rewrite DashboardContent with New Content Order

This is the main task — rewiring the entire `DashboardContent` function to use the new hierarchy.

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx`

**Step 1: Update the `DashboardContent` function**

Replace the entire `DashboardContent` function (lines 150-364) with:

```tsx
function DashboardContent({
    dashboard,
    username,
    periodToggle,
}: {
    dashboard: DashboardResponse;
    username: string;
    periodToggle: React.ReactNode;
}) {
    const {
        stats,
        previousStats,
        streak,
        streakMilestone,
        topGames,
        allTimeTopGames,
        recentPbs,
        recentRaces,
        highlights,
        highlight,
        globalStats,
    } = dashboard;
    const topGame = topGames[0] ?? null;

    // Backwards compat: use highlights array if available, fall back to single highlight
    const highlightList: DashboardHighlight[] =
        highlights && highlights.length > 0
            ? highlights
            : highlight
              ? [highlight]
              : [];

    const pbsDelta = formatDelta(stats.totalPbs, previousStats.totalPbs);
    const playtimeDelta = formatDelta(stats.playtime, previousStats.playtime);
    const runsDelta = formatDelta(
        stats.finishedRuns,
        previousStats.finishedRuns,
    );

    const activity: ActivityItem[] = [
        ...recentPbs.map(
            (pb): ActivityItem => ({
                kind: 'pb',
                data: pb,
                sortDate: new Date(pb.endedAt).getTime(),
            }),
        ),
        ...recentRaces.map(
            (race): ActivityItem => ({
                kind: 'race',
                data: race,
                sortDate: race.date,
            }),
        ),
    ]
        .sort((a, b) => b.sortDate - a.sortDate)
        .slice(0, 5);

    return (
        <>
            {/* 1. Streak Bar */}
            <StreakBar
                streak={streak}
                streakMilestone={streakMilestone ?? null}
            />

            {/* 2. Highlight Carousel */}
            {highlightList.length > 0 && (
                <HighlightCarousel highlights={highlightList} />
            )}

            {/* 3. Period Toggle */}
            {periodToggle}

            {/* 4. Core Stats — 3 cells with deltas */}
            <div className={styles.statRibbon}>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        <DurationToFormatted
                            duration={stats.playtime}
                            human
                        />
                    </div>
                    <div className={styles.statLabel}>Playtime</div>
                    <DeltaBadge {...playtimeDelta} />
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>{stats.totalPbs}</div>
                    <div className={styles.statLabel}>PBs</div>
                    <DeltaBadge {...pbsDelta} />
                </div>
                <div className={styles.statCell}>
                    <div className={styles.statValue}>
                        {stats.finishedRuns}
                    </div>
                    <div className={styles.statLabel}>Runs</div>
                    <DeltaBadge {...runsDelta} />
                </div>
            </div>

            {/* 5. Recent Activity */}
            {activity.length > 0 && (
                <>
                    <div className={styles.sectionLabel}>Recent Activity</div>
                    <div className={styles.activityList}>
                        {activity.map((item) =>
                            item.kind === 'pb' ? (
                                <PbActivityItem
                                    key={`pb-${item.data.game}-${item.sortDate}`}
                                    pb={item.data}
                                    username={username}
                                />
                            ) : (
                                <RaceActivityItem
                                    key={`race-${item.data.game}-${item.sortDate}`}
                                    race={item.data}
                                    username={username}
                                />
                            ),
                        )}
                    </div>
                </>
            )}

            {/* 6. Top Game */}
            {topGame && (
                <>
                    <div className={styles.sectionLabel}>Top Game</div>
                    <Link
                        href={`/${username}/${encodeURIComponent(topGame.gameDisplay)}`}
                        className={styles.topGameCard}
                    >
                        {hasValidImage(topGame.gameImage) && (
                            <Image
                                src={topGame.gameImage}
                                alt={topGame.gameDisplay}
                                width={36}
                                height={48}
                                className={styles.topGameImage}
                                unoptimized
                            />
                        )}
                        <div className={styles.topGameInfo}>
                            <div className={styles.topGameName}>
                                {topGame.gameDisplay}
                            </div>
                            <div className={styles.topGameStats}>
                                <DurationToFormatted
                                    duration={topGame.totalPlaytime}
                                    human
                                />
                                {' · '}
                                {topGame.totalAttempts} attempts
                                {' · '}
                                {topGame.totalPbs} PBs
                            </div>
                        </div>
                    </Link>
                </>
            )}

            {/* 7. All-Time Favorites — ranked list */}
            {allTimeTopGames.length > 0 && (
                <>
                    <div className={styles.sectionLabel}>
                        All-Time Favorites
                    </div>
                    <div className={styles.allTimeList}>
                        {allTimeTopGames.slice(0, 3).map((game, i) => (
                            <Link
                                key={game.gameDisplay}
                                href={`/${username}/${encodeURIComponent(game.gameDisplay)}`}
                                className={styles.allTimeRow}
                            >
                                <span className={styles.allTimeRank}>
                                    {i + 1}
                                </span>
                                {hasValidImage(game.gameImage) && (
                                    <Image
                                        src={game.gameImage}
                                        alt={game.gameDisplay}
                                        width={20}
                                        height={27}
                                        className={styles.allTimeImage}
                                        unoptimized
                                    />
                                )}
                                <span className={styles.allTimeName}>
                                    {game.gameDisplay}
                                </span>
                                <span className={styles.allTimeHours}>
                                    <DurationToFormatted
                                        duration={game.totalRunTime}
                                        human
                                    />
                                </span>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {/* 8. Global Stats Footer */}
            {globalStats &&
                (globalStats.totalGames > 0 ||
                    globalStats.totalCategories > 0) && (
                    <div className={styles.globalFooter}>
                        {globalStats.totalGames} games ·{' '}
                        {globalStats.totalCategories} categories ·{' '}
                        {formatCompact(globalStats.totalFinishedAttemptCount)}{' '}
                        runs
                    </div>
                )}
        </>
    );
}
```

**Step 2: Update RaceActivityItem to accept username and render as Link with game image**

Replace the existing `RaceActivityItem` function:

```tsx
function RaceActivityItem({
    race,
    username,
}: {
    race: DashboardRace;
    username: string;
}) {
    const ratingChange = race.ratingAfter - race.ratingBefore;

    const placementColor =
        race.position === 1
            ? 'gold'
            : race.position === 2
              ? 'silver'
              : race.position === 3
                ? 'bronze'
                : 'default';

    return (
        <Link
            href={`/${username}/${encodeURIComponent(race.game)}`}
            className={styles.activityItem}
        >
            {hasValidImage(race.gameImage) ? (
                <Image
                    src={race.gameImage}
                    alt={race.game}
                    width={20}
                    height={27}
                    className={styles.activityImage}
                    unoptimized
                />
            ) : (
                <div className={styles.activityImagePlaceholder} />
            )}
            <div className={styles.activityInfo}>
                <div className={styles.activityGame}>{race.game}</div>
                <div className={styles.activityCategory}>{race.category}</div>
            </div>
            <div className={styles.activityRight}>
                <span
                    className={clsx(
                        styles.placementBadge,
                        styles[
                            `placement${placementColor.charAt(0).toUpperCase() + placementColor.slice(1)}` as keyof typeof styles
                        ],
                    )}
                >
                    {ordinal(race.position)}
                </span>
                {ratingChange !== 0 && (
                    <span
                        className={
                            ratingChange > 0
                                ? styles.ratingUp
                                : styles.ratingDown
                        }
                    >
                        {ratingChange > 0 ? '+' : ''}
                        {ratingChange}
                    </span>
                )}
                <span className={styles.activityTimestamp}>
                    <FromNow time={new Date(race.date)} />
                </span>
            </div>
        </Link>
    );
}
```

**Step 3: Update PbActivityItem image dimensions**

In `PbActivityItem`, change the Image dimensions from `width={15} height={20}` to `width={20} height={27}`.

**Step 4: Update the import for DashboardHighlight**

Update the import from `dashboard.types` to include `DashboardHighlight`:

```tsx
import type {
    DashboardHighlight,
    DashboardPb,
    DashboardPeriod,
    DashboardRace,
    DashboardResponse,
} from '~src/types/dashboard.types';
```

**Step 5: Verify it compiles**

Run: `npm run typecheck`
Expected: Should pass (streakMilestone and highlights may not exist on the API response yet, but the backwards compat handles it)

**Step 6: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx
git commit -m "feat: rewrite DashboardContent with v2 content hierarchy"
```

---

### Task 6: Update SCSS — All-Time List, Section Labels, Global Footer, Activity Image Sizes

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss`

**Step 1: Replace old All-Time chip styles with ranked list styles**

Remove the following blocks:
- `.allTimeLabel` (lines ~316-323)
- `.allTimeChips` (lines ~325-330)
- `.allTimeChip` (lines ~332-351)
- `.allTimeChipImage` (lines ~353-359)
- `.allTimeChipName` (lines ~361-368)
- `.allTimeChipHours` (lines ~370-375)

And the container query overrides for `.allTimeChip` and `.allTimeChipName`.

Replace with:

```scss
/* ── Section Labels ── */

.sectionLabel {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--bs-secondary-color);
    margin-top: 0.75rem;
    margin-bottom: 0.4rem;
}

/* ── All-Time Favorites (ranked list) ── */

.allTimeList {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-bottom: 0.75rem;
}

.allTimeRow {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.4rem;
    border-radius: 0.35rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        background: rgba(var(--bs-primary-rgb), 0.04);
        text-decoration: none;
        color: inherit;
    }
}

.allTimeRank {
    font-family: $mono;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--bs-secondary-color);
    width: 1.2rem;
    text-align: center;
    flex-shrink: 0;
}

.allTimeImage {
    width: 20px;
    height: 27px;
    border-radius: 3px;
    object-fit: cover;
    flex-shrink: 0;
}

.allTimeName {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--bs-body-color);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.allTimeHours {
    font-family: $mono;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
}
```

**Step 2: Add global footer styles**

Add at the end of the file, before the responsive section:

```scss
/* ── Global Stats Footer ── */

.globalFooter {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    text-align: center;
    padding: 0.6rem 0 0.25rem;
    margin-top: 0.5rem;
    border-top: 1px solid var(--bs-border-color);
}
```

**Step 3: Update activity image dimensions in SCSS**

Update `.activityImage` and `.activityImagePlaceholder` from 15×20 to 20×27:

```scss
.activityImage {
    width: 20px;
    height: 27px;
    border-radius: 3px;
    object-fit: cover;
    flex-shrink: 0;
}

.activityImagePlaceholder {
    width: 20px;
    height: 27px;
    border-radius: 3px;
    flex-shrink: 0;
    background: rgba(var(--bs-primary-rgb), 0.1);
}
```

**Step 4: Clean up container query**

Update the `@container (max-width: 320px)` block — remove the old `.allTimeChip` and `.allTimeChipName` overrides since those classes no longer exist.

**Step 5: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "feat: update SCSS for v2 layout — ranked list, section labels, global footer"
```

---

### Task 7: Update Server Component for New API Shape

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-section.tsx`

**Step 1: Update the race data mapping to include gameImage**

In the `raceData` mapping (line 64), the `DashboardRace` type now supports `gameImage`. The summary data doesn't have game images, so we pass `null` for now. This is already the case since we're not setting `gameImage` in the map — TypeScript will flag it as missing since it's now on the type. Add it explicitly:

```tsx
const raceData: DashboardRace[] = (weekSummary?.races ?? []).map((r) => ({
    game: r.game,
    category: r.category,
    gameImage: null,
    position: r.position,
    ratingBefore: r.ratingPrevious,
    ratingAfter: r.ratingNew,
    date: r.date,
}));
```

**Step 2: Handle potentially missing `highlights` and `streakMilestone` on API response**

The API might not have these fields yet. The client component already handles backwards compat, but we should ensure the dashboards object doesn't strip them. No changes needed — `getUserDashboard` returns the raw API response which will include whatever fields the API sends.

**Step 3: Verify it compiles**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-section.tsx
git commit -m "fix: add gameImage to race data mapping for v2 types"
```

---

### Task 8: Clean Up — Remove Dead Code, Final Polish

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx`
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss`

**Step 1: Remove `formatCompact` if unused elsewhere**

Check if `formatCompact` is still used. In the new DashboardContent, we still use it in the global footer: `formatCompact(globalStats.totalFinishedAttemptCount)`. Keep it.

**Step 2: Remove unused `.statAllTime` class from SCSS if not already done in Task 4**

Verify it's gone.

**Step 3: Remove `.deltaNeutral` opacity**

The current `.deltaNeutral` has `opacity: 0.5`. Since the delta is now a dash character, the opacity makes it nearly invisible. Remove the opacity line:

```scss
.deltaNeutral {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
}
```

**Step 4: Run full verification**

Run: `npm run typecheck && npm run lint`
Expected: Both pass.

**Step 5: Run dev server and visually verify**

Run: `npm run dev`
Open the frontpage in a browser. Log in. Verify:
- Streak bar appears at top of panel
- Highlight card shows contextual tag (not "Fun Fact") — will show single highlight with old API
- Period toggle works
- 3 stat cells with delta badges
- Recent activity appears after stats
- Top game card present
- All-time favorites as ranked list
- Global stats footer at bottom

**Step 6: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "chore: clean up dead code and polish v2 dashboard styles"
```

---

### Task 9: Clear Build Cache and Final Verification

**Step 1: Clear .next cache**

```bash
rm -rf .next
```

**Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds without errors.

**Step 3: Commit if any remaining changes**

```bash
git status
# If clean, nothing to commit
```
