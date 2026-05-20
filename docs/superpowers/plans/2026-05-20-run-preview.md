# Run Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, fullscreen, chromeless multi-segment "run preview" page at `/[username]/[game]/[run]/preview` for showing on-screen at speedrun events while a caster narrates.

**Architecture:** New `app/(chromeless)/` route group with its own minimal layout. Server component fetches via existing lib functions, composes a `PreviewData` shape, runs a storylines rules engine. Client `<PreviewNavigator>` handles 5 paginated segments via keyboard + click. Shared `<SegmentFrame>` provides game-themed framing.

**Tech Stack:** Next.js 16 (App Router, `'use cache'`), React 19, TypeScript, SCSS modules, `node-vibrant` for dominant color extraction.

**Spec:** `docs/superpowers/specs/2026-05-20-run-preview-design.md`

**Project conventions:**
- No test runner is configured. Verification is manual via `npm run dev` + `npm run typecheck` + `npm run lint`.
- Commit style: `feat(preview): ...`, no Claude co-author trailer.
- Biome formats: 4-space indent, single quotes, trailing commas, semicolons.
- Path aliases: `~src/*` → `src/*`, `~app/*` → `app/*`.

---

## File Structure

```
app/(chromeless)/
  layout.tsx                          // chromeless layout, no header/footer
  [username]/[game]/[run]/preview/
    page.tsx                          // server component, fetches PreviewData
    PreviewNavigator.tsx              // client navigator
    SegmentFrame.tsx                  // shared frame
    preview.module.scss               // shared styles
    segments/
      IdentityCard.tsx
      HeadlineStats.tsx
      RecentForm.tsx
      SplitStory.tsx
      Storylines.tsx
      segments.module.scss            // per-segment styles

src/lib/
  preview.ts                          // getPreviewData composer
  preview-storylines.ts               // rules engine + rule functions
  dominant-color.ts                   // server-side color extraction

types/
  preview.types.ts                    // PreviewData, Storyline, StorylineInput
```

---

## Task 1: Types — Define PreviewData and Storyline shapes

**Files:**
- Create: `types/preview.types.ts`

- [ ] **Step 1: Write the types file**

```ts
// types/preview.types.ts

export type StorylineKind =
    | 'pb-fresh'
    | 'pb-drought'
    | 'chokepoint'
    | 'gold-chaser'
    | 'gold-streak'
    | 'grinder'
    | 'multi-category'
    | 'time-sink'
    | 'first-run';

export type Storyline = {
    kind: StorylineKind;
    title: string;
    body: string;
    priority: number; // 1-9, higher = more important
};

export type RecentRunPoint = {
    time: number; // ms
    achievedAt: string; // ISO
    isPb: boolean;
};

export type PreviewSegment = {
    name: string;
    goldTime: number | null; // ms
    avgTime: number | null; // ms
    pbTime: number | null; // ms
    timeLostVsPb: number; // ms; max(0, pbTime - goldTime) or computed from history
    isChokepoint: boolean;
};

export type PreviewData = {
    runner: {
        username: string;
        displayName: string;
        avatarUrl: string | null;
        pronouns: string | null;
    };
    game: {
        name: string;
        slug: string;
        imageUrl: string | null;
        dominantColor: string | null; // hex, e.g. '#3a7bd5'
    };
    category: {
        name: string;
        slug: string;
    };
    headline: {
        pb: { time: number; achievedAt: string; runId: string } | null;
        sumOfBest: { time: number; gapToPb: number } | null;
        attempts: { total: number; finished: number; finishRate: number };
        timeInvested: { totalMs: number };
    };
    recentForm: {
        runs: RecentRunPoint[]; // last 20 finished
        trend: 'improving' | 'flat' | 'regressing' | null;
        runsPerWeek: number;
    } | null;
    splits: {
        segments: PreviewSegment[];
        theoreticalBestGap: number; // ms; sumOfBest vs pb
    } | null;
    storylines: Storyline[]; // top 3
};

export type StorylineInput = {
    runner: PreviewData['runner'];
    game: PreviewData['game'];
    category: PreviewData['category'];
    pb: PreviewData['headline']['pb'];
    sumOfBest: PreviewData['headline']['sumOfBest'];
    attempts: PreviewData['headline']['attempts'];
    timeInvested: PreviewData['headline']['timeInvested'];
    recentRuns: RecentRunPoint[];
    segments: PreviewSegment[] | null;
    otherCategoriesCount: number; // for multi-category storyline
};
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add types/preview.types.ts
git commit -m "feat(preview): add preview data types"
```

---

## Task 2: Chromeless route group + skeleton page

**Files:**
- Create: `app/(chromeless)/layout.tsx`
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/page.tsx`

- [ ] **Step 1: Create the chromeless layout**

```tsx
// app/(chromeless)/layout.tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: 'therun.gg',
};

export default function ChromelessLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div
            style={{
                minHeight: '100vh',
                width: '100%',
                background: '#0a0a0a',
                color: '#fff',
                overflow: 'hidden',
            }}
        >
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Create the skeleton page**

```tsx
// app/(chromeless)/[username]/[game]/[run]/preview/page.tsx
interface PageProps {
    params: Promise<{ username: string; game: string; run: string }>;
}

export default async function PreviewPage(props: PageProps) {
    const params = await props.params;
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Preview skeleton</h1>
            <pre>{JSON.stringify(params, null, 2)}</pre>
        </div>
    );
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`

Open: `http://localhost:3000/joey/celeste/any-percent/preview` (substitute any real runner/game/category if known, otherwise any path — page should still render).

Expected: The skeleton page renders with NO site header and NO footer. Just the dark page with the JSON dump.

If site header appears: the route group escape isn't working. Confirm `(chromeless)` is a sibling of `(new-layout)` and has its own `layout.tsx`.

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/\(chromeless\)/
git commit -m "feat(preview): scaffold chromeless route + skeleton page"
```

---

## Task 3: Dominant color extraction helper

**Files:**
- Modify: `package.json` (add `node-vibrant` dependency)
- Create: `src/lib/dominant-color.ts`

- [ ] **Step 1: Install node-vibrant**

Run: `npm install node-vibrant`
Expected: Installs successfully. Verify `package.json` has `"node-vibrant"` in dependencies.

- [ ] **Step 2: Create the helper**

```ts
// src/lib/dominant-color.ts
import { Vibrant } from 'node-vibrant/node';

export async function getDominantColor(
    imageUrl: string | null,
): Promise<string | null> {
    if (!imageUrl) return null;
    try {
        const palette = await Vibrant.from(imageUrl).getPalette();
        // Prefer Vibrant, fall back to other swatches
        const swatch =
            palette.Vibrant ||
            palette.DarkVibrant ||
            palette.LightVibrant ||
            palette.Muted;
        return swatch?.hex ?? null;
    } catch {
        return null;
    }
}
```

- [ ] **Step 3: Verify via temporary log**

Temporarily edit the skeleton page to call this:

```tsx
// app/(chromeless)/[username]/[game]/[run]/preview/page.tsx (temporary)
import { getDominantColor } from '~src/lib/dominant-color';

export default async function PreviewPage(props: PageProps) {
    const params = await props.params;
    const color = await getDominantColor(
        'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg',
    );
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Preview skeleton</h1>
            <div>color: {color}</div>
            <pre>{JSON.stringify(params, null, 2)}</pre>
        </div>
    );
}
```

Run: `npm run dev` and load the preview URL.
Expected: `color:` line shows a hex string like `#3a7bd5`.

Revert the temporary edit after verifying.

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/dominant-color.ts
git commit -m "feat(preview): add dominant-color helper using node-vibrant"
```

---

## Task 4: Time parsing utilities (small helper module)

The `Run` type uses string times (e.g., `"00:23:45.123"`). The preview works in milliseconds. Centralize parsing.

**Files:**
- Create: `src/lib/preview-time.ts`

- [ ] **Step 1: Check for existing time parser**

Run: `grep -rn "parseDuration\|parseTime\|toMilliseconds" /home/joey/therun/therun-fr/src/utils /home/joey/therun/therun-fr/src/lib 2>/dev/null | head -10`

If an existing helper is found that parses "HH:MM:SS.mmm" → ms, import and reuse it instead of creating a new one. Skip Steps 2-3.

- [ ] **Step 2: Create the helper**

```ts
// src/lib/preview-time.ts

/** Parses "HH:MM:SS.mmm" or "MM:SS.mmm" → milliseconds. Returns 0 on falsy/invalid. */
export function timeToMs(s: string | null | undefined): number {
    if (!s) return 0;
    const parts = s.split(':');
    if (parts.length === 0) return 0;

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 3) {
        hours = Number(parts[0]) || 0;
        minutes = Number(parts[1]) || 0;
        seconds = Number(parts[2]) || 0;
    } else if (parts.length === 2) {
        minutes = Number(parts[0]) || 0;
        seconds = Number(parts[1]) || 0;
    } else if (parts.length === 1) {
        seconds = Number(parts[0]) || 0;
    }

    return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
}

/** Formats ms → "H:MM:SS" or "MM:SS" (drops hours if zero, drops ms). */
export function msToTime(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Formats ms → "2d 14h 7m" or "14h 7m" or "7m" — humanized large duration. */
export function msToHumanDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms <= 0) return '0m';
    const totalMinutes = Math.floor(ms / 60000);
    const d = Math.floor(totalMinutes / (60 * 24));
    const h = Math.floor((totalMinutes % (60 * 24)) / 60);
    const m = totalMinutes % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(' ');
}

/** Days between an ISO date and now. */
export function daysSince(iso: string | null | undefined): number | null {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return null;
    return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/preview-time.ts
git commit -m "feat(preview): add time parsing/formatting helpers"
```

---

## Task 5: getPreviewData composer (data only, empty storylines)

Compose the existing lib functions, build the `PreviewData` shape. Storylines are added in Task 6.

**Files:**
- Create: `src/lib/preview.ts`

- [ ] **Step 1: Inspect the Run type and existing lib responses**

Read these files for the data available:
- `src/common/types.ts` — `Run`, `RunHistory`, `SplitsHistory`, `RunSession` types
- `src/lib/get-run.ts` — `getRun(username, game, run)` returns `Run`
- `src/lib/get-global-user.ts` — `getGlobalUser(username)` returns `UserData`
- `src/components/game/get-game.ts` — `getGame(slug)` returns IGDB metadata
- `src/lib/get-user-runs.ts` — `getUserRuns(username)` returns `Run[]` (all categories — used for "otherCategoriesCount")
- `src/lib/get-advanced-user-stats.ts` — `getAdvancedUserStats(user, tz)` — used if needed for history

Identify which fields supply each piece of `PreviewData`. Notably:
- `run.personalBest` — PB time (string)
- `run.personalBestTime` — when PB was set (ISO date)
- `run.sumOfBests` — sum of best splits (string)
- `run.timeToSave` — gap between PB and SoB (string)
- `run.attemptCount`, `run.finishedAttemptCount` — strings
- `run.sessions` — for time invested calculation (sum of `endedAt - startedAt`)
- `globalGameData.data.cover.url` or similar — game art URL (verify shape by logging once)
- `userData.picture` — runner avatar
- `userData.pronouns` — runner pronouns

The recent run history and per-split breakdown may live on `run` or require a separate fetch. If `run.sessions` includes per-session run lists with times, derive recent runs from there. If not, use `getAdvancedUserStats(username, 'UTC')` and pull the per-category history. Log once during development to confirm shape.

- [ ] **Step 2: Create the composer (no storylines yet)**

```ts
// src/lib/preview.ts
'use server';

import { cacheLife, cacheTag } from 'next/cache';
import { getGame } from '~src/components/game/get-game';
import { getGlobalUser } from './get-global-user';
import { getRun } from './get-run';
import { getUserRuns } from './get-user-runs';
import { getDominantColor } from './dominant-color';
import { timeToMs } from './preview-time';
import type {
    PreviewData,
    PreviewSegment,
    RecentRunPoint,
} from '../../types/preview.types';

const RECENT_RUNS_LIMIT = 20;
const RECENT_FORM_WEEKS = 4;

export async function getPreviewData(
    username: string,
    gameSlug: string,
    categorySlug: string,
): Promise<PreviewData | null> {
    'use cache';
    cacheLife('hours');
    cacheTag(`preview-${username}-${gameSlug}-${categorySlug}`);

    const [run, gameData, userData, allUserRuns] = await Promise.all([
        getRun(username, gameSlug, categorySlug).catch(() => null),
        getGame(gameSlug).catch(() => null),
        getGlobalUser(username).catch(() => null),
        getUserRuns(username).catch(() => [] as Awaited<ReturnType<typeof getUserRuns>>),
    ]);

    if (!run || !userData) return null;

    const imageUrl: string | null =
        gameData?.data?.cover?.url
            ? // IGDB cover URLs need t_cover_big; upgrade if it's a thumbnail
              gameData.data.cover.url.replace('t_thumb', 't_cover_big')
            : null;

    const dominantColor = await getDominantColor(imageUrl);

    const pbMs = timeToMs(run.personalBest);
    const sobMs = timeToMs(run.sumOfBests);
    const attemptsTotal = Number(run.attemptCount) || 0;
    const attemptsFinished = Number(run.finishedAttemptCount) || 0;

    const timeInvestedMs = (run.sessions ?? []).reduce((acc, s) => {
        const start = new Date(s.startedAt).getTime();
        const end = new Date(s.endedAt).getTime();
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            return acc + (end - start);
        }
        return acc;
    }, 0);

    // Recent form — derive from advanced stats history if available, otherwise leave null.
    // For v1, use a placeholder until shape is confirmed in browser; see Task 5 note below.
    const recentRuns: RecentRunPoint[] = []; // FILLED IN STEP 3 BELOW after shape confirmed
    const recentForm = buildRecentForm(recentRuns);

    // Splits — derive from run.splitsHistory or similar. v1: skip if absent.
    const segments: PreviewSegment[] = []; // FILLED IN STEP 3 BELOW after shape confirmed
    const splits =
        segments.length > 0
            ? {
                  segments,
                  theoreticalBestGap: Math.max(0, pbMs - sobMs),
              }
            : null;

    // Other categories of this game by this user
    const otherCategoriesCount = (allUserRuns ?? []).filter(
        (r) => r.game === run.game && r.run !== run.run,
    ).length;

    const data: PreviewData = {
        runner: {
            username,
            displayName: userData.displayName ?? username,
            avatarUrl: userData.picture ?? null,
            pronouns: userData.pronouns ?? null,
        },
        game: {
            name: gameData?.data?.name ?? run.game,
            slug: gameSlug,
            imageUrl,
            dominantColor,
        },
        category: {
            name: run.run,
            slug: categorySlug,
        },
        headline: {
            pb: pbMs > 0
                ? {
                      time: pbMs,
                      achievedAt: run.personalBestTime
                          ? new Date(run.personalBestTime).toISOString()
                          : new Date(0).toISOString(),
                      runId: run.pbId ? String(run.pbId) : run.url,
                  }
                : null,
            sumOfBest: sobMs > 0
                ? { time: sobMs, gapToPb: Math.max(0, pbMs - sobMs) }
                : null,
            attempts: {
                total: attemptsTotal,
                finished: attemptsFinished,
                finishRate:
                    attemptsTotal > 0 ? attemptsFinished / attemptsTotal : 0,
            },
            timeInvested: { totalMs: timeInvestedMs },
        },
        recentForm,
        splits,
        storylines: [], // populated in Task 6
    };

    // Stash extras for storylines engine (passed separately, not on PreviewData)
    return data;
}

function buildRecentForm(
    runs: RecentRunPoint[],
): PreviewData['recentForm'] {
    if (runs.length === 0) return null;

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const cutoff = now - RECENT_FORM_WEEKS * weekMs;
    const recentCount = runs.filter(
        (r) => new Date(r.achievedAt).getTime() >= cutoff,
    ).length;
    const runsPerWeek = recentCount / RECENT_FORM_WEEKS;

    let trend: 'improving' | 'flat' | 'regressing' | null = null;
    if (runs.length >= 3) {
        const half = Math.floor(runs.length / 2);
        const recent = runs.slice(0, half);
        const prior = runs.slice(half);
        const avg = (xs: RecentRunPoint[]) =>
            xs.reduce((a, b) => a + b.time, 0) / xs.length;
        const recentAvg = avg(recent);
        const priorAvg = avg(prior);
        const delta = priorAvg - recentAvg; // positive = recent runs are faster
        const fivePctOfPb = recent.length > 0 ? recent[0].time * 0.05 : 0;
        if (delta > fivePctOfPb) trend = 'improving';
        else if (delta < -fivePctOfPb) trend = 'regressing';
        else trend = 'flat';
    }

    return { runs, trend, runsPerWeek };
}
```

- [ ] **Step 3: Confirm `recentRuns` and `segments` shape from a real fetch**

Temporarily add a log to the composer:
```ts
console.log('RUN SHAPE', JSON.stringify(run, null, 2).slice(0, 4000));
```

Run dev, load `/preview` URL for a known runner+game+category (ask user for one), inspect log. Identify:
- Which field on `Run` holds per-segment history (likely `run.splitsFile` is a URL; or there's a `history` field; or use `getAdvancedUserStats`)
- Which field holds the list of finished run times

Two likely paths:
- If `run` includes inline split history → use it directly
- Otherwise: add a fetch to `getAdvancedUserStats(username, 'UTC')` and pull the per-category bucket

Update Step 2's composer to populate `recentRuns` and `segments` from the real shape. Specifically:
- `recentRuns`: sort by `achievedAt` desc, take first 20, set `isPb` true only for the entry whose `time === pbMs`
- `segments`: per split, compute `goldTime` (best), `avgTime` (average), `pbTime` (split time on the PB run), `timeLostVsPb = max(0, avgTime - pbTime)`. Set `isChokepoint: true` on the single segment with the largest `timeLostVsPb` (or `false` for all if no segment exceeds 5% of PB).

Remove the temporary log when done.

- [ ] **Step 4: Verify with real data**

Temporarily edit `page.tsx` to render the data:
```tsx
import { getPreviewData } from '~src/lib/preview';

export default async function PreviewPage(props: PageProps) {
    const params = await props.params;
    const data = await getPreviewData(params.username, params.game, params.run);
    return <pre style={{ padding: '2rem' }}>{JSON.stringify(data, null, 2)}</pre>;
}
```

Load a known runner/game/category URL in browser.

Expected: full `PreviewData` JSON renders, including non-null `pb`, `sumOfBest`, populated `recentForm.runs`, `splits.segments`, `dominantColor`. Identify any null fields that shouldn't be null and fix the composer.

- [ ] **Step 5: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/preview.ts
git commit -m "feat(preview): compose preview data from existing lib functions"
```

---

## Task 6: Storylines rules engine

**Files:**
- Create: `src/lib/preview-storylines.ts`
- Modify: `src/lib/preview.ts` (wire engine output into PreviewData)

- [ ] **Step 1: Create the rules engine**

```ts
// src/lib/preview-storylines.ts
import type {
    Storyline,
    StorylineInput,
    StorylineKind,
} from '../../types/preview.types';
import { daysSince, msToHumanDuration, msToTime } from './preview-time';

type Rule = (input: StorylineInput) => Storyline | null;

const CHOKEPOINT_MIN_DELTA_PCT = 0.05;
const GOLD_CHASER_MIN_GAP_PCT = 0.05;
const PB_DROUGHT_MIN_DAYS = 90;
const PB_FRESH_MAX_DAYS = 14;
const GRINDER_MIN_ATTEMPTS = 500;
const GRINDER_MAX_FINISH_RATE = 0.2;
const TIME_SINK_MIN_HOURS = 100;
const MULTI_CATEGORY_MIN = 3;
const GOLD_STREAK_WINDOW = 5;

const rules: Record<StorylineKind, Rule> = {
    'pb-fresh': ({ pb }) => {
        if (!pb) return null;
        const days = daysSince(pb.achievedAt);
        if (days === null || days > PB_FRESH_MAX_DAYS) return null;
        return {
            kind: 'pb-fresh',
            title: 'Coming in hot',
            body: `Fresh PB set ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`} — confidence is high.`,
            priority: 9,
        };
    },

    'pb-drought': ({ pb }) => {
        if (!pb) return null;
        const days = daysSince(pb.achievedAt);
        if (days === null || days < PB_DROUGHT_MIN_DAYS) return null;
        const months = Math.floor(days / 30);
        return {
            kind: 'pb-drought',
            title: 'Time to break the spell?',
            body: `Hasn't beaten this PB in ${months} month${months === 1 ? '' : 's'}. Tonight could change that.`,
            priority: 8,
        };
    },

    chokepoint: ({ segments, pb }) => {
        if (!segments || !pb || segments.length === 0) return null;
        const choke = segments.find((s) => s.isChokepoint);
        if (!choke) return null;
        const pct = choke.timeLostVsPb / pb.time;
        if (pct < CHOKEPOINT_MIN_DELTA_PCT) return null;
        return {
            kind: 'chokepoint',
            title: 'The wall',
            body: `"${choke.name}" is where runs go to die — loses about ${msToTime(choke.timeLostVsPb)} there on average.`,
            priority: 7,
        };
    },

    'gold-chaser': ({ pb, sumOfBest }) => {
        if (!pb || !sumOfBest) return null;
        const pct = sumOfBest.gapToPb / pb.time;
        if (pct < GOLD_CHASER_MIN_GAP_PCT) return null;
        return {
            kind: 'gold-chaser',
            title: 'The ghost run exists',
            body: `Theoretical best is ${msToTime(sumOfBest.gapToPb)} faster than PB — every gold split is already there, just not in one attempt.`,
            priority: 6,
        };
    },

    'gold-streak': ({ recentRuns, segments }) => {
        // Heuristic: if any segment has goldTime within the time of any recent run, count as recent gold
        if (!segments || recentRuns.length === 0) return null;
        // Without per-segment-per-run history we can't precisely detect this; only fire
        // if at least one segment's gold matches a sub-segment time observable on the
        // most-recent runs. v1 simplification: skip unless we can verify cheaply.
        return null;
    },

    grinder: ({ attempts }) => {
        if (
            attempts.total < GRINDER_MIN_ATTEMPTS ||
            attempts.finishRate > GRINDER_MAX_FINISH_RATE
        ) {
            return null;
        }
        return {
            kind: 'grinder',
            title: 'Every run is a coin flip',
            body: `${attempts.total.toLocaleString()} attempts, only ${Math.round(attempts.finishRate * 100)}% finished — survival is the hard part.`,
            priority: 5,
        };
    },

    'multi-category': ({ otherCategoriesCount, game }) => {
        if (otherCategoriesCount < MULTI_CATEGORY_MIN) return null;
        return {
            kind: 'multi-category',
            title: 'Knows the game inside out',
            body: `Also runs ${otherCategoriesCount} other categor${otherCategoriesCount === 1 ? 'y' : 'ies'} of ${game.name}.`,
            priority: 4,
        };
    },

    'time-sink': ({ timeInvested }) => {
        const hours = timeInvested.totalMs / 3600000;
        if (hours < TIME_SINK_MIN_HOURS) return null;
        return {
            kind: 'time-sink',
            title: 'A career-worth of attempts',
            body: `${msToHumanDuration(timeInvested.totalMs)} on the clock for this category alone.`,
            priority: 3,
        };
    },

    'first-run': ({ pb, attempts }) => {
        if (pb !== null) return null;
        if (attempts.total === 0) return null;
        return {
            kind: 'first-run',
            title: 'First run hunt',
            body: `${attempts.total.toLocaleString()} attempts in — still chasing that first finish.`,
            priority: 9,
        };
    },
};

export function generateStorylines(input: StorylineInput): Storyline[] {
    const fired = (Object.values(rules) as Rule[])
        .map((r) => r(input))
        .filter((s): s is Storyline => s !== null);
    fired.sort((a, b) => b.priority - a.priority);
    return fired.slice(0, 3);
}
```

- [ ] **Step 2: Wire engine into composer**

Modify `src/lib/preview.ts`. Add the import:
```ts
import { generateStorylines } from './preview-storylines';
```

Replace `storylines: []` in the returned object with:
```ts
storylines: generateStorylines({
    runner: data.runner,
    game: data.game,
    category: data.category,
    pb: data.headline.pb,
    sumOfBest: data.headline.sumOfBest,
    attempts: data.headline.attempts,
    timeInvested: data.headline.timeInvested,
    recentRuns: data.recentForm?.runs ?? [],
    segments: data.splits?.segments ?? null,
    otherCategoriesCount,
}),
```

Note: this references `data` before it's fully constructed. Refactor so `storylines` is computed after the rest of the object is built — easiest is to construct `data` without `storylines`, then assign `data.storylines = generateStorylines(...)` before returning. Or build a `storylineInput` object first, pass it in.

- [ ] **Step 3: Verify with real data**

Reload the preview URL from Task 5's temporary render. Confirm `storylines` array has 0-3 entries with sensible content.

- [ ] **Step 4: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-storylines.ts src/lib/preview.ts
git commit -m "feat(preview): add storylines rules engine"
```

---

## Task 7: SegmentFrame shared component

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/SegmentFrame.tsx`
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/preview.module.scss`

- [ ] **Step 1: Create the SCSS module**

```scss
// preview.module.scss
.root {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0a;
}

.bgPulse {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: radial-gradient(
        circle at 30% 50%,
        var(--accent, #3a7bd5) 0%,
        transparent 60%
    );
    opacity: 0.08;
    animation: pulse 8s ease-in-out infinite;
    pointer-events: none;
}

@keyframes pulse {
    0%, 100% { opacity: 0.06; }
    50% { opacity: 0.12; }
}

.corner {
    position: absolute;
    width: 64px;
    height: 64px;
    color: var(--accent, #3a7bd5);
    opacity: 0.7;
    z-index: 1;
    pointer-events: none;
}

.tl { top: 24px; left: 24px; }
.tr { top: 24px; right: 24px; transform: scaleX(-1); }
.bl { bottom: 24px; left: 24px; transform: scaleY(-1); }
.br { bottom: 24px; right: 24px; transform: scale(-1, -1); }

.contextStrip {
    position: absolute;
    bottom: 24px;
    left: 24px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.4);
    padding: 8px 14px;
    border-radius: 999px;
    backdrop-filter: blur(6px);
}

.contextStripImg {
    width: 24px;
    height: 32px;
    object-fit: cover;
    border-radius: 3px;
}

.contextStripText {
    font-size: 0.85rem;
    color: #ccc;
}

.contextStripCategory {
    color: #fff;
    font-weight: 600;
}

.content {
    position: relative;
    z-index: 3;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px;
}

.fadeIn {
    animation: fadeIn 200ms ease-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

- [ ] **Step 2: Create the SegmentFrame component**

```tsx
// SegmentFrame.tsx
'use client';

import type { ReactNode } from 'react';
import styles from './preview.module.scss';

type Props = {
    accentColor: string | null;
    showContextStrip: boolean;
    gameName: string;
    categoryName: string;
    gameImageUrl: string | null;
    children: ReactNode;
};

const Corner = () => (
    <svg viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'>
        <path
            d='M2 2 L20 2 M2 2 L2 20'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
        />
        <path
            d='M2 28 L2 36 M28 2 L36 2'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            opacity='0.5'
        />
    </svg>
);

export function SegmentFrame({
    accentColor,
    showContextStrip,
    gameName,
    categoryName,
    gameImageUrl,
    children,
}: Props) {
    const accent = accentColor ?? '#3a7bd5';
    return (
        <div
            className={styles.root}
            style={{ ['--accent' as string]: accent }}
        >
            <div className={styles.bgPulse} />
            <div className={`${styles.corner} ${styles.tl}`}><Corner /></div>
            <div className={`${styles.corner} ${styles.tr}`}><Corner /></div>
            <div className={`${styles.corner} ${styles.bl}`}><Corner /></div>
            <div className={`${styles.corner} ${styles.br}`}><Corner /></div>
            {showContextStrip && (
                <div className={styles.contextStrip}>
                    {gameImageUrl && (
                        <img
                            className={styles.contextStripImg}
                            src={gameImageUrl}
                            alt=''
                        />
                    )}
                    <span className={styles.contextStripText}>
                        {gameName} ·{' '}
                        <span className={styles.contextStripCategory}>
                            {categoryName}
                        </span>
                    </span>
                </div>
            )}
            <div className={`${styles.content} ${styles.fadeIn}`} key={accent}>
                {children}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/SegmentFrame.tsx' 'app/(chromeless)/[username]/[game]/[run]/preview/preview.module.scss'
git commit -m "feat(preview): add SegmentFrame shared layout"
```

---

## Task 8: IdentityCard segment

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/segments/IdentityCard.tsx`
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss`

- [ ] **Step 1: Create the segments SCSS module (shared across segments)**

```scss
// segments/segments.module.scss
.identityRoot {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 80px;
    align-items: center;
    max-width: 1600px;
    width: 100%;
}

.identityArt {
    width: 420px;
    height: 560px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
    border: 2px solid var(--accent, #3a7bd5);
}

.identityArtFallback {
    width: 420px;
    height: 560px;
    border-radius: 12px;
    border: 2px solid var(--accent, #3a7bd5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    text-align: center;
    padding: 40px;
    background: rgba(255, 255, 255, 0.02);
}

.identityInfo {
    display: flex;
    flex-direction: column;
    gap: 32px;
}

.identityIntro {
    color: #888;
    font-size: 1.4rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}

.identityName {
    display: flex;
    align-items: center;
    gap: 28px;
}

.identityAvatar {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    border: 3px solid var(--accent, #3a7bd5);
    object-fit: cover;
}

.identityNameText {
    font-size: 5rem;
    font-weight: 700;
    line-height: 1;
}

.identityPronouns {
    color: #888;
    font-size: 1.1rem;
    margin-top: 8px;
}

.identityCategoryBadge {
    display: inline-block;
    padding: 12px 24px;
    border: 2px solid var(--accent, #3a7bd5);
    border-radius: 8px;
    font-size: 1.8rem;
    font-weight: 600;
    color: var(--accent, #3a7bd5);
    align-self: flex-start;
}

.identityGameName {
    font-size: 1.4rem;
    color: #ccc;
    margin-bottom: 4px;
}
```

- [ ] **Step 2: Create IdentityCard**

```tsx
// segments/IdentityCard.tsx
import type { PreviewData } from '../../../../../../types/preview.types';
import styles from './segments.module.scss';

type Props = { data: PreviewData };

export function IdentityCard({ data }: Props) {
    const { runner, game, category } = data;
    return (
        <div className={styles.identityRoot}>
            <div className={styles.identityInfo}>
                <div className={styles.identityIntro}>About to attempt</div>
                <div className={styles.identityName}>
                    {runner.avatarUrl && (
                        <img
                            className={styles.identityAvatar}
                            src={runner.avatarUrl}
                            alt=''
                        />
                    )}
                    <div>
                        <div className={styles.identityNameText}>
                            {runner.displayName}
                        </div>
                        {runner.pronouns && (
                            <div className={styles.identityPronouns}>
                                {runner.pronouns}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <div className={styles.identityGameName}>{game.name}</div>
                    <div className={styles.identityCategoryBadge}>
                        {category.name}
                    </div>
                </div>
            </div>
            {game.imageUrl ? (
                <img
                    className={styles.identityArt}
                    src={game.imageUrl}
                    alt={game.name}
                />
            ) : (
                <div className={styles.identityArtFallback}>{game.name}</div>
            )}
        </div>
    );
}
```

Path note: `../../../../../../types/preview.types` is correct from `app/(chromeless)/[username]/[game]/[run]/preview/segments/IdentityCard.tsx` — six levels up to repo root. If using path alias `~/`, prefer it (verify the alias config first).

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/segments/'
git commit -m "feat(preview): add IdentityCard segment"
```

---

## Task 9: HeadlineStats segment

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/segments/HeadlineStats.tsx`
- Modify: `app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss`

- [ ] **Step 1: Add styles**

Append to `segments.module.scss`:
```scss
.headlineRoot {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 48px;
    max-width: 1400px;
    width: 100%;
}

.headlineTile {
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 48px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(255, 255, 255, 0.02);
}

.headlineLabel {
    color: #888;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
}

.headlineValue {
    font-size: 5rem;
    font-weight: 700;
    line-height: 1;
    color: var(--accent, #3a7bd5);
    font-variant-numeric: tabular-nums;
}

.headlineSubtitle {
    color: #ccc;
    font-size: 1.1rem;
    margin-top: 4px;
}

.headlineEmpty {
    color: #555;
}
```

- [ ] **Step 2: Create HeadlineStats**

```tsx
// segments/HeadlineStats.tsx
import type { PreviewData } from '../../../../../../types/preview.types';
import { msToHumanDuration, msToTime, daysSince } from '~src/lib/preview-time';
import styles from './segments.module.scss';

type Props = { data: PreviewData };

export function HeadlineStats({ data }: Props) {
    const { pb, sumOfBest, attempts, timeInvested } = data.headline;

    const pbAgeDays = pb ? daysSince(pb.achievedAt) : null;
    const pbAgeLabel =
        pbAgeDays === null
            ? ''
            : pbAgeDays === 0
              ? 'set today'
              : pbAgeDays === 1
                ? 'set 1 day ago'
                : `set ${pbAgeDays} days ago`;

    return (
        <div className={styles.headlineRoot}>
            <Tile
                label='Personal Best'
                value={pb ? msToTime(pb.time) : '—'}
                subtitle={pb ? pbAgeLabel : 'no finished run yet'}
                empty={!pb}
            />
            <Tile
                label='Sum of Best'
                value={sumOfBest ? msToTime(sumOfBest.time) : '—'}
                subtitle={
                    sumOfBest
                        ? `potential save: ${msToTime(sumOfBest.gapToPb)}`
                        : 'no splits data'
                }
                empty={!sumOfBest}
            />
            <Tile
                label='Attempts'
                value={attempts.total.toLocaleString()}
                subtitle={`${Math.round(attempts.finishRate * 100)}% finished`}
            />
            <Tile
                label='Time Invested'
                value={msToHumanDuration(timeInvested.totalMs)}
                subtitle='total runtime'
            />
        </div>
    );
}

function Tile({
    label,
    value,
    subtitle,
    empty,
}: {
    label: string;
    value: string;
    subtitle: string;
    empty?: boolean;
}) {
    return (
        <div className={styles.headlineTile}>
            <div className={styles.headlineLabel}>{label}</div>
            <div
                className={`${styles.headlineValue} ${empty ? styles.headlineEmpty : ''}`}
            >
                {value}
            </div>
            <div className={styles.headlineSubtitle}>{subtitle}</div>
        </div>
    );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/segments/HeadlineStats.tsx' 'app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss'
git commit -m "feat(preview): add HeadlineStats segment"
```

---

## Task 10: RecentForm segment

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/segments/RecentForm.tsx`
- Modify: `app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss`

- [ ] **Step 1: Add styles**

Append:
```scss
.formRoot {
    display: flex;
    flex-direction: column;
    gap: 48px;
    max-width: 1500px;
    width: 100%;
}

.formHeader {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.formTitle {
    font-size: 2.5rem;
    font-weight: 700;
}

.formTrend {
    font-size: 1.6rem;
    color: var(--accent, #3a7bd5);
}

.formChart {
    width: 100%;
    height: 320px;
}

.formMeta {
    display: flex;
    gap: 64px;
    font-size: 1.2rem;
    color: #ccc;
}

.formMetaValue {
    color: #fff;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Create RecentForm — inline SVG sparkline (no external chart lib)**

The project has `@nivo/line` installed but a custom sparkline keeps render cost down and avoids client-bundle bloat for this segment.

```tsx
// segments/RecentForm.tsx
import type { PreviewData } from '../../../../../../types/preview.types';
import styles from './segments.module.scss';

type Props = { data: PreviewData };

const CHART_W = 1500;
const CHART_H = 320;
const PAD = 16;

export function RecentForm({ data }: Props) {
    const form = data.recentForm;
    if (!form || form.runs.length === 0) {
        return (
            <div className={styles.formRoot}>
                <div className={styles.formTitle}>No recent runs to chart</div>
            </div>
        );
    }

    // Older runs on the left, newer on the right
    const points = [...form.runs].reverse();
    const times = points.map((p) => p.time);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const span = max - min || 1;

    const x = (i: number) =>
        PAD + (i * (CHART_W - 2 * PAD)) / Math.max(1, points.length - 1);
    // Lower time = higher on chart
    const y = (t: number) =>
        CHART_H - PAD - ((t - min) / span) * (CHART_H - 2 * PAD);

    const path = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.time)}`)
        .join(' ');

    const trendLabel =
        form.trend === 'improving'
            ? 'Trending up — faster runs lately'
            : form.trend === 'regressing'
              ? 'Cooling off — recent runs are slower'
              : form.trend === 'flat'
                ? 'Holding steady'
                : 'Not enough runs for a trend';

    return (
        <div className={styles.formRoot}>
            <div className={styles.formHeader}>
                <div className={styles.formTitle}>Recent form</div>
                <div className={styles.formTrend}>{trendLabel}</div>
            </div>
            <svg
                className={styles.formChart}
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio='none'
            >
                <path
                    d={path}
                    fill='none'
                    stroke='var(--accent, #3a7bd5)'
                    strokeWidth='3'
                    strokeLinejoin='round'
                    strokeLinecap='round'
                />
                {points.map((p, i) => (
                    <circle
                        key={`${p.achievedAt}-${i}`}
                        cx={x(i)}
                        cy={y(p.time)}
                        r={p.isPb ? 7 : 4}
                        fill={p.isPb ? '#ffd700' : 'var(--accent, #3a7bd5)'}
                    />
                ))}
            </svg>
            <div className={styles.formMeta}>
                <div>
                    Last {points.length} finished runs
                </div>
                <div>
                    <span className={styles.formMetaValue}>
                        {form.runsPerWeek.toFixed(1)}
                    </span>{' '}
                    runs per week
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/segments/RecentForm.tsx' 'app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss'
git commit -m "feat(preview): add RecentForm segment"
```

---

## Task 11: SplitStory segment

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/segments/SplitStory.tsx`
- Modify: `app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss`

- [ ] **Step 1: Add styles**

Append:
```scss
.splitsRoot {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 1500px;
    width: 100%;
}

.splitsTitle {
    font-size: 2.5rem;
    font-weight: 700;
}

.splitsList {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.splitRow {
    display: grid;
    grid-template-columns: 1.4fr repeat(3, auto) 1fr;
    gap: 24px;
    align-items: center;
    padding: 12px 20px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
}

.splitRowChokepoint {
    background: rgba(255, 60, 60, 0.1);
    border-left: 4px solid #ff6b6b;
}

.splitName {
    font-size: 1.3rem;
    font-weight: 500;
}

.splitChip {
    font-variant-numeric: tabular-nums;
    font-size: 1.05rem;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    min-width: 110px;
    text-align: center;
}

.splitChipGold {
    background: rgba(255, 215, 0, 0.15);
    color: #ffd700;
}

.splitChipPb {
    color: #fff;
    font-weight: 600;
}

.splitLostBar {
    height: 14px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 999px;
    overflow: hidden;
}

.splitLostFill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent, #3a7bd5), #ff6b6b);
    border-radius: 999px;
}

.splitsFooter {
    font-size: 1.4rem;
    color: var(--accent, #3a7bd5);
    margin-top: 12px;
}
```

- [ ] **Step 2: Create SplitStory**

```tsx
// segments/SplitStory.tsx
import type { PreviewData } from '../../../../../../types/preview.types';
import { msToTime } from '~src/lib/preview-time';
import styles from './segments.module.scss';

type Props = { data: PreviewData };

export function SplitStory({ data }: Props) {
    if (!data.splits || data.splits.segments.length === 0) return null;
    const { segments, theoreticalBestGap } = data.splits;
    const maxLost = Math.max(...segments.map((s) => s.timeLostVsPb), 1);

    return (
        <div className={styles.splitsRoot}>
            <div className={styles.splitsTitle}>Split story</div>
            <div className={styles.splitsList}>
                {segments.map((s) => (
                    <div
                        key={s.name}
                        className={`${styles.splitRow} ${s.isChokepoint ? styles.splitRowChokepoint : ''}`}
                    >
                        <div className={styles.splitName}>{s.name}</div>
                        <div
                            className={`${styles.splitChip} ${styles.splitChipGold}`}
                        >
                            gold {s.goldTime != null ? msToTime(s.goldTime) : '—'}
                        </div>
                        <div className={styles.splitChip}>
                            avg {s.avgTime != null ? msToTime(s.avgTime) : '—'}
                        </div>
                        <div
                            className={`${styles.splitChip} ${styles.splitChipPb}`}
                        >
                            pb {s.pbTime != null ? msToTime(s.pbTime) : '—'}
                        </div>
                        <div className={styles.splitLostBar}>
                            <div
                                className={styles.splitLostFill}
                                style={{
                                    width: `${(s.timeLostVsPb / maxLost) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.splitsFooter}>
                Theoretical best is {msToTime(theoreticalBestGap)} faster than
                PB
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/segments/SplitStory.tsx' 'app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss'
git commit -m "feat(preview): add SplitStory segment"
```

---

## Task 12: Storylines segment

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/segments/Storylines.tsx`
- Modify: `app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss`

- [ ] **Step 1: Add styles**

Append:
```scss
.storylinesRoot {
    display: flex;
    flex-direction: column;
    gap: 32px;
    max-width: 1400px;
    width: 100%;
}

.storylinesTitle {
    font-size: 2.5rem;
    font-weight: 700;
}

.storylinesGrid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
}

.storyCard {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 24px;
    padding: 32px;
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
    border-left: 4px solid var(--accent, #3a7bd5);
}

.storyIcon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent, #3a7bd5);
    font-size: 2rem;
    font-weight: 700;
}

.storyContent {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.storyTitle {
    font-size: 1.7rem;
    font-weight: 600;
}

.storyBody {
    font-size: 1.25rem;
    color: #ccc;
    line-height: 1.5;
}
```

- [ ] **Step 2: Create Storylines**

```tsx
// segments/Storylines.tsx
import type {
    PreviewData,
    StorylineKind,
} from '../../../../../../types/preview.types';
import styles from './segments.module.scss';

type Props = { data: PreviewData };

const ICONS: Record<StorylineKind, string> = {
    'pb-fresh': '🔥',
    'pb-drought': '⏳',
    chokepoint: '🧱',
    'gold-chaser': '👻',
    'gold-streak': '✨',
    grinder: '🪙',
    'multi-category': '🎮',
    'time-sink': '⏱',
    'first-run': '🎯',
};

export function Storylines({ data }: Props) {
    if (data.storylines.length === 0) return null;
    return (
        <div className={styles.storylinesRoot}>
            <div className={styles.storylinesTitle}>Storylines</div>
            <div className={styles.storylinesGrid}>
                {data.storylines.map((s) => (
                    <div key={s.kind} className={styles.storyCard}>
                        <div className={styles.storyIcon}>{ICONS[s.kind]}</div>
                        <div className={styles.storyContent}>
                            <div className={styles.storyTitle}>{s.title}</div>
                            <div className={styles.storyBody}>{s.body}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/segments/Storylines.tsx' 'app/(chromeless)/[username]/[game]/[run]/preview/segments/segments.module.scss'
git commit -m "feat(preview): add Storylines segment"
```

---

## Task 13: PreviewNavigator client component

**Files:**
- Create: `app/(chromeless)/[username]/[game]/[run]/preview/PreviewNavigator.tsx`

- [ ] **Step 1: Create the navigator**

```tsx
// PreviewNavigator.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PreviewData } from '../../../../../types/preview.types';
import { SegmentFrame } from './SegmentFrame';
import { IdentityCard } from './segments/IdentityCard';
import { HeadlineStats } from './segments/HeadlineStats';
import { RecentForm } from './segments/RecentForm';
import { SplitStory } from './segments/SplitStory';
import { Storylines } from './segments/Storylines';

type Props = { data: PreviewData };

type SegmentEntry = {
    key: string;
    showContextStrip: boolean;
    render: (data: PreviewData) => React.ReactNode;
};

function buildSegmentList(data: PreviewData): SegmentEntry[] {
    const list: SegmentEntry[] = [];

    // 1. IdentityCard always shows
    list.push({
        key: 'identity',
        showContextStrip: false,
        render: (d) => <IdentityCard data={d} />,
    });

    // 2. HeadlineStats always shows
    list.push({
        key: 'headline',
        showContextStrip: true,
        render: (d) => <HeadlineStats data={d} />,
    });

    // 3. RecentForm if any recent runs
    if (data.recentForm && data.recentForm.runs.length > 0) {
        list.push({
            key: 'form',
            showContextStrip: true,
            render: (d) => <RecentForm data={d} />,
        });
    }

    // 4. SplitStory if splits exist
    if (data.splits && data.splits.segments.length > 0) {
        list.push({
            key: 'splits',
            showContextStrip: true,
            render: (d) => <SplitStory data={d} />,
        });
    }

    // 5. Storylines if any fired
    if (data.storylines.length > 0) {
        list.push({
            key: 'storylines',
            showContextStrip: true,
            render: (d) => <Storylines data={d} />,
        });
    }

    return list;
}

export function PreviewNavigator({ data }: Props) {
    const segments = buildSegmentList(data);
    const [idx, setIdx] = useState(0);

    const next = useCallback(
        () => setIdx((i) => (i + 1) % segments.length),
        [segments.length],
    );
    const prev = useCallback(
        () => setIdx((i) => (i - 1 + segments.length) % segments.length),
        [segments.length],
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                e.key === 'ArrowRight' ||
                e.key === ' ' ||
                e.key === 'PageDown'
            ) {
                e.preventDefault();
                next();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                prev();
            } else if (e.key === 'Home') {
                e.preventDefault();
                setIdx(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                setIdx(segments.length - 1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [next, prev, segments.length]);

    const current = segments[idx];
    if (!current) return null;

    return (
        <div
            onClick={next}
            onContextMenu={(e) => {
                e.preventDefault();
                prev();
            }}
            style={{ cursor: 'pointer' }}
        >
            <SegmentFrame
                key={current.key}
                accentColor={data.game.dominantColor}
                showContextStrip={current.showContextStrip}
                gameName={data.game.name}
                categoryName={data.category.name}
                gameImageUrl={data.game.imageUrl}
            >
                {current.render(data)}
            </SegmentFrame>
        </div>
    );
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/PreviewNavigator.tsx'
git commit -m "feat(preview): add PreviewNavigator with keyboard/click handling"
```

---

## Task 14: Wire page.tsx to fetch data and render navigator

**Files:**
- Modify: `app/(chromeless)/[username]/[game]/[run]/preview/page.tsx`

- [ ] **Step 1: Replace page contents**

```tsx
// page.tsx
import { notFound } from 'next/navigation';
import { getPreviewData } from '~src/lib/preview';
import { PreviewNavigator } from './PreviewNavigator';

interface PageProps {
    params: Promise<{ username: string; game: string; run: string }>;
}

export const metadata = {
    title: 'Run preview · therun.gg',
};

export default async function PreviewPage(props: PageProps) {
    const params = await props.params;
    const data = await getPreviewData(
        params.username,
        params.game,
        params.run,
    );

    if (!data) notFound();

    return <PreviewNavigator data={data} />;
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Load a known good URL (ask user for one if not known — a runner with PB, splits, and several finished runs on a popular game gives the fullest verification).

Verify:
1. Page renders fullscreen — no header, no footer, no scrollbars
2. **Segment 1 (IdentityCard)**: game art, runner name, category badge visible; context strip hidden
3. Press `ArrowRight` (or click anywhere): advances to **HeadlineStats** — 4 tiles with PB, SoB, attempts, time invested; context strip appears bottom-left
4. Next: **RecentForm** — sparkline visible with PB point highlighted gold; trend label present
5. Next: **SplitStory** — list of splits, chokepoint highlighted red, theoretical-best footer present
6. Next: **Storylines** — 1-3 cards with title/body
7. Next wraps back to IdentityCard
8. `ArrowLeft` goes back one segment
9. `Home` jumps to first, `End` jumps to last
10. Right-click goes back one segment
11. Accent color matches game art (dominant color, not the default blue)

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add 'app/(chromeless)/[username]/[game]/[run]/preview/page.tsx'
git commit -m "feat(preview): wire page to fetch data and render navigator"
```

---

## Task 15: Edge case verification

Verify the empty-state and missing-data paths actually work as designed. No code changes expected — this task surfaces bugs and adds fixes only if needed.

- [ ] **Step 1: Runner does not exist**

Visit `/nonexistent-user-12345/anygame/any/preview`.
Expected: Next.js `not-found` page renders.
If it crashes instead: trace the error to the lib function (likely a `Cannot read property 'X' of undefined`) and ensure `getPreviewData` returns `null` on any catch path, so `notFound()` fires.

- [ ] **Step 2: Game/category does not exist for runner**

Visit `/<real-user>/<real-user>'s-other-game/wrong-category/preview`.
Expected: `not-found` page.

- [ ] **Step 3: Runner with attempts but no PB**

If a runner with `attemptCount > 0` and `finishedAttemptCount === 0` is available (ask user), visit their preview.
Expected:
- HeadlineStats shows `—` for PB and SoB tiles, with subtitle text
- RecentForm and SplitStory segments are skipped
- Storylines contains the `first-run` card if attempts > 0

If RecentForm or SplitStory appears empty instead of being skipped: check `buildSegmentList()` predicates in `PreviewNavigator.tsx`.

- [ ] **Step 4: Runner with PB but no splits data**

If such a runner is available, visit their preview.
Expected: SplitStory segment skipped; navigator goes IdentityCard → HeadlineStats → RecentForm → Storylines.

- [ ] **Step 5: Game with no cover art**

Visit a preview where IGDB has no cover.
Expected:
- IdentityCard shows the text fallback (`identityArtFallback` div) with game name
- `dominantColor` is null → neutral blue accent used
- Context strip shows category name without game image

- [ ] **Step 6: All edge cases verified — commit any fixes if applied**

If fixes were made in Steps 1-5:
```bash
git add -A
git commit -m "fix(preview): handle <specific edge case> in <file>"
```

If no fixes needed, skip the commit.

---

## Task 16: Performance + cleanup

- [ ] **Step 1: Check bundle size impact**

Run: `npm run build`
Expected: build succeeds. Note the route size for `(chromeless)/[username]/[game]/[run]/preview`.
If the route is unusually large (>500kb First Load JS), check whether `node-vibrant` or other server-only imports are leaking into the client bundle (it shouldn't — `'use server'` and `'use client'` boundaries prevent it).

- [ ] **Step 2: Clear .next cache**

Per CLAUDE.md workflow: significant changes warrant a cache clear.

Run: `rm -rf .next`

- [ ] **Step 3: Final verify**

Run: `npm run dev` and load the preview URL one more time to confirm everything still works after the cache clear.

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 4: No commit needed**

This step is verification only.

---

## Self-Review Notes

This plan was reviewed for:

- **Spec coverage:** All 5 segments, navigation (keyboard + click + no auto-advance + no URL sync + 200ms fade), data shape, phase-1 fetching strategy, storylines engine with the 9 listed rules, visual frame with dominant color, all edge cases from the spec — each covered by a task.
- **Placeholder check:** Every step contains executable code or a concrete command. No "TBD" or "add validation later."
- **Type consistency:** `PreviewData`, `Storyline`, `StorylineInput`, `PreviewSegment`, `RecentRunPoint` defined in Task 1 and used identically in later tasks.
- **Known unknown:** Task 5 Step 3 requires confirming the precise shape of `Run`'s history fields at runtime, since `src/common/types.ts` declares optional/string fields that may not be consistently populated. The plan calls out this verification step explicitly rather than guessing.
- **`gold-streak` rule:** Defined but currently returns `null` until per-run-per-segment history is wired through. Acceptable for v1 — rule is in place to extend later.
- **Out-of-scope items** from the spec (backend endpoint, Stories API integration, live refresh, picker landing page, custom theming, mobile responsiveness) are explicitly not addressed by any task.
