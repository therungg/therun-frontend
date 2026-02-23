# PB Feed Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the dense log-style PB feed with a hybrid layout — auto-rotating featured card + refined compact list.

**Architecture:** Two-zone layout inside existing Panel wrapper. Top zone: absolutely-positioned crossfading cards for the 3 most recent PBs with game art backgrounds. Bottom zone: scrollable compact list for remaining PBs with larger icons and better spacing. All client-side — no server component changes.

**Tech Stack:** React 19, Next.js Image, SCSS modules, CSS transitions, `useEffect`/`useRef`/`useState` for rotation timer.

**Design doc:** `docs/plans/2026-02-23-pb-feed-redesign-design.md`

---

### Task 1: Write the SCSS module

**Files:**
- Rewrite: `app/(new-layout)/frontpage/sections/pb-feed.module.scss`

**Context:**
- Monospace font stack used in hero/community-pulse: `'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace`
- Green for improvements: `#4caf50`
- Game art mask from hero: `mask-image: linear-gradient(90deg, transparent 0%, black 25%)`
- All colors via `var(--bs-*)` CSS variables

**Step 1: Replace the entire SCSS file with the new styles**

```scss
$mono: 'SF Mono', 'Monaco', 'Cascadia Code', 'Courier New', monospace;
$green: #4caf50;

/* ── Featured carousel ── */

.featured {
    position: relative;
    height: 160px;
    overflow: hidden;
    border-bottom: 1px solid var(--bs-border-color);
}

.featuredSlide {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: stretch;
    opacity: 0;
    transition: opacity 500ms ease;
    pointer-events: none;
}

.featuredSlideActive {
    opacity: 1;
    pointer-events: auto;
}

.featuredArt {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40%;
    object-fit: cover;
    mask-image: linear-gradient(90deg, transparent 0%, black 25%);
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 25%);
    pointer-events: none;
}

.featuredContent {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
    padding: 1.25rem 1.5rem;
    max-width: 65%;
}

.featuredRunner {
    font-weight: 700;
    font-size: 1rem;
    color: var(--bs-body-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.featuredGameCategory {
    font-size: 0.8rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.featuredTimeRow {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-top: 0.25rem;
}

.featuredTime {
    font-family: $mono;
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
    color: var(--bs-body-color);
}

.featuredDelta {
    font-family: $mono;
    font-weight: 700;
    font-size: 0.95rem;
    color: $green;
    font-variant-numeric: tabular-nums;
}

.featuredFirstPb {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    background-color: color-mix(in srgb, var(--bs-info) 20%, transparent);
    color: var(--bs-info);
    white-space: nowrap;
}

.featuredTimestamp {
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    margin-top: auto;
}

/* ── Dot indicators ── */

.dots {
    position: absolute;
    bottom: 0.6rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2;
    display: flex;
    gap: 0.5rem;
}

.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--bs-secondary-color);
    opacity: 0.3;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s ease;
}

.dotActive {
    opacity: 1;
    background: var(--bs-body-color);
    transform: scale(1.3);
}

/* ── Compact list ── */

.listContainer {
    max-height: 440px;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--bs-secondary-bg);
        border-radius: 3px;

        &:hover {
            background: color-mix(in srgb, var(--bs-secondary-bg) 80%, var(--bs-body-color) 20%);
        }
    }
}

.listItem {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 1.25rem;
    border-bottom: 1px solid color-mix(in srgb, var(--bs-border-color) 40%, transparent);
    transition: background-color 0.15s ease;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: color-mix(in srgb, var(--bs-secondary-bg) 35%, transparent);
    }
}

.listGameIcon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, var(--bs-border-color) 60%, transparent);
}

.listInfo {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.listRunnerName {
    font-weight: 600;
    font-size: 0.88rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.listGameCategory {
    font-size: 0.75rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.listRight {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
}

.listTime {
    font-family: $mono;
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--bs-body-color);
}

.listDelta {
    font-family: $mono;
    font-weight: 700;
    font-size: 0.78rem;
    color: $green;
    font-variant-numeric: tabular-nums;
}

.listFirstPb {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    background-color: color-mix(in srgb, var(--bs-info) 20%, transparent);
    color: var(--bs-info);
    white-space: nowrap;
}

.listTimestamp {
    font-size: 0.7rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    min-width: 3.5rem;
    text-align: right;
}

/* ── Responsive ── */

@media (max-width: 768px) {
    .featured {
        height: 140px;
    }

    .featuredContent {
        padding: 1rem 1.25rem;
        max-width: 75%;
    }

    .featuredTime {
        font-size: 1.4rem;
    }

    .featuredArt {
        width: 30%;
    }
}

@media (max-width: 480px) {
    .featured {
        height: 130px;
    }

    .featuredContent {
        max-width: 100%;
    }

    .featuredArt {
        display: none;
    }

    .featuredTime {
        font-size: 1.25rem;
    }

    .listRight {
        flex-direction: column;
        align-items: flex-end;
        gap: 0.15rem;
    }
}
```

**Step 2: Verify no syntax errors**

Run: `npm run build 2>&1 | head -30`
Expected: No SCSS compilation errors (component won't render correctly yet since TSX still uses old class names, but SCSS should compile)

**Step 3: Commit**

```
git add app/(new-layout)/frontpage/sections/pb-feed.module.scss
git commit -m "style: rewrite pb feed styles for hybrid carousel + list layout"
```

---

### Task 2: Rewrite the client component

**Files:**
- Rewrite: `app/(new-layout)/frontpage/sections/pb-feed-client.tsx`

**Context:**
- `Panel` component: `<Panel title="..." subtitle="..." className="p-0">` — spreads extra props onto inner div
- `UserLink`: `<UserLink username={string} />` — renders a link to `/user/{username}`
- `DurationToFormatted`: `<DurationToFormatted duration={number} />` — formats ms to `H:MM:SS`
- `FromNow`: `<FromNow time={string} />` — renders relative time ("2m ago")
- `getFormattedString(ms: string, showMs: boolean)` — formats improvement delta
- `FinishedRunPB` type: has `id`, `username`, `game`, `category`, `time`, `previousPb`, `endedAt`, `gameId`
- `gameImages` map: keyed by game name (string), value is image URL
- `FALLBACK_IMAGE`: `/logo_dark_theme_no_text_transparent.png`
- SCSS class names from Task 1: `featured`, `featuredSlide`, `featuredSlideActive`, `featuredArt`, `featuredContent`, `featuredRunner`, `featuredGameCategory`, `featuredTimeRow`, `featuredTime`, `featuredDelta`, `featuredFirstPb`, `featuredTimestamp`, `dots`, `dot`, `dotActive`, `listContainer`, `listItem`, `listGameIcon`, `listInfo`, `listRunnerName`, `listGameCategory`, `listRight`, `listTime`, `listDelta`, `listFirstPb`, `listTimestamp`
- React Compiler is enabled — no manual `useMemo`/`useCallback` needed

**Step 1: Replace the entire client component**

```tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserLink } from '~src/components/links/links';
import {
    DurationToFormatted,
    FromNow,
    getFormattedString,
} from '~src/components/util/datetime';
import type { FinishedRunPB } from '~src/lib/highlights';
import styles from './pb-feed.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';
const ROTATE_INTERVAL = 8000;
const FEATURED_COUNT = 3;

interface PbFeedClientProps {
    pbs: FinishedRunPB[];
    gameImages: Record<string, string>;
}

export const PbFeedClient = ({ pbs, gameImages }: PbFeedClientProps) => {
    const featured = pbs.slice(0, FEATURED_COUNT);
    const rest = pbs.slice(FEATURED_COUNT);

    return (
        <Panel title="Personal Bests" subtitle="Recent PBs" className="p-0">
            <FeaturedCarousel pbs={featured} gameImages={gameImages} />
            <div className={styles.listContainer}>
                {rest.map((pb) => (
                    <CompactItem
                        key={pb.id}
                        pb={pb}
                        imageUrl={gameImages[pb.game] ?? FALLBACK_IMAGE}
                    />
                ))}
            </div>
        </Panel>
    );
};

const FeaturedCarousel = ({
    pbs,
    gameImages,
}: {
    pbs: FinishedRunPB[];
    gameImages: Record<string, string>;
}) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const pausedRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

    useEffect(() => {
        if (pbs.length <= 1) return;

        timerRef.current = setInterval(() => {
            if (!pausedRef.current) {
                setActiveIndex((i) => (i + 1) % pbs.length);
            }
        }, ROTATE_INTERVAL);

        return () => clearInterval(timerRef.current);
    }, [pbs.length]);

    return (
        <div
            className={styles.featured}
            onMouseEnter={() => { pausedRef.current = true; }}
            onMouseLeave={() => { pausedRef.current = false; }}
        >
            {pbs.map((pb, i) => {
                const imageUrl = gameImages[pb.game] ?? FALLBACK_IMAGE;
                const improvement =
                    pb.previousPb !== null ? pb.previousPb - pb.time : null;
                const hasImprovement =
                    improvement !== null && improvement > 0;

                return (
                    <div
                        key={pb.id}
                        className={`${styles.featuredSlide} ${i === activeIndex ? styles.featuredSlideActive : ''}`}
                    >
                        <img
                            src={imageUrl}
                            alt=""
                            className={styles.featuredArt}
                        />
                        <div className={styles.featuredContent}>
                            <span className={styles.featuredRunner}>
                                <UserLink username={pb.username} />
                            </span>
                            <span className={styles.featuredGameCategory}>
                                {pb.game} &middot; {pb.category}
                            </span>
                            <div className={styles.featuredTimeRow}>
                                <span className={styles.featuredTime}>
                                    <DurationToFormatted duration={pb.time} />
                                </span>
                                {hasImprovement ? (
                                    <span className={styles.featuredDelta}>
                                        -
                                        {getFormattedString(
                                            improvement.toString(),
                                            improvement < 60000,
                                        )}
                                    </span>
                                ) : pb.previousPb === null ? (
                                    <span className={styles.featuredFirstPb}>
                                        First PB!
                                    </span>
                                ) : null}
                            </div>
                            <span className={styles.featuredTimestamp}>
                                <FromNow time={pb.endedAt} />
                            </span>
                        </div>
                    </div>
                );
            })}
            {pbs.length > 1 && (
                <div className={styles.dots}>
                    {pbs.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
                            onClick={() => setActiveIndex(i)}
                            aria-label={`Show PB ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CompactItem = ({
    pb,
    imageUrl,
}: {
    pb: FinishedRunPB;
    imageUrl: string;
}) => {
    const improvement =
        pb.previousPb !== null ? pb.previousPb - pb.time : null;
    const hasImprovement = improvement !== null && improvement > 0;

    return (
        <div className={styles.listItem}>
            <Image
                src={imageUrl}
                alt={pb.game}
                width={40}
                height={40}
                className={styles.listGameIcon}
                unoptimized
            />
            <div className={styles.listInfo}>
                <span className={styles.listRunnerName}>
                    <UserLink username={pb.username} />
                </span>
                <span className={styles.listGameCategory}>
                    {pb.game} &middot; {pb.category}
                </span>
            </div>
            <div className={styles.listRight}>
                <span className={styles.listTime}>
                    <DurationToFormatted duration={pb.time} />
                </span>
                {hasImprovement ? (
                    <span className={styles.listDelta}>
                        -
                        {getFormattedString(
                            improvement.toString(),
                            improvement < 60000,
                        )}
                    </span>
                ) : pb.previousPb === null ? (
                    <span className={styles.listFirstPb}>First PB!</span>
                ) : null}
                <span className={styles.listTimestamp}>
                    <FromNow time={pb.endedAt} />
                </span>
            </div>
        </div>
    );
};
```

**Step 2: Type check**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: No type errors

**Step 3: Lint**

Run: `npx @biomejs/biome check --write app/(new-layout)/frontpage/sections/pb-feed-client.tsx`
Expected: Clean or auto-fixed

**Step 4: Commit**

```
git add app/(new-layout)/frontpage/sections/pb-feed-client.tsx
git commit -m "feat: rewrite pb feed with featured carousel + compact list"
```

---

### Task 3: Visual verification and polish

**Files:**
- Possibly tweak: `app/(new-layout)/frontpage/sections/pb-feed.module.scss`
- Possibly tweak: `app/(new-layout)/frontpage/sections/pb-feed-client.tsx`

**Step 1: Start dev server and verify**

Run: `npm run dev`
Open: `http://localhost:3000`

Check:
- Featured card shows with game art on the right, faded
- Auto-rotation works (wait 8+ seconds)
- Hover pauses rotation
- Dot indicators clickable and reflect active slide
- Compact list below with 40px icons, proper spacing
- Scrollbar styled
- Mobile: resize to check responsive breakpoints (768px, 480px)

**Step 2: Adjust spacing/sizes based on visual inspection**

Likely tweaks: featured card height, font sizes, art mask opacity, gap sizes. Update SCSS values as needed.

**Step 3: Commit any polish**

```
git add -A
git commit -m "style: polish pb feed carousel spacing and responsive tweaks"
```
