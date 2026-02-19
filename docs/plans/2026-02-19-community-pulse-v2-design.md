# Community Pulse v2 — Ticker/Scoreboard Redesign

## Goal

Redesign the Community Pulse panel to be flashier, clearer, and more visually compelling. Make it a full-width scoreboard that people want to check daily.

## Layout Change

- Move from `col-5` (paired with Trending) to **full-width row** above the Trending/PbFeed row.
- Trending moves to pair with PbFeedSection or gets its own row.

## Data Structure

### Top tier: 24h delta stats (hero numbers)

Big monospace count-up numbers, animated on scroll via IntersectionObserver:

1. **Personal Bests** (amber accent, most prominent)
2. **Runs Completed** (`totalFinishedAttemptCount` delta)
3. **Total Attempts** (`totalAttemptCount` delta) — NEW
4. **Playtime** (hours, from `totalRunTime` delta)

Each stat shows: big 24h number + small "X all time" secondary text below.

### Bottom tier: all-time totals (no deltas)

Compact horizontal footer row, separated by dots:

- Total Runners
- Total Games
- Total Categories
- Total Races — NEW (requires `totalRaces` in `GlobalStats`)
- Live count (pulsing amber dot)

## Visual Style: Ticker/Scoreboard

- Full-width horizontal strip
- Big monospace numbers evenly spaced in a row
- Thin vertical separators between stats
- Amber (#f59e0b) accent on PBs
- Count-up animation with `easeOutExpo` easing, triggered by IntersectionObserver
- Footer stats compact, inline, dot-separated

## Type Changes

Add `totalRaces: number` to `GlobalStats` interface in `src/lib/highlights.ts`.

## Files Modified

- `src/lib/highlights.ts` — add `totalRaces` to interface
- `app/(new-layout)/frontpage/sections/community-pulse.tsx` — update server component (add attempts delta, pass totalRaces)
- `app/(new-layout)/frontpage/sections/community-pulse-client.tsx` — rewrite client component with ticker layout + count-up animation
- `app/(new-layout)/frontpage/sections/community-pulse.module.scss` — full restyle for scoreboard look
- `app/(new-layout)/frontpage/frontpage.tsx` — move CommunityPulse to full-width row

## Component Structure

Data fetching stays in server component, all rendering/animation in client component. This separation makes it easy to swap visual styles later.
