# Races Hero Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform race cards from bland left-bordered rows into full-bleed hero cards with game art backgrounds, animated glows, and bold typography.

**Architecture:** Pure visual redesign — SCSS and JSX markup changes only. No new components, no logic changes. The `RaceCard` component gets restructured markup for the hero layout, the SCSS gets rewritten for card styles, and `RacesSection` gets a wrapper div for card spacing.

**Tech Stack:** SCSS modules, React JSX, CSS animations, backdrop-filter

**Design doc:** `docs/plans/2026-02-25-races-hero-cards-design.md`

---

### Task 1: Rewrite card SCSS for full-bleed hero layout

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/races-section.module.scss` (lines 49-223)

**Step 1: Replace the card styles section**

Replace everything from `// ── Race cards` through `.cardWaiting` (lines 49-223) with the new hero card styles. Keep lines 1-47 (variables, group headers, status dots) and lines 225+ (race rows, CTA, etc.) unchanged.

```scss
// ── Hero race cards (live + imminent) ──

.cardList {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
}

.card {
    display: flex;
    position: relative;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    border-radius: 8px;
    min-height: 150px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:hover {
        text-decoration: none;
        color: inherit;
        transform: scale(1.01);
    }
}

.cardLive {
    border: 1px solid rgba($amber, 0.4);
    animation: glowPulse 2.5s ease-in-out infinite;
}

.cardImminent {
    border: 1px solid rgba($blue, 0.3);
    box-shadow: 0 0 12px rgba($blue, 0.15), 0 0 24px rgba($blue, 0.08);
}

.cardBg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center right;
    pointer-events: none;
}

.cardOverlay {
    position: absolute;
    inset: 0;
    background:
        linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.6) 40%,
            rgba(0, 0, 0, 0.2) 70%,
            transparent 100%
        ),
        linear-gradient(
            to right,
            rgba(0, 0, 0, 0.5) 0%,
            transparent 60%
        );
    pointer-events: none;
}

.cardContent {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.85rem 1.1rem;
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
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.2rem 0.6rem;
    border-radius: 100px;
    white-space: nowrap;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.cardBadgeLive {
    color: #fff;
    background: rgba($amber, 0.35);
    border: 1px solid rgba($amber, 0.5);
}

.cardBadgeImminent {
    color: #fff;
    background: rgba($blue, 0.3);
    border: 1px solid rgba($blue, 0.4);
}

.imminentDot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $blue;
    opacity: 0.85;
}

.cardParticipants {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.cardBottom {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.cardGame {
    font-weight: 800;
    font-size: 1.3rem;
    color: #fff;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
}

.cardCategory {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.cardTimer {
    font-family: $mono;
    font-weight: 700;
    font-size: 2.2rem;
    line-height: 1;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    margin-top: 0.15rem;
}

.cardLive .cardTimer {
    color: $amber;
}

.cardImminent .cardTimer {
    color: $blue;
    font-size: 1.6rem;
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
    color: rgba(255, 255, 255, 0.7);
}

.cardSocialProof {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 0.1rem;
}
```

**Step 2: Replace the pulse animation and add glowPulse**

Replace the existing `@keyframes pulse` block (lines 415-426) with both animations:

```scss
// ── Animations ──

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
        box-shadow: 0 0 6px rgba($amber, 0.5), 0 0 12px rgba($amber, 0.3);
    }

    50% {
        opacity: 0.4;
        box-shadow: 0 0 3px rgba($amber, 0.2);
    }
}

@keyframes glowPulse {
    0%,
    100% {
        box-shadow: 0 0 15px rgba($amber, 0.3), 0 0 30px rgba($amber, 0.15);
    }

    50% {
        box-shadow: 0 0 8px rgba($amber, 0.15), 0 0 16px rgba($amber, 0.08);
    }
}
```

**Step 3: Update responsive styles**

Replace the existing responsive block (lines 430-459) with:

```scss
@media (max-width: 480px) {
    .cardList {
        gap: 0.4rem;
        padding: 0.4rem 0.5rem;
    }

    .card {
        min-height: 130px;
    }

    .cardContent {
        padding: 0.65rem 0.85rem;
    }

    .cardGame {
        font-size: 1.1rem;
    }

    .cardTimer {
        font-size: 1.6rem;
    }

    .cardImminent .cardTimer {
        font-size: 1.3rem;
    }

    .raceRow {
        padding: 0.4rem 1rem;
    }

    .raceRight {
        gap: 0.35rem;
    }

    .time,
    .liveTimer {
        font-size: 0.8rem;
    }
}
```

**Step 4: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: PASS (SCSS changes don't affect types but verify module imports still resolve)

**Step 5: Commit**

```bash
git add app/(new-layout)/frontpage/sections/races-section.module.scss
git commit -m "style: hero card SCSS for full-bleed race cards"
```

---

### Task 2: Update RaceCard component markup

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/race-card.tsx`

**Step 1: Restructure the JSX**

Replace the entire `RaceCard` component return (lines 47-93) to use a `cardBottom` wrapper instead of `cardInfo`, and add social proof text for imminent cards:

```tsx
return (
    <a href={`/races/${race.raceId}`} className={cardClassName}>
        <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className={styles.cardBg}
        />
        <div className={styles.cardOverlay} />
        <div className={styles.cardContent}>
            <div className={styles.cardTop}>
                <span className={badgeClassName}>
                    <span
                        className={
                            isLive ? styles.liveDot : styles.imminentDot
                        }
                    />
                    {isLive ? 'LIVE' : 'STARTING SOON'}
                </span>
                <span className={styles.cardParticipants}>
                    {race.participantCount}
                    <FaUser size={11} />
                </span>
            </div>
            <div className={styles.cardBottom}>
                <span className={styles.cardGame}>
                    {race.displayGame}
                </span>
                <span className={styles.cardCategory}>
                    {race.displayCategory}
                    {isLive && leader && !leaderFinished && (
                        <>
                            {' · '} Leader: {leader.user}
                        </>
                    )}
                    {isLive && leader && leaderFinished && (
                        <>
                            {' · '}
                            <FaTrophy size={10} /> {leader.user}
                        </>
                    )}
                </span>
                <div className={styles.cardTimer}>
                    <TimerSection race={race} variant={variant} />
                </div>
                {!isLive && race.participantCount > 0 && (
                    <span className={styles.cardSocialProof}>
                        {race.participantCount} runner{race.participantCount !== 1 ? 's' : ''} waiting
                    </span>
                )}
            </div>
        </div>
    </a>
);
```

Note: the key change is wrapping game/category/timer in `cardBottom` instead of `cardInfo`, and adding the social proof line for imminent cards.

**Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/race-card.tsx
git commit -m "feat: hero card markup with bottom-aligned content and social proof"
```

---

### Task 3: Add cardList wrapper in RacesSection

**Files:**
- Modify: `app/(new-layout)/frontpage/sections/races-section.tsx`

**Step 1: Wrap card races in a cardList div**

Replace lines 84-94 (the `cardRaces.map` block) with:

```tsx
{cardRaces.length > 0 && (
    <div className={styles.cardList}>
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
    </div>
)}
```

**Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(new-layout)/frontpage/sections/races-section.tsx
git commit -m "feat: add cardList wrapper for hero card spacing"
```

---

### Task 4: Visual verification and polish

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

Navigate to `http://localhost:3000` and check:
- Hero cards render with full-bleed game art backgrounds
- Live cards have animated amber glow pulse
- Imminent cards have static blue glow
- Text is readable over game art (text-shadows working)
- Badges have frosted glass effect
- Hover scales cards up slightly
- Social proof text shows on imminent cards
- Compact rows below are unchanged
- Mobile responsive (shrink browser to 480px)

**Step 3: Fix any visual issues found during verification**

Adjust values as needed based on how the art looks with real game images.

**Step 4: Commit any polish changes**

```bash
git add -A
git commit -m "style: polish hero card visual details"
```
