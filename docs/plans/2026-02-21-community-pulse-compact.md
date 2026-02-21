# Community Pulse Compact Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Community Pulse height by switching from stacked vertical layout to a two-column split (stats left, games right).

**Architecture:** Restructure the existing `CommunityPulseClient` JSX into a flex two-column layout. Left column holds the stat ticker + all-time chips. Right column holds top games stacked vertically. SCSS changes add the two-column container and adjust game card stacking.

**Tech Stack:** React, SCSS Modules, Next.js

**Design doc:** `docs/plans/2026-02-21-community-pulse-compact-design.md`

---

### Task 1: Add two-column SCSS styles

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse.module.scss`

**Step 1: Add the two-column container styles**

Add after the `.content` rule (line 6):

```scss
.columns {
    display: flex;
    gap: 0;
}

.leftCol {
    flex: 1;
    min-width: 0;
}

.rightCol {
    flex: 0 0 280px;
    padding-left: 1.5rem;
    border-left: 1px solid var(--bs-border-color);
    display: flex;
    flex-direction: column;
}
```

**Step 2: Change game cards from horizontal row to vertical stack**

In `.topGamesRow` (line ~201), change from:
```scss
.topGamesRow {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.75rem;
}
```
To:
```scss
.topGamesRow {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex: 1;
}
```

**Step 3: Remove top margin/border from `.topGamesHeader`**

Change `.topGamesHeader` (line ~189) from:
```scss
.topGamesHeader {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--bs-secondary-color);
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--bs-border-color);
    margin-bottom: 0.6rem;
}
```
To:
```scss
.topGamesHeader {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--bs-secondary-color);
    margin-bottom: 0.6rem;
}
```

**Step 4: Remove the "All Time" section header top spacing**

The `.sectionHeader:not(:first-child)` rule (line ~140) adds `margin-top: 1.25rem` and `border-top`. This will no longer apply since the "All Time" header is removed from the JSX (Task 2). No SCSS change needed here — the JSX change handles it.

**Step 5: Add responsive collapse for mobile**

In the `@media (max-width: 768px)` block (line ~260), add:

```scss
.columns {
    flex-direction: column;
}

.rightCol {
    flex: none;
    padding-left: 0;
    border-left: none;
    padding-top: 1rem;
    margin-top: 1rem;
    border-top: 1px solid var(--bs-border-color);
}
```

**Step 6: Commit**

```bash
git add app/(new-layout)/frontpage/sections/community-pulse.module.scss
git commit -m "style: add two-column layout styles for community pulse"
```

---

### Task 2: Restructure JSX into two columns

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/community-pulse-client.tsx`

**Step 1: Wrap content in two-column layout**

Replace the current return JSX (lines 146-275) with a two-column structure:

```tsx
return (
    <div ref={ref} className={styles.content}>
        <div className={styles.columns}>
            {/* ── Left column: stats ── */}
            <div className={styles.leftCol}>
                <div className={styles.sectionHeader}>
                    <span>Last 24 Hours</span>
                    <Link href="/live" className={styles.liveBar}>
                        <span className={styles.liveDot} />
                        <span className={styles.liveCount}>{liveCount}</span>
                        <span className={styles.liveLabel}>live now</span>
                    </Link>
                </div>
                <div className={styles.ticker}>
                    {/* 4 stat cells — unchanged */}
                    <div className={`${styles.cell} ${styles.hero}`}>
                        <span className={styles.number}>
                            {pbs.toLocaleString()}
                        </span>
                        <span className={styles.label}>
                            <FaTrophy size={11} /> Personal Bests
                        </span>
                        <span className={styles.allTime}>
                            {compact.format(allTime.totalPbs)} all time
                        </span>
                    </div>
                    <div className={styles.cell}>
                        <span className={styles.number}>
                            {runs.toLocaleString()}
                        </span>
                        <span className={styles.label}>
                            <FaFlagCheckered size={11} /> Runs Completed
                        </span>
                        <span className={styles.allTime}>
                            {compact.format(allTime.totalFinishedAttemptCount)} all time
                        </span>
                    </div>
                    <div className={styles.cell}>
                        <span className={styles.number}>
                            {attempts.toLocaleString()}
                        </span>
                        <span className={styles.label}>
                            <FaBolt size={11} /> Total Attempts
                        </span>
                        <span className={styles.allTime}>
                            {compact.format(allTime.totalAttemptCount)} all time
                        </span>
                    </div>
                    <div className={styles.cell}>
                        <span className={styles.number}>
                            {hours.toLocaleString()}
                        </span>
                        <span className={styles.label}>
                            <FaClock size={11} /> Hours Played
                        </span>
                        <span className={styles.allTime}>
                            {formatHours(allTime.totalRunTime)} all time
                        </span>
                    </div>
                </div>

                {/* All-time chips — no section header, just the chips */}
                <div className={styles.footer} style={{ marginTop: '0.75rem' }}>
                    <span className={styles.footerChip}>
                        <FaUsers size={12} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalRunners)}
                        </span>
                        <span className={styles.chipLabel}>runners</span>
                    </span>
                    <span className={styles.footerChip}>
                        <FaGamepad size={12} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalGames)}
                        </span>
                        <span className={styles.chipLabel}>games</span>
                    </span>
                    <span className={styles.footerChip}>
                        <FaLayerGroup size={12} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalCategories)}
                        </span>
                        <span className={styles.chipLabel}>categories</span>
                    </span>
                    <span className={styles.footerChip}>
                        <FaPlay size={10} className={styles.chipIcon} />
                        <span className={styles.chipNumber}>
                            {compact.format(allTime.totalRaces)}
                        </span>
                        <span className={styles.chipLabel}>races</span>
                    </span>
                </div>
            </div>

            {/* ── Right column: top games ── */}
            <div className={styles.rightCol}>
                <div className={styles.topGamesHeader}>Top Games</div>
                <div className={styles.topGamesRow}>
                    {topGames.map((game) => (
                        <div key={game.gameId} className={styles.gameCard}>
                            {game.gameImage && game.gameImage !== 'noimage' && (
                                <img
                                    src={game.gameImage}
                                    alt=""
                                    className={styles.gameImage}
                                />
                            )}
                            <div className={styles.gameInfo}>
                                <span className={styles.gameName}>
                                    {game.gameDisplay}
                                </span>
                                <span className={styles.gameStats}>
                                    <span className={styles.gameStat}>
                                        <FaClock size={9} />
                                        {Math.round(
                                            game.totalRunTime / 3_600_000,
                                        ).toLocaleString()}{' '}
                                        hrs
                                    </span>
                                    <span className={styles.gameStat}>
                                        <FaBolt size={9} />
                                        {compact.format(game.totalAttemptCount)}
                                    </span>
                                    <span className={styles.gameStat}>
                                        <FaFlagCheckered size={9} />
                                        {compact.format(
                                            game.totalFinishedAttemptCount,
                                        )}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);
```

Key changes from current JSX:
- Added `.columns` wrapper with `.leftCol` and `.rightCol`
- Removed "All Time" `sectionHeader` div — chips sit directly below ticker
- Removed unused `_i` variable from `topGames.map`
- All stat cells and game cards are identical content, just restructured into columns

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/community-pulse-client.tsx
git commit -m "refactor: two-column layout for community pulse"
```

---

### Task 3: Visual verification and cleanup

**Step 1: Run dev server and verify**

```bash
npm run dev
```

Check at `http://localhost:3000`:
- Stats display correctly on the left
- Games stack vertically on the right with 44x59 images
- All-time chips appear below the ticker
- Live indicator still works
- Responsive: on narrow viewport, collapses to single column
- Count-up animation still fires on scroll

**Step 2: Run lint**

```bash
npm run lint && npm run typecheck
```

**Step 3: Final commit if any fixes needed**
