# Streak Card Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the minimal streak bar with a visually compelling streak card that creates emotional investment and a zero-streak CTA that motivates users to start running.

**Architecture:** Replace the `StreakBar` component and its SCSS styles with a new `StreakCard` component. Reorder `DashboardContent` to put the period toggle first, then the streak card. No backend changes needed — all data already available.

**Tech Stack:** React 19, SCSS Modules, clsx, react-icons/fa (FaFire, FaBolt already imported)

---

### Task 1: Replace streak SCSS styles

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss:14-72`

Replace the entire `/* ── Streak Bar ── */` section (lines 14-72) with the new streak card styles.

**Step 1: Replace streak styles**

Delete lines 14-72 (the old streak bar/zero styles) and replace with:

```scss
/* ── Streak Card ── */

$streak-orange: #f97316;
$streak-hot: #ef4444;

.streakCard {
    position: relative;
    border-radius: 0.6rem;
    padding: 1rem 1.15rem;
    margin-bottom: 1rem;
    overflow: hidden;
    background: linear-gradient(
        135deg,
        rgba($amber, 0.08) 0%,
        rgba($amber, 0.03) 100%
    );
    border: 1px solid rgba($amber, 0.15);
}

.streakCardHot {
    background: linear-gradient(
        135deg,
        rgba($streak-orange, 0.1) 0%,
        rgba($streak-orange, 0.04) 100%
    );
    border-color: rgba($streak-orange, 0.2);
}

.streakCardNearRecord {
    background: linear-gradient(
        135deg,
        rgba($streak-hot, 0.1) 0%,
        rgba($streak-hot, 0.04) 100%
    );
    border-color: rgba($streak-hot, 0.2);
}

.streakCardRecord {
    background: linear-gradient(
        135deg,
        rgba($gold, 0.12) 0%,
        rgba($gold, 0.04) 100%
    );
    border-color: rgba($gold, 0.25);
}

.streakCardZero {
    background: linear-gradient(
        135deg,
        rgba(var(--bs-secondary-color-rgb, 128, 128, 128), 0.06) 0%,
        rgba(var(--bs-secondary-color-rgb, 128, 128, 128), 0.02) 100%
    );
    border-color: rgba(var(--bs-border-color-rgb), 0.15);
}

.streakHero {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.75rem;
}

.streakNumber {
    font-family: $mono;
    font-size: 2.2rem;
    font-weight: 800;
    line-height: 1;
    color: var(--bs-emphasis-color);
}

.streakDaysLabel {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--bs-secondary-color);
}

.streakIcon {
    color: $amber;
    flex-shrink: 0;
    margin-right: 0.15rem;
}

.streakIconHot {
    color: $streak-orange;
}

.streakIconNearRecord {
    color: $streak-hot;
}

.streakIconRecord {
    color: $gold;
    filter: drop-shadow(0 0 4px rgba($gold, 0.5));
}

/* Progress bar */

.streakProgressWrap {
    margin-bottom: 0.85rem;
}

.streakProgressTrack {
    height: 6px;
    border-radius: 3px;
    background: rgba(var(--bs-emphasis-color-rgb, 255, 255, 255), 0.08);
    overflow: hidden;
}

.streakProgressFill {
    height: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg, $amber, color-mix(in srgb, $amber 70%, $streak-orange));
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 2px;
}

.streakProgressFillHot {
    background: linear-gradient(90deg, $amber, $streak-orange);
}

.streakProgressFillNearRecord {
    background: linear-gradient(90deg, $streak-orange, $streak-hot);
    box-shadow: 0 0 8px rgba($streak-hot, 0.3);
}

.streakProgressFillRecord {
    background: linear-gradient(90deg, $amber, $gold);
    box-shadow: 0 0 10px rgba($gold, 0.4);
}

.streakProgressLabel {
    display: flex;
    justify-content: space-between;
    margin-top: 0.3rem;
    font-size: 0.62rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
}

/* Stats row */

.streakStats {
    display: flex;
    margin-bottom: 0.65rem;
}

.streakStat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;

    & + & {
        border-left: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
    }
}

.streakStatValue {
    font-family: $mono;
    font-size: 1rem;
    font-weight: 700;
    color: var(--bs-emphasis-color);
}

.streakStatLabel {
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--bs-secondary-color);
}

/* Milestone message */

.streakMilestone {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: $amber;
}

.streakMilestoneNearRecord {
    color: $streak-orange;
}

.streakMilestoneRecord {
    color: $gold;
    font-weight: 700;
}

/* Zero state CTA */

.streakZeroContent {
    text-align: center;
}

.streakZeroIcon {
    color: var(--bs-secondary-color);
    opacity: 0.4;
    margin-bottom: 0.5rem;
}

.streakZeroHeading {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--bs-emphasis-color);
    margin-bottom: 0.35rem;
}

.streakZeroText {
    font-size: 0.78rem;
    color: var(--bs-secondary-color);
    line-height: 1.4;
    margin-bottom: 0.75rem;
}

.streakZeroBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.streakZeroTrack {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: rgba(var(--bs-emphasis-color-rgb, 255, 255, 255), 0.06);
}

.streakZeroLabel {
    font-family: $mono;
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    opacity: 0.6;
    margin-left: 0.5rem;
}
```

**Step 2: Verify no build errors**

Run: `npm run typecheck`
Expected: PASS (SCSS changes don't affect types, but good to verify nothing broke)

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats.module.scss
git commit -m "feat: replace streak bar styles with streak card styles"
```

---

### Task 2: Replace StreakBar component with StreakCard

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx:98-150`

**Step 1: Replace the StreakBar function**

Delete the `StreakBar` function (lines 98-150) and replace with:

```tsx
function StreakCard({
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
            <div className={clsx(styles.streakCard, styles.streakCardZero)}>
                <div className={styles.streakZeroContent}>
                    <FaFire size={24} className={styles.streakZeroIcon} />
                    <div className={styles.streakZeroHeading}>
                        Start Your Streak
                    </div>
                    <div className={styles.streakZeroText}>
                        Every record starts with Day 1. Complete a run today.
                    </div>
                    <div className={styles.streakZeroBar}>
                        <div className={styles.streakZeroTrack} />
                        <span className={styles.streakZeroLabel}>Day 0</span>
                    </div>
                </div>
            </div>
        );
    }

    // Determine intensity tier
    const ratio = allTimeBest > 0 ? current / allTimeBest : 1;
    const tier: 'normal' | 'hot' | 'nearRecord' | 'record' = isRecord
        ? 'record'
        : streakMilestone?.type === 'near_record'
          ? 'nearRecord'
          : ratio >= 0.5
            ? 'hot'
            : 'normal';

    // Progress bar percentage — if no all-time best, scale to 30 days
    const progressMax = allTimeBest > 0 ? allTimeBest : 30;
    const progressPct = Math.min((current / progressMax) * 100, 100);

    const cardClass = clsx(
        styles.streakCard,
        tier === 'hot' && styles.streakCardHot,
        tier === 'nearRecord' && styles.streakCardNearRecord,
        tier === 'record' && styles.streakCardRecord,
    );

    const iconClass = clsx(
        styles.streakIcon,
        tier === 'hot' && styles.streakIconHot,
        tier === 'nearRecord' && styles.streakIconNearRecord,
        tier === 'record' && styles.streakIconRecord,
    );

    const fillClass = clsx(
        styles.streakProgressFill,
        tier === 'hot' && styles.streakProgressFillHot,
        tier === 'nearRecord' && styles.streakProgressFillNearRecord,
        tier === 'record' && styles.streakProgressFillRecord,
    );

    const milestoneClass = clsx(
        styles.streakMilestone,
        tier === 'nearRecord' && styles.streakMilestoneNearRecord,
        tier === 'record' && styles.streakMilestoneRecord,
    );

    return (
        <div className={cardClass}>
            {/* Hero number */}
            <div className={styles.streakHero}>
                <FaFire size={22} className={iconClass} />
                <span className={styles.streakNumber}>{current}</span>
                <span className={styles.streakDaysLabel}>
                    {current === 1 ? 'day' : 'days'}
                </span>
            </div>

            {/* Progress bar */}
            <div className={styles.streakProgressWrap}>
                <div className={styles.streakProgressTrack}>
                    <div
                        className={fillClass}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <div className={styles.streakProgressLabel}>
                    <span>
                        {isRecord
                            ? 'New record!'
                            : allTimeBest > 0
                              ? `${current} of ${allTimeBest} days`
                              : `${current} days`}
                    </span>
                    {allTimeBest > 0 && !isRecord && (
                        <span>Record: {allTimeBest}d</span>
                    )}
                </div>
            </div>

            {/* Three stats */}
            <div className={styles.streakStats}>
                <div className={styles.streakStat}>
                    <span className={styles.streakStatValue}>{current}</span>
                    <span className={styles.streakStatLabel}>Current</span>
                </div>
                <div className={styles.streakStat}>
                    <span className={styles.streakStatValue}>
                        {periodBest}
                    </span>
                    <span className={styles.streakStatLabel}>Period Best</span>
                </div>
                <div className={styles.streakStat}>
                    <span className={styles.streakStatValue}>
                        {allTimeBest}
                    </span>
                    <span className={styles.streakStatLabel}>All-Time</span>
                </div>
            </div>

            {/* Milestone message */}
            {isRecord ? (
                <div className={milestoneClass}>
                    <FaBolt size={12} />
                    New all-time record — keep going!
                </div>
            ) : streakMilestone ? (
                <div className={milestoneClass}>
                    <FaBolt size={12} />
                    {streakMilestone.message}
                </div>
            ) : null}
        </div>
    );
}
```

**Step 2: Update the reference in DashboardContent**

In `DashboardContent` (around line 269), change:
```tsx
<StreakBar streak={streak} streakMilestone={streakMilestone} />
```
to:
```tsx
<StreakCard streak={streak} streakMilestone={streakMilestone} />
```

**Step 3: Verify types**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx
git commit -m "feat: replace StreakBar with StreakCard component"
```

---

### Task 3: Reorder DashboardContent — period toggle above streak

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx:266-278`

**Step 1: Swap render order**

In `DashboardContent`'s return JSX, change the order from:
```tsx
{/* 1. Streak Bar */}
<StreakCard streak={streak} streakMilestone={streakMilestone} />

{/* 2. Highlight Carousel */}
{highlightList.length > 0 && (
    <HighlightCarousel highlights={highlightList} />
)}

{/* 3. Period Toggle */}
{periodToggle}
```

to:
```tsx
{/* 1. Period Toggle */}
{periodToggle}

{/* 2. Streak Card */}
<StreakCard streak={streak} streakMilestone={streakMilestone} />

{/* 3. Highlight Carousel */}
{highlightList.length > 0 && (
    <HighlightCarousel highlights={highlightList} />
)}
```

**Step 2: Verify types**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/your-stats-client.tsx
git commit -m "feat: move period toggle above streak card"
```

---

### Task 4: Visual QA and polish

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/your-stats.module.scss` (if needed)
- Modify: `app/(new-layout)/frontpage/sections/your-stats-client.tsx` (if needed)

**Step 1: Run dev server and verify**

Run: `npm run dev`

Check the following in the browser:
1. Active streak: card displays with correct tier coloring
2. Zero streak: CTA card with "Start Your Streak" and empty progress bar
3. Period toggle appears above the streak card
4. Three stats row shows Current / Period Best / All-Time
5. Progress bar fills proportionally to all-time record
6. Milestone messages display when present
7. Record state shows gold treatment

**Step 2: Run full checks**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 3: Final commit if any polish was needed**

```bash
git add -A
git commit -m "polish: streak card visual adjustments"
```
