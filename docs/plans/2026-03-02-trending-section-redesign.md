# Trending Section Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the trending games section to fix visual hierarchy, remove misplaced All-Time content, eliminate unnecessary client JS, and improve information presentation.

**Architecture:** The trending panel becomes a pure server component showing 5 hot games with inline stats and visual emphasis on #1. The All-Time data moves to a new "Most Popular" sidebar panel. No client components needed.

**Tech Stack:** Next.js server components, CSS Modules (SCSS), react-icons/fa6

---

### Task 1: Rewrite trending section styles

**Files:**
- Rewrite: `app/(new-layout)/frontpage/sections/trending-section.module.scss`

**Step 1: Replace the entire stylesheet**

```scss
$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
$amber: #f59e0b;

.content {
    display: flex;
    flex-direction: column;
    padding: 1rem 1.25rem;
}

.header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: $amber;
    margin: 0 0 0.5rem;
}

.games {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

// ── Game card ──

.gameCard {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem;
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: color-mix(in srgb, var(--bs-secondary-bg) 50%, transparent);
        text-decoration: none;
        color: inherit;
    }
}

.gameCardTop {
    border-left: 3px solid $amber;
    padding-left: calc(0.5rem - 3px);
}

.rank {
    width: 1.5rem;
    text-align: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
}

.gameArt {
    width: 60px;
    height: 80px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--bs-secondary-bg) 80%, transparent);
}

.gameArtTop {
    width: 72px;
    height: 96px;
}

.gameInfo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.gameName {
    font-weight: 600;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--bs-body-color);
}

.gameNameTop {
    font-size: 1.1rem;
}

.categories {
    font-size: 0.85rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

// ── Inline stats ──

.stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
}

.stat {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
    color: var(--bs-secondary-color);

    svg {
        flex-shrink: 0;
    }
}

.statValue {
    font-family: $mono;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--bs-body-color);
}

.statHighlight {
    color: $amber;

    .statValue {
        color: $amber;
    }
}

// ── Empty state ──

.empty {
    text-align: center;
    padding: 2rem 1rem;
    font-size: 0.9rem;
    color: var(--bs-secondary-color);
}

// ── Responsive ──

@media (max-width: 480px) {
    .content {
        padding: 0.75rem 1rem;
    }

    .gameArt {
        width: 48px;
        height: 64px;
    }

    .gameArtTop {
        width: 56px;
        height: 75px;
    }

    .statSecondary {
        display: none;
    }
}
```

**Step 2: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/trending-section.module.scss
git commit -m "style: rewrite trending section styles — inline stats, larger art, #1 emphasis"
```

---

### Task 2: Rewrite trending section as server component

**Files:**
- Rewrite: `app/(new-layout)/frontpage/sections/trending-section.tsx`
- Delete: `app/(new-layout)/frontpage/sections/trending-section-client.tsx`

**Step 1: Rewrite `trending-section.tsx` to include all rendering inline (no client component)**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import {
    FaBolt,
    FaClock,
    FaFire,
    FaTrophy,
    FaUsers,
} from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import {
    type CategoryActivity,
    getCategoryActivityForGame,
    getGameActivity,
    type GameActivity,
} from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './trending-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

function formatHoursCompact(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours >= 1_000) return `${(hours / 1_000).toFixed(1)}K`;
    return Math.round(hours).toLocaleString();
}

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

function getDateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export const TrendingSection = async () => {
    const from24h = getDateDaysAgo(1);
    const to = getToday();

    const hotGames = await getGameActivity(from24h, to, 5, 2);

    const categoryMap: Record<number, CategoryActivity[]> = {};
    const categoryResults = await Promise.all(
        hotGames.map((game) =>
            getCategoryActivityForGame(game.gameId, from24h, to, 3),
        ),
    );
    for (let i = 0; i < hotGames.length; i++) {
        categoryMap[hotGames[i].gameId] = categoryResults[i];
    }

    return (
        <Panel
            panelId="trending"
            title="Trending Games"
            subtitle="Last 24 Hours"
            className="p-0 overflow-hidden"
        >
            <div className={styles.content}>
                <h3 className={styles.header}>
                    <FaFire size={12} aria-hidden="true" />
                    Hot Right Now
                </h3>

                {hotGames.length === 0 ? (
                    <p className={styles.empty}>
                        No trending activity in the last 24 hours.
                    </p>
                ) : (
                    <div className={styles.games}>
                        {hotGames.map((game, i) => (
                            <HotGameCard
                                key={game.gameId}
                                game={game}
                                rank={i + 1}
                                isTop={i === 0}
                                categories={
                                    categoryMap[game.gameId] ?? []
                                }
                            />
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
};

const HotGameCard = ({
    game,
    rank,
    isTop,
    categories,
}: {
    game: GameActivity;
    rank: number;
    isTop: boolean;
    categories: CategoryActivity[];
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={`${styles.gameCard} ${isTop ? styles.gameCardTop : ''}`}
        >
            <span className={styles.rank}>{rank}</span>
            <Image
                src={imageUrl}
                alt=""
                width={isTop ? 72 : 60}
                height={isTop ? 96 : 80}
                className={`${styles.gameArt} ${isTop ? styles.gameArtTop : ''}`}
                unoptimized
            />
            <div className={styles.gameInfo}>
                <span
                    className={`${styles.gameName} ${isTop ? styles.gameNameTop : ''}`}
                >
                    {game.gameDisplay}
                </span>
                {categories.length > 0 && (
                    <span className={styles.categories}>
                        {categories
                            .slice(0, 2)
                            .map((c) => c.categoryDisplay)
                            .join(' · ')}
                    </span>
                )}
            </div>
            <div className={styles.stats}>
                <span className={`${styles.stat} ${styles.statHighlight}`}>
                    <FaClock size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {formatHoursCompact(game.totalPlaytime)}
                    </span>
                </span>
                <span className={styles.stat}>
                    <FaUsers size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.uniquePlayers)}
                    </span>
                </span>
                <span className={`${styles.stat} ${styles.statSecondary}`}>
                    <FaBolt size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.totalAttempts)}
                    </span>
                </span>
                <span className={`${styles.stat} ${styles.statSecondary}`}>
                    <FaTrophy size={11} aria-hidden="true" />
                    <span className={styles.statValue}>
                        {compact.format(game.totalPbs)}
                    </span>
                </span>
            </div>
        </Link>
    );
};
```

**Step 2: Delete the old client component**

```bash
rm app/\(new-layout\)/frontpage/sections/trending-section-client.tsx
```

**Step 3: Commit**

```bash
git add -A app/\(new-layout\)/frontpage/sections/trending-section*.tsx
git commit -m "refactor: convert trending section to server component, remove client wrapper"
```

---

### Task 3: Create the Most Popular sidebar panel

**Files:**
- Create: `app/(new-layout)/frontpage/sections/most-popular.tsx`
- Create: `app/(new-layout)/frontpage/sections/most-popular.module.scss`

**Step 1: Create the stylesheet**

`most-popular.module.scss`:

```scss
$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;

.content {
    padding: 0.75rem 1rem;
}

.games {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.4rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.15s ease;

    &:hover {
        background-color: color-mix(in srgb, var(--bs-secondary-bg) 60%, transparent);
        text-decoration: none;
        color: inherit;
        transform: translateX(2px);
    }
}

.rank {
    width: 1.25rem;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    flex-shrink: 0;
}

.art {
    width: 30px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    flex-shrink: 0;
}

.name {
    flex: 1;
    min-width: 0;
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--bs-body-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.hours {
    font-family: $mono;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    flex-shrink: 0;
}

@media (max-width: 480px) {
    .rank {
        display: none;
    }
}
```

**Step 2: Create the server component**

`most-popular.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { type GameWithImage, getTopGames } from '~src/lib/highlights';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './most-popular.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

export const MostPopularSection = async () => {
    const games = await getTopGames(5);

    return (
        <Panel
            panelId="popular"
            title="Most Popular"
            subtitle="All Time"
            className="p-0 overflow-hidden"
        >
            <div className={styles.content}>
                <div className={styles.games}>
                    {games.map((game, i) => (
                        <PopularGameRow
                            key={game.gameId}
                            game={game}
                            rank={i + 1}
                        />
                    ))}
                </div>
            </div>
        </Panel>
    );
};

const PopularGameRow = ({
    game,
    rank,
}: {
    game: GameWithImage;
    rank: number;
}) => {
    const imageUrl =
        game.gameImage && game.gameImage !== 'noimage'
            ? game.gameImage
            : FALLBACK_IMAGE;

    const hours = Math.round(game.totalRunTime / 3_600_000).toLocaleString();

    return (
        <Link
            href={`/${safeEncodeURI(game.gameDisplay)}`}
            className={styles.row}
        >
            <span className={styles.rank}>{rank}</span>
            <Image
                src={imageUrl}
                alt=""
                width={30}
                height={40}
                className={styles.art}
                unoptimized
            />
            <span className={styles.name}>{game.gameDisplay}</span>
            <span className={styles.hours}>{hours}h</span>
        </Link>
    );
};
```

**Step 3: Commit**

```bash
git add app/\(new-layout\)/frontpage/sections/most-popular.tsx app/\(new-layout\)/frontpage/sections/most-popular.module.scss
git commit -m "feat: add Most Popular sidebar panel (relocated from trending)"
```

---

### Task 4: Wire Most Popular into the frontpage sidebar

**Files:**
- Modify: `app/(new-layout)/frontpage/frontpage.tsx`

**Step 1: Add import and Suspense block in sidebar**

Add the import:
```tsx
import { MostPopularSection } from './sections/most-popular';
```

Add a Suspense block in the sidebar column, after QuickLinks and before the first YourStatsSection:

```tsx
<Suspense fallback={<SectionSkeleton height={200} />}>
    <MostPopularSection />
</Suspense>
```

The sidebar order becomes: QuickLinks → MostPopular → YourStats (logged in) → CommunityPulse → YourStats (logged out) → Patreon

**Step 2: Commit**

```bash
git add app/\(new-layout\)/frontpage/frontpage.tsx
git commit -m "feat: add Most Popular panel to frontpage sidebar"
```

---

### Task 5: Update `getTopGames` cache to use `cacheLife('days')`

**Files:**
- Modify: `src/lib/highlights.ts`

**Step 1: Change `cacheLife('hours')` to `cacheLife('days')` in `getTopGames`**

In `src/lib/highlights.ts`, the `getTopGames` function (line ~156) currently uses `cacheLife('hours')`. Change it to `cacheLife('days')` since all-time data barely changes.

```typescript
export async function getTopGames(limit = 3): Promise<GameWithImage[]> {
    'use cache';
    cacheLife('days');
    cacheTag('top-games');

    return apiFetch<GameWithImage[]>(
        `/v1/runs/games?sort=-total_run_time&limit=${limit}`,
    );
}
```

**Step 2: Commit**

```bash
git add src/lib/highlights.ts
git commit -m "perf: cache top games for days instead of hours"
```

---

### Task 6: Verify the build compiles

**Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

**Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors related to changed files.

**Step 3: Run build**

```bash
rm -rf .next && npm run build
```

Expected: successful build, no compilation errors.

**Step 4: Fix any issues found, then commit fixes if needed**
