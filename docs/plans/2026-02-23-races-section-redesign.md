# Races Section Redesign — Status-Tiered Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat race rows with status-tiered cards — live and imminent upcoming races get full-width hero cards with game art backgrounds and glowing accents; finished and non-imminent races stay compact.

**Architecture:** Server component (`RacesSection`) classifies races into tiers (live, imminent, compact) and passes them to client components. New `RaceCard` handles the hero treatment with blurred game art backgrounds; existing `RaceRow` stays for compact display. Both use `useRace` for WebSocket updates.

**Tech Stack:** Next.js App Router, React 19, SCSS Modules, existing `useRace` hook + `RaceTimer` component.

---

### Task 1: Create `RaceCard` client component

**Files:**
- Create: `app/(new-layout)/frontpage/sections/race-card.tsx`

**Step 1: Create the `RaceCard` component**

This is the hero card for live and imminent races. It uses the same blurred-background technique as PB feed featured slides.

```tsx
'use client';

import Image from 'next/image';
import { FaClock, FaTrophy, FaUser } from 'react-icons/fa6';
import { RaceTimer } from '~app/(old-layout)/races/[race]/race-timer';
import { sortRaceParticipants } from '~app/(old-layout)/races/[race]/sort-race-participants';
import { useRace } from '~app/(old-layout)/races/hooks/use-race';
import { Race } from '~app/(old-layout)/races/races.types';
import { DurationToFormatted } from '~src/components/util/datetime';
import styles from './races-section.module.scss';

const FALLBACK_IMAGE = '/logo_dark_theme_no_text_transparent.png';

interface RaceCardProps {
    race: Race;
    variant: 'live' | 'imminent';
}

export const RaceCard = ({ race: initialRace, variant }: RaceCardProps) => {
    const { raceState } = useRace(initialRace, []);
    const race = raceState;

    const imageUrl =
        race.gameImage && race.gameImage !== 'noimage'
            ? race.gameImage
            : FALLBACK_IMAGE;

    const isLive = race.status === 'progress' || race.status === 'starting';

    const sortedParticipants = sortRaceParticipants(race);
    const leader = sortedParticipants[0];
    const leaderFinished =
        leader?.status === 'finished' || leader?.status === 'confirmed';

    return (
        <a
            href={`/races/${race.raceId}`}
            className={`${styles.card} ${variant === 'live' ? styles.cardLive : styles.cardImminent}`}
        >
            <img
                src={imageUrl}
                alt=""
                className={styles.cardBg}
            />
            <div className={styles.cardOverlay} />
            <div className={styles.cardContent}>
                <div className={styles.cardTop}>
                    <span
                        className={`${styles.cardBadge} ${variant === 'live' ? styles.cardBadgeLive : styles.cardBadgeImminent}`}
                    >
                        <span
                            className={
                                variant === 'live'
                                    ? styles.liveDot
                                    : styles.imminentDot
                            }
                        />
                        {variant === 'live' ? 'LIVE' : 'STARTING SOON'}
                    </span>
                    <span className={styles.cardParticipants}>
                        {race.participantCount}
                        <FaUser size={10} />
                    </span>
                </div>
                <div className={styles.cardInfo}>
                    <span className={styles.cardGame}>{race.displayGame}</span>
                    <span className={styles.cardCategory}>
                        {race.displayCategory}
                        {leader && isLive && !leaderFinished && (
                            <>
                                {' · '}
                                Leader: {leader.user}
                            </>
                        )}
                        {leaderFinished && leader && (
                            <>
                                {' · '}
                                <FaTrophy size={10} /> {leader.user}
                            </>
                        )}
                    </span>
                </div>
                <div className={styles.cardTimer}>
                    {isLive ? (
                        <RaceTimer race={race} />
                    ) : race.startMethod === 'everyone-ready' ? (
                        <span className={styles.cardReadyCount}>
                            {race.readyParticipantCount}/{race.participantCount}{' '}
                            Ready
                        </span>
                    ) : race.willStartAt ? (
                        <StartingSoonTimer willStartAt={race.willStartAt} />
                    ) : (
                        <span className={styles.cardWaiting}>
                            <FaClock size={12} /> Waiting for players...
                        </span>
                    )}
                </div>
            </div>
        </a>
    );
};

const StartingSoonTimer = ({ willStartAt }: { willStartAt: string }) => {
    const now = Date.now();
    const start = new Date(willStartAt).getTime();
    const diffMs = start - now;

    if (diffMs <= 0) return <span>Starting now...</span>;

    const minutes = Math.ceil(diffMs / 60000);
    return (
        <span>
            Starts in {minutes} min
        </span>
    );
};
```

**Step 2: Verify no type errors**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/race-card.tsx
git commit -m "feat: add RaceCard component for live/imminent race hero cards"
```

---

### Task 2: Add card styles to SCSS module

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/races-section.module.scss`

**Step 1: Add card styles**

Add these styles after the existing `.group` / `.groupHeader` styles (before the `// ── Race rows ──` comment). These follow the same blurred-background pattern as `pb-feed.module.scss` `.featuredSlide` / `.featuredBg` / `.featuredOverlay`.

```scss
// ── Race cards (live + imminent) ──

$amber: #f59e0b;
$blue: #3b82f6;

.card {
    display: flex;
    position: relative;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    border-radius: 0;
    transition: transform 0.15s ease;

    &:not(:first-child) {
        border-top: 1px solid color-mix(in srgb, var(--bs-border-color) 30%, transparent);
    }

    &:hover {
        text-decoration: none;
        color: inherit;
        transform: translateX(2px);
    }
}

.cardLive {
    border-left: 3px solid $amber;
    box-shadow: inset 0 0 30px rgba($amber, 0.06);
}

.cardImminent {
    border-left: 3px solid $blue;
    box-shadow: inset 0 0 30px rgba($blue, 0.04);
}

.cardBg {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: auto;
    height: 100%;
    object-fit: contain;
    object-position: right;
    pointer-events: none;
}

.cardOverlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
        to right,
        var(--bs-body-bg) 35%,
        color-mix(in srgb, var(--bs-body-bg) 75%, transparent) 55%,
        color-mix(in srgb, var(--bs-body-bg) 25%, transparent) 75%,
        transparent 100%
    );
    pointer-events: none;
}

.cardContent {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.85rem 1.25rem;
    width: 100%;
}

.cardTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.cardBadge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.55rem;
    border-radius: 100px;
    white-space: nowrap;
}

.cardBadgeLive {
    color: $amber;
    background: rgba($amber, 0.1);
    border: 1px solid rgba($amber, 0.2);
}

.cardBadgeImminent {
    color: $blue;
    background: rgba($blue, 0.08);
    border: 1px solid rgba($blue, 0.15);
}

.imminentDot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $blue;
    opacity: 0.7;
}

.cardParticipants {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--bs-secondary-color);
}

.cardInfo {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
}

.cardGame {
    font-weight: 700;
    font-size: 1.15rem;
    color: var(--bs-body-color);
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cardCategory {
    font-size: 0.78rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cardTimer {
    font-family: $mono;
    font-weight: 700;
    font-size: 1.8rem;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--bs-body-color);
    font-variant-numeric: tabular-nums;
}

.cardLive .cardTimer {
    color: $amber;
}

.cardImminent .cardTimer {
    color: $blue;
    font-size: 1.3rem;
}

.cardReadyCount {
    font-family: $mono;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.cardWaiting {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--bs-secondary-color);
    opacity: 0.7;
}

// ── Finished row gold accent ──

.rowFinished {
    border-left: 3px solid #d4af37;
}
```

Also add responsive rules at the bottom:

```scss
@media (max-width: 480px) {
    .cardContent {
        padding: 0.65rem 1rem;
    }

    .cardGame {
        font-size: 1rem;
    }

    .cardTimer {
        font-size: 1.4rem;
    }

    .cardImminent .cardTimer {
        font-size: 1.1rem;
    }
}
```

**Step 2: Remove the duplicate `$amber` declaration at the top of the file**

The file already has `$amber: #f59e0b;` at line 2. The new card styles section also declares it. Keep only one declaration at the top and add `$blue` next to it.

**Step 3: Verify styles compile**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/races-section.module.scss
git commit -m "style: add status-tiered card styles for races section"
```

---

### Task 3: Update `RacesSection` server component to classify races into tiers

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/races-section.tsx`

**Step 1: Rewrite the server component**

Replace the entire file. The key changes:
- Classify pending races as "imminent" (scheduled within 30 min OR ≥3 participants) vs regular
- Render `RaceCard` for live + imminent, `RaceRow` for the rest
- Dynamic subtitle showing live count

```tsx
import { FaArrowRight } from 'react-icons/fa6';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { Race } from '~app/(old-layout)/races/races.types';
import { getSession } from '~src/actions/session.action';
import { getAllActiveRaces, getPaginatedFinishedRaces } from '~src/lib/races';
import { RaceCard } from './race-card';
import { RaceRow } from './race-row';
import styles from './races-section.module.scss';

const MAX_CARDS = 3;
const MAX_COMPACT = 3;
const IMMINENT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const IMMINENT_PARTICIPANT_THRESHOLD = 3;

function isImminent(race: Race): boolean {
    if (race.willStartAt) {
        const diff = new Date(race.willStartAt).getTime() - Date.now();
        if (diff > 0 && diff <= IMMINENT_THRESHOLD_MS) return true;
    }
    if (race.participantCount >= IMMINENT_PARTICIPANT_THRESHOLD) return true;
    return false;
}

export const RacesSection = async () => {
    const [races, session, prefetchedFinished] = await Promise.all([
        getAllActiveRaces(),
        getSession(),
        getPaginatedFinishedRaces(1, 6),
    ]);

    // Live: in-progress or starting
    const liveRaces = races
        .filter((race) => race.status === 'progress' || race.status === 'starting')
        .slice(0, MAX_CARDS);

    // Pending: split into imminent vs regular
    const pendingRaces = races.filter(
        (race) => race.participantCount > 0 && race.status === 'pending',
    );
    const imminentRaces = pendingRaces
        .filter(isImminent)
        .slice(0, MAX_CARDS - liveRaces.length);
    const regularPending = pendingRaces
        .filter((race) => !isImminent(race))
        .slice(0, MAX_COMPACT);

    // Finished: fill remaining compact slots
    const compactCount = regularPending.length;
    const fillCount = Math.max(0, MAX_COMPACT - compactCount);
    const finishedRaces = prefetchedFinished.items
        .filter(
            (race) =>
                race.status === 'finished' &&
                race.results &&
                race.results.length > 0 &&
                (race.results[0].status === 'finished' ||
                    race.results[0].status === 'confirmed'),
        )
        .slice(0, fillCount);

    const cardRaces = [...liveRaces, ...imminentRaces];
    const compactRaces = [...regularPending, ...finishedRaces];
    const hasRaces = cardRaces.length > 0 || compactRaces.length > 0;
    const liveCount = liveRaces.length;

    return (
        <Panel
            panelId="races"
            title="Races"
            subtitle={liveCount > 0 ? `${liveCount} Live Now` : 'Race against friends'}
            link={{ url: '/races', text: 'View All Races' }}
            className="p-0 overflow-hidden"
        >
            {!hasRaces && (
                <div className={styles.emptyState}>
                    No active races right now. Be the first to start one!
                </div>
            )}

            {cardRaces.map((race) => (
                <RaceCard
                    key={race.raceId}
                    race={race}
                    variant={
                        race.status === 'progress' || race.status === 'starting'
                            ? 'live'
                            : 'imminent'
                    }
                />
            ))}

            {compactRaces.length > 0 && (
                <div className={styles.group}>
                    {cardRaces.length > 0 && (
                        <div className={styles.groupHeader}>
                            Recent
                        </div>
                    )}
                    {compactRaces.map((race) => (
                        <RaceRow
                            key={race.raceId}
                            race={race}
                            className={
                                race.status === 'finished'
                                    ? styles.rowFinished
                                    : undefined
                            }
                        />
                    ))}
                </div>
            )}

            {session && (
                <div className={styles.ctaContainer}>
                    <a href="/races/create" className={styles.startRaceButton}>
                        Start a Race <FaArrowRight size={12} />
                    </a>
                </div>
            )}
        </Panel>
    );
};
```

**Step 2: Update `RaceRow` to accept optional `className` prop**

In `race-row.tsx`, add `className?: string` to the `RaceRowProps` interface and apply it:

```tsx
interface RaceRowProps {
    race: Race;
    className?: string;
}

export const RaceRow = ({ race: initialRace, className }: RaceRowProps) => {
    // ... existing code
    return (
        <a
            href={`/races/${race.raceId}`}
            className={`${styles.raceRow} ${className ?? ''}`}
        >
            {/* ... rest unchanged */}
        </a>
    );
};
```

**Step 3: Verify types and build**

Run: `npm run typecheck`

**Step 4: Commit**

```bash
git add app/(new-layout)/frontpage/sections/races-section.tsx app/(new-layout)/frontpage/sections/race-row.tsx
git commit -m "feat: status-tiered race cards with live/imminent hero treatment"
```

---

### Task 4: Visual polish and testing

**Files:**
- Possibly adjust: `app/(new-layout)/frontpage/sections/races-section.module.scss`

**Step 1: Run dev server and visually verify**

Run: `npm run dev`

Check the frontpage at localhost:3000. Verify:
- If live races exist: amber-glowing cards with game art background, large timer, LIVE badge
- If imminent upcoming races exist: blue-accented cards with countdown/ready count
- Finished races: compact rows with gold left border
- Empty state: centered text
- "Start a Race" button: still visible when logged in
- Hover effects work on both cards and rows
- Responsive: check at mobile widths

**Step 2: Fix any visual issues found**

Adjust SCSS values as needed based on visual testing.

**Step 3: Run typecheck and lint**

Run: `npm run typecheck && npm run lint`

**Step 4: Commit any polish fixes**

```bash
git add -A
git commit -m "style: visual polish for races section cards"
```
