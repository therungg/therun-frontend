# fast50 Presenter Stats Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A chromeless, presenter-driven fullscreen "stat deck" screen (pre-run and post-run slides) for the fast50 pitch, composed automatically from a runner's therun.gg data.

**Architecture:** A server-assembled `RunnerDossier` (fan-out over existing endpoints, `Promise.allSettled`) feeds pure slide components. A pure `composeDeck()` picks the most remarkable slides via per-slide `evaluate()` scores. A client capture layer records live-run snapshots to localStorage for reliable post-run data. New route group `app/(fast50)/` renders without site chrome.

**Tech Stack:** Next.js 16 App Router (`'use cache'`), React 19 + React Compiler, SCSS modules, hand-rolled SVG charts, GSAP (`@gsap/react`) + `react-countup` for motion, vitest (new devDep) for pure-logic tests.

**Spec:** `docs/superpowers/specs/2026-07-08-fast50-stats-panel-design.md` — read it first.

## Global Constraints

- Branch: create feature branch `fast50-stats-screen` in the main repo. **No worktrees. Never create a PR** — push the branch only; the user opens PRs.
- Biome formatting: 4-space indent, single quotes, trailing commas, semicolons. Pre-commit hook runs biome automatically. Unused vars must be prefixed `_`.
- Path aliases: `~src/*` → `src/*`, `~app/*` → `app/*`.
- Server data fetching: `'use cache'` + `cacheLife()` from `next/cache`. Never `{ next: { revalidate } }`.
- All times in the dossier are **milliseconds as `number`** (`null` when unknown). Backend `Run`/history JSON times are ms-as-strings — convert at the boundary with `toMs()`.
- Game images are IGDB 3:4 portrait; use the existing `GameImage` component (`src/components/image/gameimage.tsx`).
- New runtime dependencies: **none**. New devDependency: `vitest` only.
- Verification commands: `npm run test` (after Task 1), `npm run typecheck`, `npm run lint`.
- UI tasks (9–13): load the `frontend-design:frontend-design` skill before styling work. Target is 1920×1080 broadcast-dark; one huge stat or one chart per slide.

## File Map

| File | Responsibility |
|---|---|
| `vitest.config.ts` | test runner config (aliases) |
| `src/lib/fast50/dossier.types.ts` | all shared dossier/deck types (plain types, client+server+test safe) |
| `src/lib/fast50/compute.ts` | pure: history JSON → splits/runs stats, forecast bands, roadmap, danger split, percentiles |
| `src/lib/fast50/fixtures.ts` | fixture dossiers: grinder / prodigy / sparse |
| `src/lib/fast50/dossier.ts` | server: fan-out fetch + normalize into `RunnerDossier` |
| `src/lib/fast50/post-run.ts` | pure: post-run tier resolution (capture → live → history) |
| `src/components/fast50/capture/capture-store.ts` | pure localStorage (de)serialization for captured `LiveRun`s |
| `src/components/fast50/capture/use-run-capture.ts` | client hook: websocket subscribe → persist snapshots |
| `src/components/fast50/deck/deck-state.ts` | pure reducer: slide/stage state machine |
| `src/components/fast50/deck/evaluators.ts` | pure per-slide `evaluate(dossier)` functions |
| `src/components/fast50/deck/compose-deck.ts` | pure composer: anchors + top-N by score + overflow |
| `src/components/fast50/deck/deck.tsx` | client controller: keyboard, stages, blackout, renders slides |
| `src/components/fast50/deck/primitives.tsx` | `SlideShell`, `BigNumber`, `Reveal`, SVG chart primitives |
| `src/components/fast50/deck/fast50.module.scss` | design tokens + slide/primitive styles |
| `src/components/fast50/slides/*.tsx` | one file per slide component |
| `app/(fast50)/layout.tsx` | chromeless route-group layout, forced dark |
| `app/(fast50)/fast50/screen/page.tsx` + `picker.tsx` | backstage picker + capture arming |
| `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx` | deck page (server: dossier → client deck) |
| `app/(fast50)/fast50/screen/demo/page.tsx` | fixture deck cycler (rehearsal/pitch tool) |

Existing code consumed (verified signatures):

- `getRun(username, game, run)` → `Promise<Run>` — `src/lib/get-run.ts` (`run` param = category)
- `getUserRuns(username)` → `Promise<Run[]>` — `src/lib/get-user-runs.ts`
- `getSplitsHistoryUrl(filename, hasGameTime)` → CloudFront URL — `src/components/run/get-splits-history.ts`; response JSON is `{ runs: RunHistory[]; splits: SplitsHistory[]; sessions: RunSession[] }` (`History` in `src/common/types.ts`)
- `getGlobalUser(user)` — `src/lib/get-global-user.ts` (profile: picture, country, pronouns)
- `getAdvancedUserStats(user, timezone)` — `src/lib/get-advanced-user-stats.ts` (`PlaytimeStats`: `playtimePerDayMap` etc.)
- `getLiveRunForUser(username)` — `src/lib/live-runs.ts` (returns `LiveRun | undefined`)
- `apiFetch<T>(path)` — `src/lib/api-client.ts` (unwraps `json.result`, throws `ApiError`)
- `useLiveRunsWebsocket<WebsocketLiveRunMessage>(username)` — `src/components/websocket/use-reconnect-websocket.ts`
- `LiveRun`, `Split`, `WebsocketLiveRunMessage` — `app/(new-layout)/live/live.types.ts`
- `formatTimeMs`, `formatDelta`, `formatPercent` — `src/components/live/commentary-drawer/format.ts`
- Backend endpoints without frontend fetchers (call via `apiFetch`): `GET /games/{game}/{category}/segments` (community percentiles), `GET /games/{game}/{category}` (category leaderboards), `GET /users/{user}/streaks`, `GET /games/global/{game}` (`{game, display, image}`).

---

### Task 1: Branch + vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script, `vitest` devDep)
- Test: `src/lib/fast50/__tests__/smoke.test.ts` (deleted again in Task 2)

**Interfaces:**
- Produces: `npm run test` runs vitest over `src/**/__tests__/*.test.ts`.

- [ ] **Step 1: Create branch**

```bash
git checkout -b fast50-stats-screen
```

- [ ] **Step 2: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 3: Add config and script**

`vitest.config.ts`:

```typescript
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '~src': path.resolve(__dirname, 'src'),
            '~app': path.resolve(__dirname, 'app'),
        },
    },
    test: {
        include: ['src/**/__tests__/*.test.ts'],
    },
});
```

In `package.json` scripts add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Smoke test proves the runner works**

`src/lib/fast50/__tests__/smoke.test.ts`:

```typescript
import { expect, test } from 'vitest';

test('vitest runs', () => {
    expect(1 + 1).toBe(2);
});
```

Run: `npm run test`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/fast50/__tests__/smoke.test.ts
git commit -m "chore: add vitest for fast50 pure-logic tests"
```

---

### Task 2: Dossier types + core compute (history → splits/runs)

**Files:**
- Create: `src/lib/fast50/dossier.types.ts`, `src/lib/fast50/compute.ts`
- Test: `src/lib/fast50/__tests__/compute.test.ts` (replace smoke test)

**Interfaces:**
- Consumes: `History`, `SplitsHistory`, `RunHistory` from `~src/common/types` (times are ms-as-strings).
- Produces (used by every later task):
  - `toMs(v: string | number | null | undefined): number | null`
  - `buildSplits(history: History): DossierSplit[]`
  - `buildFinishedRuns(history: History): DossierFinishedRun[]`
  - all types below, exported from `dossier.types.ts`.

- [ ] **Step 1: Write `dossier.types.ts`** (types only — no test needed)

```typescript
export type DeckKind = 'pre' | 'post';

export interface DossierRunner {
    username: string;
    picture?: string;
    country?: string;
    pronouns?: string;
}

export interface DossierGame {
    game: string; // raw key, e.g. "Hollow Knight"
    display: string; // display name from global game data
    category: string;
    image?: string; // IGDB image, 3:4 portrait
}

export interface DossierCore {
    pbMs: number | null;
    sobMs: number | null;
    attemptCount: number;
    finishedAttemptCount: number;
    finishRate: number; // 0..1
    categoryPlaytimeMs: number | null;
}

export interface DossierSplit {
    index: number;
    name: string;
    avgSingleMs: number | null;
    avgTotalMs: number | null; // cumulative avg clock at END of this split
    goldMs: number | null; // best-ever single (bestAchievedTime)
    pbSingleMs: number | null;
    pbTotalMs: number | null;
    stdDevMs: number | null;
    attemptsReached: number; // completions of this split (values.length)
    deaths: number; // attempts that died ON this split
    resetShare: number; // deaths / total deaths, 0..1
    completions: number[]; // single times, ms
}

export interface DossierFinishedRun {
    timeMs: number;
    endedAt: string; // ISO
}

export interface DossierCommunitySegment {
    index: number;
    name: string;
    userAvgMs: number | null;
    percentile: number | null; // user is in the top N% (lower = better)
}

export interface DossierCommunity {
    userCount: number;
    segments: DossierCommunitySegment[];
}

export interface DossierLeaderboards {
    pbPlacing: number | null;
    entrants: number | null;
}

export interface DossierForm {
    last14dPlaytimeMs: number | null;
    last14dActiveDays: number | null;
    currentStreakDays: number | null;
}

export interface PostRunSplit {
    index: number;
    name: string;
    singleMs: number | null;
    totalMs: number | null;
    isGold: boolean;
    goldSaveMs: number | null; // vs previous gold, positive = saved
    deltaVsAvgMs: number | null; // negative = faster than average
}

export interface PostRunEvent {
    type: string;
    name: string;
    description: string;
}

export interface PostRun {
    source: 'capture' | 'live' | 'history';
    finalTimeMs: number;
    endedAt: string | null;
    splits: PostRunSplit[];
    goldCount: number;
    events: PostRunEvent[];
}

export interface SourceStatus {
    name: string;
    ok: boolean;
    error?: string;
}

export interface RunnerDossier {
    deck: DeckKind;
    generatedAt: string;
    runner: DossierRunner;
    game: DossierGame;
    core: DossierCore;
    splits: DossierSplit[];
    finishedRuns: DossierFinishedRun[];
    community: DossierCommunity | null;
    leaderboards: DossierLeaderboards | null;
    form: DossierForm | null;
    postRun: PostRun | null;
    sources: SourceStatus[];
}
```

- [ ] **Step 2: Write failing tests for `toMs`, `buildSplits`, `buildFinishedRuns`**

Delete `smoke.test.ts`. Create `src/lib/fast50/__tests__/compute.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import type { History } from '~src/common/types';
import { buildFinishedRuns, buildSplits, toMs } from '../compute';

const splitTimes = (over: Partial<Record<string, string>> = {}) => ({
    time: '60000',
    bestPossibleTime: '50000',
    bestAchievedTime: '55000',
    averageTime: '62000',
    stdDev: '3000',
    alternative: [],
    ...over,
});

export const historyFixture: History = {
    sessions: [],
    runs: [
        {
            splits: [],
            time: '3600000',
            duration: '3700000',
            startedAt: '2026-05-01T18:00:00Z',
            endedAt: '2026-05-01T19:00:00Z',
        },
        {
            splits: [],
            time: '', // reset — not finished
            duration: '600000',
            startedAt: '2026-05-02T18:00:00Z',
            endedAt: '2026-05-02T18:10:00Z',
        },
        {
            splits: [],
            time: '3500000',
            duration: '3600000',
            startedAt: '2026-05-03T18:00:00Z',
            endedAt: '2026-05-03T19:00:00Z',
        },
    ],
    splits: [
        {
            name: 'Forest',
            icon: '',
            single: splitTimes(),
            total: splitTimes(),
            values: [60000, 61000, 62000, 55000], // reached 4x
            valuesTotal: [60000, 61000, 62000, 55000],
        },
        {
            name: 'Water Temple',
            icon: '',
            single: splitTimes({ bestAchievedTime: '110000' }),
            total: splitTimes({ averageTime: '180000' }),
            values: [115000], // reached once → 3 deaths here
            valuesTotal: [175000],
        },
    ],
};

describe('toMs', () => {
    test('parses ms strings', () => expect(toMs('3600000')).toBe(3600000));
    test('passes numbers through', () => expect(toMs(1500)).toBe(1500));
    test('empty/undefined/garbage → null', () => {
        expect(toMs('')).toBeNull();
        expect(toMs(undefined)).toBeNull();
        expect(toMs('abc')).toBeNull();
        expect(toMs('0')).toBeNull(); // 0 means "no time" in this data
    });
});

describe('buildFinishedRuns', () => {
    test('keeps only runs with a time, in order', () => {
        const runs = buildFinishedRuns(historyFixture);
        expect(runs).toHaveLength(2);
        expect(runs[0].timeMs).toBe(3600000);
        expect(runs[1].endedAt).toBe('2026-05-03T19:00:00Z');
    });
});

describe('buildSplits', () => {
    test('maps stats and computes deaths/resetShare', () => {
        const splits = buildSplits(historyFixture);
        expect(splits).toHaveLength(2);
        const [forest, water] = splits;
        expect(forest.goldMs).toBe(55000);
        expect(forest.avgSingleMs).toBe(62000);
        expect(forest.attemptsReached).toBe(4);
        // 4 reached Forest, 1 reached Water Temple → 3 died on Water Temple
        expect(water.deaths).toBe(3);
        expect(water.resetShare).toBe(1); // all deaths happen there
        expect(forest.deaths).toBe(0);
        expect(water.avgTotalMs).toBe(180000);
    });
});
```

Note the fixture is exported — Task 4 reuses it.

- [ ] **Step 3: Run tests, verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../compute'`.

- [ ] **Step 4: Implement `compute.ts` (first part)**

```typescript
import type { History } from '~src/common/types';
import type { DossierFinishedRun, DossierSplit } from './dossier.types';

export const toMs = (
    v: string | number | null | undefined,
): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
};

export const buildFinishedRuns = (history: History): DossierFinishedRun[] =>
    history.runs.flatMap((run) => {
        const timeMs = toMs(run.time);
        if (timeMs === null) return [];
        return [{ timeMs, endedAt: run.endedAt }];
    });

export const buildSplits = (history: History): DossierSplit[] => {
    const reached = history.splits.map((s) => s.values.length);
    // Deaths on split i: attempts that completed split i-1 but not split i.
    // The first split's entry count is unknown from history alone, so
    // deaths[0] = 0 (first-split resets are not attributed).
    const deaths = reached.map((r, i) =>
        i === 0 ? 0 : Math.max(0, reached[i - 1] - r),
    );
    const totalDeaths = deaths.reduce((a, b) => a + b, 0);

    return history.splits.map((s, i) => ({
        index: i,
        name: s.name,
        avgSingleMs: toMs(s.single.averageTime),
        avgTotalMs: toMs(s.total.averageTime),
        goldMs: toMs(s.single.bestAchievedTime),
        pbSingleMs: toMs(s.single.time),
        pbTotalMs: toMs(s.total.time),
        stdDevMs: toMs(s.single.stdDev),
        attemptsReached: reached[i],
        deaths: deaths[i],
        resetShare: totalDeaths === 0 ? 0 : deaths[i] / totalDeaths,
        completions: s.values.filter((v) => v > 0),
    }));
};
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fast50 vitest.config.ts
git commit -m "feat(fast50): dossier types and history-derived split stats"
```

---

### Task 3: Distribution math — forecast bands, run percentile, roadmap, danger split, community percentile

**Files:**
- Modify: `src/lib/fast50/compute.ts`
- Test: `src/lib/fast50/__tests__/distributions.test.ts`

**Interfaces:**
- Produces:
  - `quantile(sortedAsc: number[], q: number): number | null`
  - `forecastBands(runs: DossierFinishedRun[], recent?: number): { p10Ms: number; p50Ms: number; p90Ms: number; sample: number } | null` — quantiles of the most recent `recent` (default 20) finished runs; `null` if fewer than 5.
  - `runPercentile(runs: DossierFinishedRun[], timeMs: number): number | null` — % of finished runs strictly slower ⇒ "top N%" = `100 - value`; `null` if fewer than 10 runs.
  - `runRank(runs: DossierFinishedRun[], timeMs: number): number` — 1-based rank among finished runs.
  - `roadmap(splits: DossierSplit[]): { index: number; name: string; atMs: number }[]` — cumulative avg clock at the END of each split (skips splits without `avgTotalMs`).
  - `dangerSplit(splits: DossierSplit[]): { split: DossierSplit; startsAtMs: number | null; afterName: string | null } | null` — highest `resetShare` with `resetShare >= 0.15` and `deaths >= 5`; `startsAtMs` = previous split's `avgTotalMs`.
  - `communityPercentile(userAvgMs: number, ladder: Record<'p1' | 'p5' | 'p10' | 'p25' | 'p50' | 'p75' | 'p90' | 'p95' | 'p99', number>): number` — smallest ladder percentile whose time ≥ `userAvgMs` (lower time = better), else 100.

- [ ] **Step 1: Write failing tests**

`src/lib/fast50/__tests__/distributions.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import type {
    DossierFinishedRun,
    DossierSplit,
} from '../dossier.types';
import {
    communityPercentile,
    dangerSplit,
    forecastBands,
    quantile,
    roadmap,
    runPercentile,
    runRank,
} from '../compute';

const runsOf = (times: number[]): DossierFinishedRun[] =>
    times.map((timeMs, i) => ({
        timeMs,
        endedAt: `2026-05-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
    }));

const split = (over: Partial<DossierSplit>): DossierSplit => ({
    index: 0,
    name: 's',
    avgSingleMs: 60000,
    avgTotalMs: 60000,
    goldMs: 50000,
    pbSingleMs: 55000,
    pbTotalMs: 55000,
    stdDevMs: 3000,
    attemptsReached: 100,
    deaths: 0,
    resetShare: 0,
    completions: [60000],
    ...over,
});

describe('quantile', () => {
    test('interpolates', () => {
        expect(quantile([10, 20, 30, 40, 50], 0.5)).toBe(30);
        expect(quantile([10, 20], 0.5)).toBe(15);
        expect(quantile([], 0.5)).toBeNull();
    });
});

describe('forecastBands', () => {
    test('null under 5 finished runs', () => {
        expect(forecastBands(runsOf([1, 2, 3, 4]))).toBeNull();
    });
    test('bands from recent runs, p10 <= p50 <= p90', () => {
        const bands = forecastBands(
            runsOf([100, 90, 95, 80, 85, 92, 88, 99, 84, 91]),
        );
        expect(bands).not.toBeNull();
        expect(bands!.p10Ms).toBeLessThanOrEqual(bands!.p50Ms);
        expect(bands!.p50Ms).toBeLessThanOrEqual(bands!.p90Ms);
        expect(bands!.sample).toBe(10);
    });
    test('only considers the most recent N', () => {
        const times = [...Array(30).fill(200), ...Array(20).fill(100)];
        const bands = forecastBands(runsOf(times), 20);
        expect(bands!.p90Ms).toBe(100); // old slow runs ignored
    });
});

describe('runPercentile / runRank', () => {
    const runs = runsOf([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
    test('needs 10+ runs', () => {
        expect(runPercentile(runsOf([1, 2, 3]), 2)).toBeNull();
    });
    test('percent slower', () => {
        expect(runPercentile(runs, 250)).toBe(80); // 8 of 10 slower
    });
    test('rank is 1-based', () => {
        expect(runRank(runs, 50)).toBe(1);
        expect(runRank(runs, 250)).toBe(3);
    });
});

describe('roadmap', () => {
    test('cumulative clock, skips unknown', () => {
        const road = roadmap([
            split({ index: 0, name: 'A', avgTotalMs: 600000 }),
            split({ index: 1, name: 'B', avgTotalMs: null }),
            split({ index: 2, name: 'C', avgTotalMs: 1800000 }),
        ]);
        expect(road).toEqual([
            { index: 0, name: 'A', atMs: 600000 },
            { index: 2, name: 'C', atMs: 1800000 },
        ]);
    });
});

describe('dangerSplit', () => {
    test('picks max resetShare above thresholds', () => {
        const splits = [
            split({ index: 0, name: 'A', deaths: 2, resetShare: 0.05 }),
            split({
                index: 1,
                name: 'Water Temple',
                deaths: 40,
                resetShare: 0.41,
            }),
            split({ index: 2, name: 'C', deaths: 10, resetShare: 0.2 }),
        ];
        const danger = dangerSplit(splits);
        expect(danger!.split.name).toBe('Water Temple');
        expect(danger!.afterName).toBe('A');
        expect(danger!.startsAtMs).toBe(60000);
    });
    test('null when deaths spread thin', () => {
        expect(
            dangerSplit([
                split({ deaths: 3, resetShare: 0.1 }),
                split({ index: 1, deaths: 4, resetShare: 0.14 }),
            ]),
        ).toBeNull();
    });
});

describe('communityPercentile', () => {
    const ladder = {
        p1: 100,
        p5: 110,
        p10: 120,
        p25: 140,
        p50: 170,
        p75: 200,
        p90: 240,
        p95: 260,
        p99: 300,
    };
    test('maps to smallest bucket at or above user time', () => {
        expect(communityPercentile(105, ladder)).toBe(5);
        expect(communityPercentile(170, ladder)).toBe(50);
        expect(communityPercentile(9999, ladder)).toBe(100);
        expect(communityPercentile(50, ladder)).toBe(1);
    });
});
```

- [ ] **Step 2: Run tests, verify the new file fails**

Run: `npm run test`
Expected: FAIL — missing exports.

- [ ] **Step 3: Implement in `compute.ts`**

Append:

```typescript
export const quantile = (sortedAsc: number[], q: number): number | null => {
    if (sortedAsc.length === 0) return null;
    const pos = (sortedAsc.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sortedAsc[lo];
    return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
};

export const forecastBands = (
    runs: DossierFinishedRun[],
    recent = 20,
): { p10Ms: number; p50Ms: number; p90Ms: number; sample: number } | null => {
    const sample = runs.slice(-recent).map((r) => r.timeMs);
    if (sample.length < 5) return null;
    const sorted = [...sample].sort((a, b) => a - b);
    return {
        p10Ms: quantile(sorted, 0.1) as number,
        p50Ms: quantile(sorted, 0.5) as number,
        p90Ms: quantile(sorted, 0.9) as number,
        sample: sample.length,
    };
};

export const runPercentile = (
    runs: DossierFinishedRun[],
    timeMs: number,
): number | null => {
    if (runs.length < 10) return null;
    const slower = runs.filter((r) => r.timeMs > timeMs).length;
    return Math.round((slower / runs.length) * 100);
};

export const runRank = (
    runs: DossierFinishedRun[],
    timeMs: number,
): number => runs.filter((r) => r.timeMs < timeMs).length + 1;

export const roadmap = (
    splits: DossierSplit[],
): { index: number; name: string; atMs: number }[] =>
    splits.flatMap((s) =>
        s.avgTotalMs === null
            ? []
            : [{ index: s.index, name: s.name, atMs: s.avgTotalMs }],
    );

export const dangerSplit = (
    splits: DossierSplit[],
): {
    split: DossierSplit;
    startsAtMs: number | null;
    afterName: string | null;
} | null => {
    const candidates = splits.filter(
        (s) => s.resetShare >= 0.15 && s.deaths >= 5,
    );
    if (candidates.length === 0) return null;
    const worst = candidates.reduce((a, b) =>
        b.resetShare > a.resetShare ? b : a,
    );
    const prev = worst.index > 0 ? splits[worst.index - 1] : null;
    return {
        split: worst,
        startsAtMs: prev?.avgTotalMs ?? null,
        afterName: prev?.name ?? null,
    };
};

const LADDER_KEYS = [
    ['p1', 1],
    ['p5', 5],
    ['p10', 10],
    ['p25', 25],
    ['p50', 50],
    ['p75', 75],
    ['p90', 90],
    ['p95', 95],
    ['p99', 99],
] as const;

export type PercentileLadder = Record<
    (typeof LADDER_KEYS)[number][0],
    number
>;

export const communityPercentile = (
    userAvgMs: number,
    ladder: PercentileLadder,
): number => {
    for (const [key, pct] of LADDER_KEYS) {
        if (userAvgMs <= ladder[key]) return pct;
    }
    return 100;
};
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fast50
git commit -m "feat(fast50): forecast, percentile, roadmap and danger-split math"
```

---

### Task 4: Fixture dossiers (grinder / prodigy / sparse)

**Files:**
- Create: `src/lib/fast50/fixtures.ts`
- Test: `src/lib/fast50/__tests__/fixtures.test.ts`

**Interfaces:**
- Produces: `FIXTURES: Record<'grinder' | 'prodigy' | 'sparse', RunnerDossier>` plus `fixturePost: Record<same keys, RunnerDossier>` (post-deck variants with `postRun` filled). Used by evaluator/composer tests, the demo route, and rehearsals.

- [ ] **Step 1: Write the fixtures**

`src/lib/fast50/fixtures.ts` — hand-authored, realistic magnitudes. Requirements (encode these exactly; fill remaining splits with plausible values):

```typescript
import type { RunnerDossier } from './dossier.types';

// Helper to build a split quickly
const split = (
    index: number,
    name: string,
    avgSingleMs: number,
    over: Partial<import('./dossier.types').DossierSplit> = {},
): import('./dossier.types').DossierSplit => ({
    index,
    name,
    avgSingleMs,
    avgTotalMs: null, // set below via accumulate()
    goldMs: Math.round(avgSingleMs * 0.88),
    pbSingleMs: Math.round(avgSingleMs * 0.93),
    pbTotalMs: null,
    stdDevMs: Math.round(avgSingleMs * 0.06),
    attemptsReached: 100,
    deaths: 0,
    resetShare: 0,
    completions: [avgSingleMs],
    ...over,
});

const accumulate = (
    splits: import('./dossier.types').DossierSplit[],
): import('./dossier.types').DossierSplit[] => {
    let total = 0;
    let pbTotal = 0;
    return splits.map((s) => {
        total += s.avgSingleMs ?? 0;
        pbTotal += s.pbSingleMs ?? 0;
        return { ...s, avgTotalMs: total, pbTotalMs: pbTotal };
    });
};
```

**`grinder`** (pre deck showcase): 6-split ~1h40m game ("Ocarina of Time 100%" style). `core`: `attemptCount: 4812`, `finishedAttemptCount: 289` (finishRate ≈ 0.06), `pbMs` ≈ 1h38m, `sobMs` ≈ 1h36m, `categoryPlaytimeMs` ≈ 379 h. Split 3 ("Water Temple") gets `deaths: 1850`, `resetShare: 0.41`, others share the rest. `finishedRuns`: 60 entries trending downward over two years (times between pb+8m and pb+30s, most recent 20 clustered pb+2..5m). `community`: `userCount: 214`, split 3 percentile 35, split 1 ("Forest Escape") percentile 3. `leaderboards`: `pbPlacing: 11, entrants: 214`. `form`: `last14dPlaytimeMs` ≈ 42 h, `last14dActiveDays: 12`, `currentStreakDays: 9`. `postRun: null`, `deck: 'pre'`, `sources` all ok.

**`prodigy`**: 8 splits, `attemptCount: 611`, `finishedAttemptCount: 434` (finishRate ≈ 0.71), leaderboard `pbPlacing: 1, entrants: 89`, community percentiles mostly 1–5, no dominant danger split (`resetShare` max 0.12, deaths < 5 per split), 40 finished runs tightly clustered.

**`sparse`**: 5 splits, `attemptCount: 34`, `finishedAttemptCount: 3`, `finishedRuns` length 3, `community: null`, `leaderboards: null`, `form: null`. This fixture must compose down to anchors + ≤2 slides.

**`fixturePost`**: clone each with `deck: 'post'` and a `postRun`: grinder finishes at `pbMs + 95_000` with 2 golds (`goldSaveMs` 1200 and 800 on splits 2 and 4), `source: 'capture'`, one event `{ type: 'gold_split_event', name: 'Gold split!', description: 'New best segment on Barrel Room' }`; prodigy finishes at `p50 - 20_000` with 0 golds, `source: 'history'`; sparse finishes at its median, `source: 'history'`, `events: []`.

- [ ] **Step 2: Write sanity tests**

`src/lib/fast50/__tests__/fixtures.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { forecastBands } from '../compute';
import { FIXTURES, fixturePost } from '../fixtures';

describe('fixtures', () => {
    test('grinder is a grinder', () => {
        const g = FIXTURES.grinder;
        expect(g.core.attemptCount).toBeGreaterThan(1000);
        expect(g.core.finishRate).toBeLessThan(0.1);
        expect(g.splits.some((s) => s.resetShare > 0.3)).toBe(true);
        expect(forecastBands(g.finishedRuns)).not.toBeNull();
    });
    test('prodigy is world class and consistent', () => {
        const p = FIXTURES.prodigy;
        expect(p.core.finishRate).toBeGreaterThan(0.5);
        expect(p.leaderboards?.pbPlacing).toBe(1);
    });
    test('sparse has almost nothing', () => {
        const s = FIXTURES.sparse;
        expect(s.finishedRuns.length).toBeLessThan(5);
        expect(s.community).toBeNull();
    });
    test('post variants carry postRun', () => {
        for (const d of Object.values(fixturePost)) {
            expect(d.deck).toBe('post');
            expect(d.postRun).not.toBeNull();
        }
        expect(fixturePost.grinder.postRun?.goldCount).toBe(2);
    });
});
```

- [ ] **Step 3: Run tests, verify pass**

Run: `npm run test`
Expected: all pass (fixtures are data — tests pass immediately once written correctly).

- [ ] **Step 4: Commit**

```bash
git add src/lib/fast50
git commit -m "feat(fast50): fixture dossiers for tests, demo and rehearsal"
```

---

### Task 5: Slide evaluators + deck composer

**Files:**
- Create: `src/components/fast50/deck/evaluators.ts`, `src/components/fast50/deck/compose-deck.ts`
- Test: `src/components/fast50/__tests__/compose-deck.test.ts` (add `src/components/**/__tests__/*.test.ts` to `vitest.config.ts` include)

**Interfaces:**
- Consumes: `RunnerDossier`, compute helpers.
- Produces:

```typescript
// evaluators.ts
export type SlideId =
    | 'intro' | 'roadmap' | 'grind' | 'one-shot' | 'danger-zone'
    | 'world-class' | 'profile' | 'forecast' | 'form-check'
    | 'result' | 'where-it-lands' | 'survived' | 'gold-rush'
    | 'story-of-run' | 'the-table' | 'zoom-out';

export interface SlideEvaluation {
    score: number; // 0..100, how remarkable for THIS runner
    headline: string; // the one sentence the presenter says
}

export type SlideEvaluator = (d: RunnerDossier) => SlideEvaluation | null;

// compose-deck.ts
export interface ComposedSlide {
    id: SlideId;
    evaluation: SlideEvaluation;
    anchor: boolean;
    overflow: boolean; // past the cut line
}
export const composeDeck = (d: RunnerDossier): ComposedSlide[];
export const THRESHOLDS: { … }; // every tunable in one exported object
```

- [ ] **Step 1: Extend vitest include**

In `vitest.config.ts` set:

```typescript
include: ['src/**/__tests__/*.test.ts'],
```

(already covers `src/components` — verify, adjust only if you narrowed it earlier).

- [ ] **Step 2: Write failing composer tests**

`src/components/fast50/__tests__/compose-deck.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { FIXTURES, fixturePost } from '~src/lib/fast50/fixtures';
import { composeDeck } from '../deck/compose-deck';

describe('composeDeck pre', () => {
    test('anchors always lead: intro then roadmap', () => {
        const deck = composeDeck(FIXTURES.grinder);
        expect(deck[0].id).toBe('intro');
        expect(deck[1].id).toBe('roadmap');
    });
    test('grinder leads with grind or one-shot, includes danger-zone', () => {
        const deck = composeDeck(FIXTURES.grinder);
        const main = deck.filter((s) => !s.anchor && !s.overflow);
        expect(main.length).toBeLessThanOrEqual(4);
        expect(['grind', 'one-shot']).toContain(main[0].id);
        expect(main.map((s) => s.id)).toContain('danger-zone');
    });
    test('prodigy leads with world-class or profile, no danger-zone', () => {
        const deck = composeDeck(FIXTURES.prodigy);
        const ids = deck
            .filter((s) => !s.anchor && !s.overflow)
            .map((s) => s.id);
        expect(['world-class', 'profile']).toContain(ids[0]);
        expect(ids).not.toContain('danger-zone');
    });
    test('sparse degrades to anchors + few slides, never crashes', () => {
        const deck = composeDeck(FIXTURES.sparse);
        expect(deck[0].id).toBe('intro');
        expect(deck.filter((s) => !s.anchor && !s.overflow).length)
            .toBeLessThanOrEqual(2);
    });
    test('overflow contains remaining scored slides, sorted by score', () => {
        const deck = composeDeck(FIXTURES.grinder);
        const overflow = deck.filter((s) => s.overflow);
        for (let i = 1; i < overflow.length; i++) {
            expect(overflow[i].evaluation.score)
                .toBeLessThanOrEqual(overflow[i - 1].evaluation.score);
        }
    });
});

describe('composeDeck post', () => {
    test('result anchors the post deck', () => {
        const deck = composeDeck(fixturePost.grinder);
        expect(deck[0].id).toBe('result');
        expect(deck.map((s) => s.id)).toContain('gold-rush');
    });
    test('no post slides without postRun', () => {
        const deck = composeDeck({ ...fixturePost.grinder, postRun: null });
        expect(deck.filter((s) => !s.anchor)).toHaveLength(0);
    });
    test('where-it-lands present with enough history', () => {
        const deck = composeDeck(fixturePost.grinder);
        expect(deck.map((s) => s.id)).toContain('where-it-lands');
    });
});
```

- [ ] **Step 3: Run tests, verify fail**

Run: `npm run test`
Expected: FAIL — modules missing.

- [ ] **Step 4: Implement `evaluators.ts`**

Every evaluator returns `null` when its data is missing or unremarkable. Headlines use `formatTimeMs`/`formatPercent` where sensible. Complete code:

```typescript
import {
    dangerSplit,
    forecastBands,
    runPercentile,
    runRank,
} from '~src/lib/fast50/compute';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';

export type SlideId =
    | 'intro'
    | 'roadmap'
    | 'grind'
    | 'one-shot'
    | 'danger-zone'
    | 'world-class'
    | 'profile'
    | 'forecast'
    | 'form-check'
    | 'result'
    | 'where-it-lands'
    | 'survived'
    | 'gold-rush'
    | 'story-of-run'
    | 'the-table'
    | 'zoom-out';

export interface SlideEvaluation {
    score: number;
    headline: string;
}

export type SlideEvaluator = (d: RunnerDossier) => SlideEvaluation | null;

export const THRESHOLDS = {
    grindAttempts: 500, // below this, attempts aren't a story
    grindMaxScoreAttempts: 5000,
    oneShotMaxFinishRate: 0.25,
    dangerMinResetShare: 0.15,
    dangerMinDeaths: 5,
    worldClassPercentile: 10,
    profileMachineFinishRate: 0.5,
    forecastMinRuns: 5,
    formMinPlaytimeMs: 10 * 3600_000,
    whereItLandsMinRuns: 10,
    goldRushMinGolds: 1,
    tableMinLeftMs: 20_000,
    mainSlots: 4,
} as const;

const hours = (ms: number) => Math.round(ms / 3600_000);

export const evaluators: Record<SlideId, SlideEvaluator> = {
    intro: (d) => ({
        score: 100,
        headline: `${d.runner.username} — ${d.game.display} ${d.game.category}`,
    }),

    roadmap: (d) =>
        d.splits.filter((s) => s.avgTotalMs !== null).length >= 3
            ? { score: 100, headline: 'The road ahead' }
            : null,

    grind: (d) => {
        const { attemptCount } = d.core;
        if (attemptCount < THRESHOLDS.grindAttempts) return null;
        const score = Math.min(
            100,
            (attemptCount / THRESHOLDS.grindMaxScoreAttempts) * 100,
        );
        const pt = d.core.categoryPlaytimeMs;
        return {
            score,
            headline: `${attemptCount.toLocaleString()} attempts${
                pt ? ` — ${hours(pt)} hours of their life` : ''
            }`,
        };
    },

    'one-shot': (d) => {
        const { finishRate, attemptCount } = d.core;
        if (attemptCount < 50) return null;
        if (finishRate > THRESHOLDS.oneShotMaxFinishRate) return null;
        const diePct = Math.round((1 - finishRate) * 100);
        return {
            score: Math.min(100, diePct + 5),
            headline: `At home, ${diePct}% of runs die before the credits. Tonight: one attempt.`,
        };
    },

    'danger-zone': (d) => {
        const danger = dangerSplit(d.splits);
        if (!danger) return null;
        const pct = Math.round(danger.split.resetShare * 100);
        const when = danger.startsAtMs
            ? ` — around ${formatTimeMs(danger.startsAtMs)} in`
            : '';
        return {
            score: Math.min(100, pct * 2),
            headline: `If this run dies, it dies at ${danger.split.name}${when}`,
        };
    },

    'world-class': (d) => {
        if (!d.community) return null;
        const best = d.community.segments
            .filter((s) => s.percentile !== null)
            .sort((a, b) => (a.percentile as number) - (b.percentile as number))[0];
        if (!best || (best.percentile as number) > THRESHOLDS.worldClassPercentile)
            return null;
        return {
            score: 100 - (best.percentile as number) * 5,
            headline: `Their ${best.name} is top ${best.percentile}% of everyone on therun.gg`,
        };
    },

    profile: (d) => {
        const { finishRate, attemptCount } = d.core;
        if (attemptCount < 50) return null;
        const machine = finishRate >= THRESHOLDS.profileMachineFinishRate;
        const pct = Math.round(finishRate * 100);
        // Only remarkable at the extremes; mid finish rates say nothing.
        if (!machine && finishRate > 0.2) return null;
        return {
            score: machine ? pct : 70 - pct * 2,
            headline: machine
                ? `A machine: finishes ${pct}% of everything they start`
                : `Full send, every time: only ${pct}% of starts survive`,
        };
    },

    forecast: (d) => {
        const bands = forecastBands(d.finishedRuns);
        if (!bands) return null;
        return {
            score: 60 + Math.min(20, bands.sample),
            headline: `Expect around ${formatTimeMs(bands.p50Ms)}. Under ${formatTimeMs(bands.p10Ms)} means something special is happening.`,
        };
    },

    'form-check': (d) => {
        if (!d.form?.last14dPlaytimeMs) return null;
        if (d.form.last14dPlaytimeMs < THRESHOLDS.formMinPlaytimeMs)
            return null;
        return {
            score: Math.min(80, hours(d.form.last14dPlaytimeMs) * 2),
            headline: `${hours(d.form.last14dPlaytimeMs)} hours of practice in the last two weeks`,
        };
    },

    result: (d) => {
        if (!d.postRun) return null;
        return {
            score: 100,
            headline: formatTimeMs(d.postRun.finalTimeMs),
        };
    },

    'where-it-lands': (d) => {
        if (!d.postRun) return null;
        if (d.finishedRuns.length < THRESHOLDS.whereItLandsMinRuns)
            return null;
        const pctl = runPercentile(d.finishedRuns, d.postRun.finalTimeMs);
        if (pctl === null) return null;
        const rank = runRank(d.finishedRuns, d.postRun.finalTimeMs);
        const top = 100 - pctl;
        return {
            score: Math.max(30, 100 - top),
            headline: `First try, on stage — and it lands #${rank} of ${d.finishedRuns.length} finished runs (top ${Math.max(top, 1)}%)`,
        };
    },

    survived: (d) => {
        if (!d.postRun) return null;
        const danger = dangerSplit(d.splits);
        if (!danger) return null;
        const passed = d.postRun.splits.some(
            (s) => s.index === danger.split.index && s.singleMs !== null,
        );
        if (!passed) return null;
        const surviveRate = Math.round(
            (1 - danger.split.resetShare) * 100,
        );
        return {
            score: 70 + Math.round(danger.split.resetShare * 30),
            headline: `${danger.split.name} kills ${100 - surviveRate}% of runs. Tonight it lived.`,
        };
    },

    'gold-rush': (d) => {
        if (!d.postRun) return null;
        if (d.postRun.goldCount < THRESHOLDS.goldRushMinGolds) return null;
        return {
            score: 60 + d.postRun.goldCount * 15,
            headline: `${d.postRun.goldCount} gold${d.postRun.goldCount > 1 ? 's' : ''} tonight — splits they had never done faster`,
        };
    },

    'story-of-run': (d) => {
        if (!d.postRun) return null;
        const withDeltas = d.postRun.splits.filter(
            (s) => s.deltaVsAvgMs !== null,
        );
        if (withDeltas.length < 3) return null;
        return { score: 55, headline: 'Where it was won, where it nearly died' };
    },

    'the-table': (d) => {
        if (!d.postRun) return null;
        const left = d.postRun.splits.reduce((sum, s) => {
            const split = d.splits[s.index];
            if (s.singleMs === null || !split?.goldMs) return sum;
            return sum + Math.max(0, s.singleMs - split.goldMs);
        }, 0);
        if (left < THRESHOLDS.tableMinLeftMs) return null;
        return {
            score: 45,
            headline: `${formatTimeMs(left)} left on the table`,
        };
    },

    'zoom-out': (d) => {
        if (!d.postRun) return null;
        return {
            score: 40,
            headline: `That was attempt #${(d.core.attemptCount + 1).toLocaleString()}`,
        };
    },
};
```

- [ ] **Step 5: Implement `compose-deck.ts`**

```typescript
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import {
    evaluators,
    THRESHOLDS,
    type SlideEvaluation,
    type SlideId,
} from './evaluators';

export interface ComposedSlide {
    id: SlideId;
    evaluation: SlideEvaluation;
    anchor: boolean;
    overflow: boolean;
}

const PRE_ANCHORS: SlideId[] = ['intro', 'roadmap'];
const PRE_POOL: SlideId[] = [
    'grind',
    'one-shot',
    'danger-zone',
    'world-class',
    'profile',
    'forecast',
    'form-check',
];
const POST_ANCHORS: SlideId[] = ['result'];
const POST_POOL: SlideId[] = [
    'where-it-lands',
    'survived',
    'gold-rush',
    'story-of-run',
    'the-table',
    'zoom-out',
];

export { THRESHOLDS };

export const composeDeck = (d: RunnerDossier): ComposedSlide[] => {
    const anchors = d.deck === 'pre' ? PRE_ANCHORS : POST_ANCHORS;
    const pool = d.deck === 'pre' ? PRE_POOL : POST_POOL;

    const anchorSlides = anchors.flatMap((id) => {
        const evaluation = evaluators[id](d);
        return evaluation
            ? [{ id, evaluation, anchor: true, overflow: false }]
            : [];
    });

    const scored = pool
        .flatMap((id) => {
            const evaluation = evaluators[id](d);
            return evaluation ? [{ id, evaluation }] : [];
        })
        .sort((a, b) => b.evaluation.score - a.evaluation.score);

    const main = scored.slice(0, THRESHOLDS.mainSlots);
    const overflow = scored.slice(THRESHOLDS.mainSlots);

    return [
        ...anchorSlides,
        ...main.map((s) => ({ ...s, anchor: false, overflow: false })),
        ...overflow.map((s) => ({ ...s, anchor: false, overflow: true })),
    ];
};
```

- [ ] **Step 6: Run tests, verify pass**

Run: `npm run test`
Expected: all pass. If a fixture doesn't trip the expected evaluators (e.g. grinder's `danger-zone` missing), fix the **fixture** to match its persona, not the thresholds.

- [ ] **Step 7: Commit**

```bash
git add src/components/fast50 vitest.config.ts
git commit -m "feat(fast50): slide evaluators and deck composer"
```

---

### Task 6: Post-run resolution (pure tiers: capture → live → history)

**Files:**
- Create: `src/lib/fast50/post-run.ts`
- Test: `src/lib/fast50/__tests__/post-run.test.ts`

**Interfaces:**
- Consumes: `LiveRun`, `Split` from `~app/(new-layout)/live/live.types`; `History` from `~src/common/types`; `DossierSplit`, `PostRun` from `./dossier.types`; `toMs` from `./compute`.
- Produces:
  - `postRunFromLive(live: LiveRun, dossierSplits: DossierSplit[], source: 'capture' | 'live'): PostRun | null` — `null` unless the run is finished (`endedAt` set, or `currentSplitIndex >= splits.length`, and a final time exists).
  - `postRunFromHistory(history: History, dossierSplits: DossierSplit[]): PostRun | null` — builds from the LAST finished `RunHistory` entry; `null` if none. Gold detection: a split is gold if its single time < the gold computed from all EARLIER attempts (recompute prior gold by excluding the final run's value from `values` when it's the minimum).
- Gold rules shared by both: `isGold` when `singleMs < priorGoldMs`; `goldSaveMs = priorGoldMs - singleMs`. `deltaVsAvgMs = singleMs - avgSingleMs` from the matching `DossierSplit`.

- [ ] **Step 1: Write failing tests**

`src/lib/fast50/__tests__/post-run.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import type { History } from '~src/common/types';
import { buildSplits } from '../compute';
import { postRunFromHistory, postRunFromLive } from '../post-run';
import { historyFixture } from './compute.test';

const dossierSplits = buildSplits(historyFixture);

const liveRun = (over: Partial<LiveRun>): LiveRun =>
    ({
        user: 'runner',
        login: 'runner',
        game: 'Game',
        category: 'Any%',
        currentSplitIndex: 2,
        currentSplitName: '-',
        currentTime: 170000,
        endedAt: '2026-05-04T20:00:00Z',
        insertedAt: 0,
        emulator: false,
        gameTime: false,
        hasReset: false,
        region: '',
        platform: '',
        variables: { Variable: [] },
        importance: 0,
        pb: 175000,
        bestPossible: 160000,
        sob: 160000,
        delta: -5000,
        url: '',
        events: [],
        splits: [
            {
                name: 'Forest',
                comparisons: {},
                single: null,
                total: null,
                splitTime: 58000,
                bestPossible: 55000, // prior gold
                average: 62000,
                attemptsStarted: 10,
                attemptsFinished: 4,
                consistency: 1,
                predictedSingleTime: null,
                predictedTotalTime: null,
                recentCompletionsSingle: [],
                recentCompletionsTotal: [],
            },
            {
                name: 'Water Temple',
                comparisons: {},
                single: null,
                total: null,
                splitTime: 170000, // cumulative
                bestPossible: 110000,
                average: 115000,
                attemptsStarted: 4,
                attemptsFinished: 1,
                consistency: 1,
                predictedSingleTime: null,
                predictedTotalTime: null,
                recentCompletionsSingle: [],
                recentCompletionsTotal: [],
            },
        ] as unknown as LiveRun['splits'],
        ...over,
    }) as LiveRun;

describe('postRunFromLive', () => {
    test('null while the run is unfinished', () => {
        expect(
            postRunFromLive(
                liveRun({ endedAt: undefined, currentSplitIndex: 1 }),
                dossierSplits,
                'capture',
            ),
        ).toBeNull();
    });
    test('builds splits with golds from a finished run', () => {
        const post = postRunFromLive(liveRun({}), dossierSplits, 'capture');
        expect(post).not.toBeNull();
        expect(post!.source).toBe('capture');
        expect(post!.finalTimeMs).toBe(170000);
        // Forest single 58000 vs prior gold 55000 → not gold
        expect(post!.splits[0].isGold).toBe(false);
        // Water Temple single = 170000 - 58000 = 112000 vs values-derived
        // splitTime cumulative; vs prior gold 110000 → not gold
        expect(post!.splits[1].singleMs).toBe(112000);
        expect(post!.goldCount).toBe(0);
    });
    test('detects gold and save', () => {
        const run = liveRun({});
        run.splits[0].splitTime = 53000; // beats prior gold 55000
        run.splits[1].splitTime = 170000;
        const post = postRunFromLive(run, dossierSplits, 'live');
        expect(post!.splits[0].isGold).toBe(true);
        expect(post!.splits[0].goldSaveMs).toBe(2000);
        expect(post!.goldCount).toBe(1);
    });
});

describe('postRunFromHistory', () => {
    test('uses last finished run', () => {
        const history: History = {
            ...historyFixture,
            runs: [
                ...historyFixture.runs,
                {
                    splits: [
                        { splitTime: '54000', totalTime: '54000' },
                        { splitTime: '108000', totalTime: '162000' },
                    ],
                    time: '162000',
                    duration: '162000',
                    startedAt: '2026-05-05T18:00:00Z',
                    endedAt: '2026-05-05T18:03:00Z',
                },
            ],
        };
        const post = postRunFromHistory(history, buildSplits(history));
        expect(post).not.toBeNull();
        expect(post!.source).toBe('history');
        expect(post!.finalTimeMs).toBe(162000);
        // split singles 54000 (gold prior best 55000 → gold, save 1000)
        expect(post!.splits[0].isGold).toBe(true);
        expect(post!.splits[0].goldSaveMs).toBe(1000);
    });
    test('null with no finished runs', () => {
        const history: History = { ...historyFixture, runs: [] };
        expect(postRunFromHistory(history, dossierSplits)).toBeNull();
    });
});
```

Note: `historyFixture` import requires exporting it from `compute.test.ts` (done in Task 2).

- [ ] **Step 2: Run tests, verify fail**

Run: `npm run test`
Expected: FAIL — `post-run` module missing.

- [ ] **Step 3: Implement `post-run.ts`**

```typescript
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import type { History } from '~src/common/types';
import { toMs } from './compute';
import type {
    DossierSplit,
    PostRun,
    PostRunSplit,
} from './dossier.types';

const goldOf = (
    singleMs: number | null,
    priorGoldMs: number | null,
): { isGold: boolean; goldSaveMs: number | null } => {
    if (singleMs === null || priorGoldMs === null)
        return { isGold: false, goldSaveMs: null };
    return singleMs < priorGoldMs
        ? { isGold: true, goldSaveMs: priorGoldMs - singleMs }
        : { isGold: false, goldSaveMs: null };
};

export const postRunFromLive = (
    live: LiveRun,
    dossierSplits: DossierSplit[],
    source: 'capture' | 'live',
): PostRun | null => {
    const finished =
        (live.endedAt || live.currentSplitIndex >= live.splits.length) &&
        !live.hasReset;
    if (!finished) return null;
    const last = live.splits[live.splits.length - 1];
    const finalTimeMs = toMs(last?.splitTime) ?? toMs(live.currentTime);
    if (finalTimeMs === null) return null;

    let prevTotal = 0;
    const splits: PostRunSplit[] = live.splits.map((s, index) => {
        const totalMs = toMs(s.splitTime);
        const singleMs =
            totalMs === null ? null : Math.max(0, totalMs - prevTotal);
        if (totalMs !== null) prevTotal = totalMs;
        const priorGoldMs = toMs(s.bestPossible);
        const avg = dossierSplits[index]?.avgSingleMs ?? toMs(s.average);
        return {
            index,
            name: s.name,
            singleMs,
            totalMs,
            ...goldOf(singleMs, priorGoldMs),
            deltaVsAvgMs:
                singleMs !== null && avg !== null ? singleMs - avg : null,
        };
    });

    return {
        source,
        finalTimeMs,
        endedAt: live.endedAt ?? null,
        splits,
        goldCount: splits.filter((s) => s.isGold).length,
        events: (live.events ?? []).map((e) => ({
            type: e.type,
            name: e.name,
            description: e.description,
        })),
    };
};

export const postRunFromHistory = (
    history: History,
    dossierSplits: DossierSplit[],
): PostRun | null => {
    const finished = history.runs.filter((r) => toMs(r.time) !== null);
    const lastRun = finished[finished.length - 1];
    if (!lastRun) return null;
    const finalTimeMs = toMs(lastRun.time) as number;

    const splits: PostRunSplit[] = lastRun.splits.map((s, index) => {
        const singleMs = toMs(s.splitTime);
        const totalMs = toMs(s.totalTime);
        const meta = dossierSplits[index];
        // Prior gold: the all-time gold, unless THIS value set it — then
        // the best of the remaining completions.
        let priorGoldMs = meta?.goldMs ?? null;
        if (
            singleMs !== null &&
            priorGoldMs !== null &&
            singleMs <= priorGoldMs &&
            meta
        ) {
            const others = meta.completions.filter(
                (v, i, arr) => i !== arr.lastIndexOf(singleMs),
            );
            priorGoldMs = others.length > 0 ? Math.min(...others) : null;
        }
        return {
            index,
            name: meta?.name ?? `Split ${index + 1}`,
            singleMs,
            totalMs,
            ...goldOf(singleMs, priorGoldMs),
            deltaVsAvgMs:
                singleMs !== null && meta?.avgSingleMs != null
                    ? singleMs - meta.avgSingleMs
                    : null,
        };
    });

    return {
        source: 'history',
        finalTimeMs,
        endedAt: lastRun.endedAt ?? null,
        splits,
        goldCount: splits.filter((s) => s.isGold).length,
        events: [],
    };
};
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm run test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fast50
git commit -m "feat(fast50): post-run resolution from capture, live and history tiers"
```

---

### Task 7: Dossier assembly (server)

**Files:**
- Create: `src/lib/fast50/dossier.ts`
- Test: none (thin I/O shell; all logic lives in already-tested modules). Verified end-to-end in Task 10.

**Interfaces:**
- Consumes: everything above + `getRun`, `getGlobalUser`, `getAdvancedUserStats`, `getLiveRunForUser`, `apiFetch`, `getSplitsHistoryUrl`.
- Produces: `getRunnerDossier(username: string, game: string, category: string, deck: DeckKind): Promise<RunnerDossier | null>` (`null` when the core run doesn't exist). Exported for the deck page and picker.

- [ ] **Step 1: Implement `dossier.ts`**

```typescript
'use server';

import { cacheLife } from 'next/cache';
import type { History } from '~src/common/types';
import { getSplitsHistoryUrl } from '~src/components/run/get-splits-history';
import { apiFetch } from '~src/lib/api-client';
import { getAdvancedUserStats } from '~src/lib/get-advanced-user-stats';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getRun } from '~src/lib/get-run';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { safeEncodeURI } from '~src/utils/uri';
import {
    buildFinishedRuns,
    buildSplits,
    communityPercentile,
    toMs,
    type PercentileLadder,
} from './compute';
import type {
    DeckKind,
    DossierCommunity,
    DossierForm,
    DossierLeaderboards,
    RunnerDossier,
    SourceStatus,
} from './dossier.types';
import { postRunFromHistory, postRunFromLive } from './post-run';

interface CommunitySegmentsResult {
    userCount: number;
    communityBests: {
        index: number;
        name: string;
        percentiles?: { avgSegment?: PercentileLadder };
    }[];
    users: {
        username: string;
        segments: { index: number; avgSegmentLast10: number | null }[];
    }[];
}

interface CategoryLeaderboardResult {
    categoryLeaderboards?: {
        categoryName: string;
        pbLeaderboard?: { username: string; placing: number }[];
    }[];
}

interface StreaksResult {
    currentStartedStreak?: { length: number } | null;
}

export const getRunnerDossier = async (
    username: string,
    game: string,
    category: string,
    deck: DeckKind,
): Promise<RunnerDossier | null> => {
    'use cache';
    cacheLife('minutes');

    const sources: SourceStatus[] = [];
    const track = <T>(name: string, p: Promise<T>): Promise<T | null> =>
        p.then(
            (v) => {
                sources.push({ name, ok: true });
                return v;
            },
            (e: unknown) => {
                sources.push({
                    name,
                    ok: false,
                    error: e instanceof Error ? e.message : String(e),
                });
                return null;
            },
        );

    const run = await getRun(username, game, category).catch(() => null);
    if (!run?.historyFilename) return null;

    const historyPromise: Promise<History> = fetch(
        getSplitsHistoryUrl(run.historyFilename, false),
        { mode: 'cors' },
    ).then((r) => r.json());

    const [history, profile, gameGlobal, segments, leaderboard, playtime, streaks, live] =
        await Promise.all([
            track('history', historyPromise),
            track('profile', getGlobalUser(username)),
            track(
                'game',
                apiFetch<{ display: string; image?: string }>(
                    `/games/global/${safeEncodeURI(game)}`,
                ),
            ),
            track(
                'community',
                apiFetch<CommunitySegmentsResult>(
                    `/games/${safeEncodeURI(game)}/${safeEncodeURI(category)}/segments`,
                ),
            ),
            track(
                'leaderboards',
                apiFetch<CategoryLeaderboardResult>(
                    `/games/${safeEncodeURI(game)}/${safeEncodeURI(category)}`,
                ),
            ),
            track('playtime', getAdvancedUserStats(username, '0')),
            track(
                'streaks',
                apiFetch<StreaksResult>(`/users/${username}/streaks`),
            ),
            deck === 'post'
                ? track('live', getLiveRunForUser(username))
                : Promise.resolve(null),
        ]);

    if (!history) return null; // no splits history → no deck

    const splits = buildSplits(history);
    const finishedRuns = buildFinishedRuns(history);

    const attemptCount = Number(run.attemptCount) || 0;
    const finishedAttemptCount = Number(run.finishedAttemptCount) || 0;

    const community: DossierCommunity | null = segments
        ? {
              userCount: segments.userCount,
              segments: segments.communityBests.map((cb) => {
                  const mine = segments.users
                      .find(
                          (u) =>
                              u.username.toLowerCase() ===
                              username.toLowerCase(),
                      )
                      ?.segments.find((s) => s.index === cb.index);
                  const ladder = cb.percentiles?.avgSegment;
                  const userAvgMs = toMs(mine?.avgSegmentLast10);
                  return {
                      index: cb.index,
                      name: cb.name,
                      userAvgMs,
                      percentile:
                          userAvgMs !== null && ladder
                              ? communityPercentile(userAvgMs, ladder)
                              : null,
                  };
              }),
          }
        : null;

    const catBoard = leaderboard?.categoryLeaderboards?.find(
        (c) => c.categoryName.toLowerCase() === category.toLowerCase(),
    );
    const pbEntry = catBoard?.pbLeaderboard?.find(
        (e) => e.username.toLowerCase() === username.toLowerCase(),
    );
    const leaderboards: DossierLeaderboards | null = catBoard
        ? {
              pbPlacing: pbEntry?.placing ?? null,
              entrants: catBoard.pbLeaderboard?.length ?? null,
          }
        : null;

    const form: DossierForm | null = playtime
        ? buildForm(
              playtime.playtimePerDayMap ?? {},
              streaks?.currentStartedStreak?.length ?? null,
          )
        : null;

    const postRun =
        deck === 'post' && live
            ? postRunFromLive(live, splits, 'live')
            : deck === 'post' && history
              ? postRunFromHistory(history, splits)
              : null;

    return {
        deck,
        generatedAt: new Date().toISOString(),
        runner: {
            username,
            picture: profile?.picture,
            country: profile?.country,
            pronouns: profile?.pronouns,
        },
        game: {
            game,
            display: gameGlobal?.display ?? game,
            category,
            image: gameGlobal?.image,
        },
        core: {
            pbMs: toMs(run.personalBest),
            sobMs: toMs(run.sumOfBests),
            attemptCount,
            finishedAttemptCount,
            finishRate:
                attemptCount > 0 ? finishedAttemptCount / attemptCount : 0,
            categoryPlaytimeMs: toMs(run.totalRunTime),
        },
        splits,
        finishedRuns,
        community,
        leaderboards,
        form,
        postRun,
        sources,
    };
};

const buildForm = (
    playtimePerDayMap: Record<string, { total: number }>,
    currentStreakDays: number | null,
): DossierForm => {
    const now = Date.now();
    const cutoff = now - 14 * 24 * 3600_000;
    let total = 0;
    let activeDays = 0;
    for (const [day, value] of Object.entries(playtimePerDayMap)) {
        const t = new Date(day).getTime();
        if (Number.isFinite(t) && t >= cutoff && t <= now && value?.total) {
            total += value.total;
            activeDays += 1;
        }
    }
    return {
        last14dPlaytimeMs: total > 0 ? total : null,
        last14dActiveDays: activeDays > 0 ? activeDays : null,
        currentStreakDays,
    };
};
```

Implementation notes for the executor:

- `getAdvancedUserStats` and the segments/leaderboard endpoints are loosely typed upstream — the local interfaces above are intentionally minimal. If a response doesn't match (log it), adjust the local interface, never the shared dossier types.
- `getRun`'s `run` param is the category (matches `Run.run`). If `getRun(username, game, category)` 404s, try `getUserRuns(username)` and match `r.game === game && r.run === category` case-insensitively before giving up — game/category casing from URLs is unreliable. Encode this fallback in `getRunnerDossier`.
- The `'use cache'` scope: `new Date()` inside is fine (assembly time, cached with entry).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean. (`LiveRun.events` may be optional-mismatched; fix with optional chaining as shown.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/fast50
git commit -m "feat(fast50): server-side runner dossier assembly"
```

---

### Task 8: Capture layer (localStorage store + websocket hook)

**Files:**
- Create: `src/components/fast50/capture/capture-store.ts`, `src/components/fast50/capture/use-run-capture.ts`
- Test: `src/components/fast50/__tests__/capture-store.test.ts`

**Interfaces:**
- Produces:
  - `captureKey(username: string, game: string, category: string): string` — normalized (lowercase, trimmed) `fast50-capture:{user}:{game}:{category}`.
  - `saveCapture(storage: Pick<Storage, 'setItem'>, run: LiveRun): void` — serializes `{ savedAt: string; run: LiveRun }`.
  - `loadCapture(storage: Pick<Storage, 'getItem'>, username: string, game: string, category: string): { savedAt: string; run: LiveRun } | null` — `null` on missing/corrupt JSON.
  - `useRunCapture(username: string | null): { lastEvent: string | null }` — client hook; subscribes `useLiveRunsWebsocket(username)`, writes every `UPDATE` for that user into localStorage via `saveCapture`. Passing `null` disables.
- Storage is injected (`Pick<Storage, …>`) so tests run in node without jsdom.

- [ ] **Step 1: Write failing store tests**

`src/components/fast50/__tests__/capture-store.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import {
    captureKey,
    loadCapture,
    saveCapture,
} from '../capture/capture-store';

const fakeStorage = () => {
    const map = new Map<string, string>();
    return {
        setItem: (k: string, v: string) => void map.set(k, v),
        getItem: (k: string) => map.get(k) ?? null,
    };
};

const run = {
    user: 'Runner',
    game: 'My Game',
    category: 'Any%',
    currentTime: 123,
} as LiveRun;

describe('capture store', () => {
    test('key is normalized', () => {
        expect(captureKey(' Runner ', 'My Game', 'ANY%')).toBe(
            'fast50-capture:runner:my game:any%',
        );
    });
    test('round-trips a run', () => {
        const storage = fakeStorage();
        saveCapture(storage, run);
        const loaded = loadCapture(storage, 'runner', 'my game', 'any%');
        expect(loaded?.run.currentTime).toBe(123);
        expect(loaded?.savedAt).toBeTruthy();
    });
    test('null on corrupt json', () => {
        const storage = fakeStorage();
        storage.setItem('fast50-capture:runner:my game:any%', '{nope');
        expect(loadCapture(storage, 'runner', 'my game', 'any%')).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests, verify fail**

Run: `npm run test`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `capture-store.ts`**

```typescript
import type { LiveRun } from '~app/(new-layout)/live/live.types';

export interface CapturedRun {
    savedAt: string;
    run: LiveRun;
}

const norm = (s: string) => s.trim().toLowerCase();

export const captureKey = (
    username: string,
    game: string,
    category: string,
): string => `fast50-capture:${norm(username)}:${norm(game)}:${norm(category)}`;

export const saveCapture = (
    storage: Pick<Storage, 'setItem'>,
    run: LiveRun,
): void => {
    const payload: CapturedRun = {
        savedAt: new Date().toISOString(),
        run,
    };
    storage.setItem(
        captureKey(run.user, run.game, run.category),
        JSON.stringify(payload),
    );
};

export const loadCapture = (
    storage: Pick<Storage, 'getItem'>,
    username: string,
    game: string,
    category: string,
): CapturedRun | null => {
    const raw = storage.getItem(captureKey(username, game, category));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as CapturedRun;
        return parsed?.run ? parsed : null;
    } catch {
        return null;
    }
};
```

- [ ] **Step 4: Run tests, verify pass; implement the hook**

Run: `npm run test` → pass. Then `use-run-capture.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import type { WebsocketLiveRunMessage } from '~app/(new-layout)/live/live.types';
import { useLiveRunsWebsocket } from '~src/components/websocket/use-reconnect-websocket';
import { saveCapture } from './capture-store';

export const useRunCapture = (
    username: string | null,
): { lastEvent: string | null } => {
    const [lastEvent, setLastEvent] = useState<string | null>(null);
    const message = useLiveRunsWebsocket<WebsocketLiveRunMessage>(
        username ?? undefined,
    );

    useEffect(() => {
        if (!username || !message || message.type !== 'UPDATE') return;
        if (message.user.toLowerCase() !== username.toLowerCase()) return;
        if (!message.run?.isMinified) {
            saveCapture(window.localStorage, message.run);
            setLastEvent(new Date().toISOString());
        }
    }, [message, username]);

    return { lastEvent };
};
```

Executor note: check `useLiveRunsWebsocket`'s actual return — it returns the last JSON message (`lastJsonMessage`); if it returns `{ lastJsonMessage, … }` instead, adapt destructuring (read `use-reconnect-websocket.ts:40-70` first). Also verify whether per-user websocket messages carry full (non-minified) runs; if they are minified, fall back to fetching `/api/live/${username}` on each message and persisting that response.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` → clean.

```bash
git add src/components/fast50
git commit -m "feat(fast50): live-run capture layer for post-run reliability"
```

---

### Task 9: Deck framework — state machine, keyboard, layout, primitives

**Files:**
- Create: `src/components/fast50/deck/deck-state.ts`, `src/components/fast50/deck/deck.tsx`, `src/components/fast50/deck/primitives.tsx`, `src/components/fast50/deck/fast50.module.scss`, `app/(fast50)/layout.tsx`
- Test: `src/components/fast50/__tests__/deck-state.test.ts`

**Interfaces:**
- Consumes: `ComposedSlide` from `./compose-deck`; `RunnerDossier`.
- Produces:
  - `deckReducer(state: DeckState, action: DeckAction): DeckState` with `DeckState = { slideIndex: number; stage: number; blackout: boolean }`, `DeckAction = { type: 'ADVANCE' | 'BACK' | 'TOGGLE_BLACKOUT' | 'GOTO'; slideCount: number; stagesPerSlide: number; index?: number }`. `STAGES_PER_SLIDE = 3` (0 = headline, 1 = hero number, 2 = chart/detail).
  - `<Deck dossier={RunnerDossier} slides={ComposedSlide[]} />` — client component, registered in Task 10+ via `SLIDE_COMPONENTS: Partial<Record<SlideId, SlideComponent>>` where `type SlideComponent = React.ComponentType<{ dossier: RunnerDossier; evaluation: SlideEvaluation; stage: number }>`.
  - Primitives (used by all slides): `SlideShell` (props: `kicker: string; headline: string; stage: number; backdrop?: string; danger?: boolean; children?`), `BigNumber` (props: `value: number; format?: (n: number) => string; play: boolean` — react-countup, ~1.2s), `Reveal` (props: `when: boolean; children` — opacity/translate transition), `TimeText` (tabular-numerals time), SVG chart primitives added per-slide in later tasks but living in `primitives.tsx`.

- [ ] **Step 1: Write failing reducer tests**

`src/components/fast50/__tests__/deck-state.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { deckReducer, initialDeckState } from '../deck/deck-state';

const ctx = { slideCount: 3, stagesPerSlide: 3 };

describe('deckReducer', () => {
    test('advance walks stages then slides', () => {
        let s = initialDeckState;
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s).toMatchObject({ slideIndex: 0, stage: 1 });
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s).toMatchObject({ slideIndex: 1, stage: 0 });
    });
    test('advance clamps at the last stage of the last slide', () => {
        let s = { slideIndex: 2, stage: 2, blackout: false };
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s).toMatchObject({ slideIndex: 2, stage: 2 });
    });
    test('back returns to the previous slide fully revealed', () => {
        let s = { slideIndex: 1, stage: 1, blackout: false };
        s = deckReducer(s, { type: 'BACK', ...ctx });
        expect(s).toMatchObject({ slideIndex: 0, stage: 2 });
        s = deckReducer(s, { type: 'BACK', ...ctx });
        expect(s).toMatchObject({ slideIndex: 0, stage: 2 });
    });
    test('goto jumps fully revealed; blackout toggles and unsets on advance', () => {
        let s = deckReducer(initialDeckState, {
            type: 'GOTO',
            index: 2,
            ...ctx,
        });
        expect(s).toMatchObject({ slideIndex: 2, stage: 2 });
        s = deckReducer(s, { type: 'TOGGLE_BLACKOUT', ...ctx });
        expect(s.blackout).toBe(true);
        s = deckReducer(s, { type: 'ADVANCE', ...ctx });
        expect(s.blackout).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests, verify fail; implement `deck-state.ts`**

```typescript
export interface DeckState {
    slideIndex: number;
    stage: number;
    blackout: boolean;
}

export interface DeckAction {
    type: 'ADVANCE' | 'BACK' | 'TOGGLE_BLACKOUT' | 'GOTO';
    slideCount: number;
    stagesPerSlide: number;
    index?: number;
}

export const STAGES_PER_SLIDE = 3;

export const initialDeckState: DeckState = {
    slideIndex: 0,
    stage: 0,
    blackout: false,
};

export const deckReducer = (
    state: DeckState,
    action: DeckAction,
): DeckState => {
    const lastStage = action.stagesPerSlide - 1;
    const lastSlide = action.slideCount - 1;
    switch (action.type) {
        case 'ADVANCE': {
            if (state.blackout) return { ...state, blackout: false };
            if (state.stage < lastStage)
                return { ...state, stage: state.stage + 1 };
            if (state.slideIndex < lastSlide)
                return { ...state, slideIndex: state.slideIndex + 1, stage: 0 };
            return state;
        }
        case 'BACK': {
            if (state.slideIndex > 0)
                return {
                    ...state,
                    slideIndex: state.slideIndex - 1,
                    stage: lastStage,
                };
            return { ...state, stage: lastStage };
        }
        case 'GOTO':
            return {
                ...state,
                slideIndex: Math.min(Math.max(action.index ?? 0, 0), lastSlide),
                stage: lastStage,
            };
        case 'TOGGLE_BLACKOUT':
            return { ...state, blackout: !state.blackout };
    }
};
```

Run: `npm run test` → pass.

- [ ] **Step 3: Chromeless layout**

`app/(fast50)/layout.tsx` (the root `app/layout.tsx` already provides `<html>/<body>` + font):

```tsx
import React from 'react';
import '../(new-layout)/styles/_imports.scss';

export default function Fast50Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div data-bs-theme="dark" style={{ minHeight: '100dvh' }}>
            {children}
        </div>
    );
}
```

Executor note: verify `_imports.scss` doesn't force a page background that fights the deck; the deck sets its own background via the module scss. If the (new-layout) global styles pull in heavy chrome CSS, trim to the token/bootstrap imports actually needed.

- [ ] **Step 4: Design tokens + shell styles**

Load the `frontend-design:frontend-design` skill now — it guides the aesthetic choices below. `fast50.module.scss` establishes (exact values are the starting point; refine during Task 10 visual review):

```scss
.stage {
    // the 1920x1080 canvas
    position: fixed;
    inset: 0;
    background: #07090d;
    color: #f2f5f9;
    overflow: hidden;
    font-variant-numeric: tabular-nums;

    --accent: #21c96e; // therun green, brightened for dark bg
    --danger: #ff4d5e;
    --gold: #ffd24d;
    --muted: #8a93a3;
}

.kicker {
    font-size: clamp(20px, 1.6vw, 32px);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 700;
}

.headline {
    font-size: clamp(40px, 4.2vw, 84px);
    font-weight: 800;
    line-height: 1.05;
    max-width: 26ch;
}

.hero {
    // the one huge number
    font-size: clamp(120px, 16vw, 300px);
    font-weight: 800;
    line-height: 0.9;
}

.backdrop {
    position: absolute;
    inset: 0;
    opacity: 0.08;
    display: flex;
    justify-content: flex-end;
    img { height: 100%; width: auto; }
    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, #07090d 30%, transparent 80%);
    }
}

.blackout {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 10;
}

.hud {
    // slide dots; only visible on mouse move (deck.tsx toggles .hudVisible)
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.3s;
    &.hudVisible { opacity: 1; }
}

.reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
    &.revealed { opacity: 1; transform: none; }
}
```

- [ ] **Step 5: Primitives + Deck controller**

`primitives.tsx`:

```tsx
'use client';

import clsx from 'clsx';
import React from 'react';
import CountUp from 'react-countup';
import { GameImage } from '~src/components/image/gameimage';
import styles from './fast50.module.scss';

export const Reveal = ({
    when,
    children,
    className,
}: {
    when: boolean;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={clsx(styles.reveal, when && styles.revealed, className)}>
        {children}
    </div>
);

export const BigNumber = ({
    value,
    play,
    format,
}: {
    value: number;
    play: boolean;
    format?: (n: number) => string;
}) => (
    <div className={styles.hero}>
        {play ? (
            <CountUp
                end={value}
                duration={1.4}
                separator=","
                formattingFn={format}
            />
        ) : (
            <span style={{ opacity: 0 }}>{format ? format(value) : value}</span>
        )}
    </div>
);

export const SlideShell = ({
    kicker,
    headline,
    stage,
    backdrop,
    danger,
    children,
}: {
    kicker: string;
    headline: string;
    stage: number;
    backdrop?: string;
    danger?: boolean;
    children?: React.ReactNode;
}) => (
    <div className={styles.slide} data-danger={danger || undefined}>
        {backdrop ? (
            <div className={styles.backdrop}>
                <GameImage src={backdrop} quality="hd" alt="" fill={false} />
            </div>
        ) : null}
        <div className={styles.slideContent}>
            <div className={styles.kicker}>{kicker}</div>
            <Reveal when={stage >= 0}>
                <h1 className={styles.headline}>{headline}</h1>
            </Reveal>
            {children}
        </div>
    </div>
);
```

(Add `.slide` / `.slideContent` — full-viewport flex column, generous padding ~6vw, content bottom-anchored — to the module scss.)

`deck.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useReducer, useRef, useState } from 'react';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';
import type { ComposedSlide } from './compose-deck';
import {
    deckReducer,
    initialDeckState,
    STAGES_PER_SLIDE,
} from './deck-state';
import type { SlideEvaluation, SlideId } from './evaluators';
import styles from './fast50.module.scss';

export type SlideComponent = React.ComponentType<{
    dossier: RunnerDossier;
    evaluation: SlideEvaluation;
    stage: number;
}>;

export const Deck = ({
    dossier,
    slides,
    components,
}: {
    dossier: RunnerDossier;
    slides: ComposedSlide[];
    components: Partial<Record<SlideId, SlideComponent>>;
}) => {
    const router = useRouter();
    const renderable = slides.filter((s) => components[s.id]);
    const [state, dispatch] = useReducer(deckReducer, initialDeckState);
    const [hudVisible, setHudVisible] = useState(false);
    const hudTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const ctx = {
        slideCount: renderable.length,
        stagesPerSlide: STAGES_PER_SLIDE,
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
                e.preventDefault();
                dispatch({ type: 'ADVANCE', ...ctx });
            } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
                e.preventDefault();
                dispatch({ type: 'BACK', ...ctx });
            } else if (e.key.toLowerCase() === 'b') {
                dispatch({ type: 'TOGGLE_BLACKOUT', ...ctx });
            } else if (e.key === 'Escape') {
                router.push('/fast50/screen');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ctx.slideCount, router]);

    useEffect(() => {
        const onMove = () => {
            setHudVisible(true);
            clearTimeout(hudTimer.current);
            hudTimer.current = setTimeout(() => setHudVisible(false), 2000);
        };
        window.addEventListener('mousemove', onMove);
        return () => window.removeEventListener('mousemove', onMove);
    }, []);

    const current = renderable[state.slideIndex];
    if (!current) return null;
    const Component = components[current.id] as SlideComponent;

    return (
        <div className={styles.stage}>
            <Component
                key={current.id}
                dossier={dossier}
                evaluation={current.evaluation}
                stage={state.stage}
            />
            {state.blackout ? <div className={styles.blackout} /> : null}
            <div
                className={`${styles.hud} ${hudVisible ? styles.hudVisible : ''}`}
            >
                {renderable.map((s, i) => (
                    <button
                        key={s.id}
                        type="button"
                        title={s.id}
                        data-active={i === state.slideIndex || undefined}
                        data-overflow={s.overflow || undefined}
                        onClick={() =>
                            dispatch({ type: 'GOTO', index: i, ...ctx })
                        }
                    />
                ))}
            </div>
        </div>
    );
};
```

Executor notes: overflow slides render dimmer HUD dots (style via `data-overflow`); a thin vertical divider dot between main deck and overflow is a nice touch. React Compiler is on — write idiomatic hooks, no manual memo.

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck` → clean. `npm run test` → pass.

```bash
git add 'app/(fast50)' src/components/fast50
git commit -m "feat(fast50): chromeless layout, deck state machine and primitives"
```

---

### Task 10: Anchor slides + deck page + demo route (first visible milestone)

**Files:**
- Create: `src/components/fast50/slides/intro-slide.tsx`, `src/components/fast50/slides/roadmap-slide.tsx`, `src/components/fast50/slides/result-slide.tsx`, `src/components/fast50/slides/slide-registry.tsx`, `app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx`, `app/(fast50)/fast50/screen/demo/page.tsx`, `app/(fast50)/fast50/screen/demo/demo.tsx`

**Interfaces:**
- Consumes: `Deck`, `SlideComponent`, primitives, `composeDeck`, `getRunnerDossier`, `FIXTURES`/`fixturePost`, `formatTimeMs`, `formatDelta`.
- Produces: `SLIDE_COMPONENTS` in `slide-registry.tsx` — single registry object every later slide task adds to. Deck page URL contract: `/fast50/screen/{username}/{game}/{category}?deck=pre|post`.

- [ ] **Step 1: Intro slide**

`intro-slide.tsx`:

```tsx
'use client';

import React from 'react';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import { Reveal, SlideShell } from '../deck/primitives';
import styles from '../deck/fast50.module.scss';

export const IntroSlide: SlideComponent = ({ dossier, stage }) => (
    <SlideShell
        kicker="Next up"
        headline={dossier.runner.username}
        stage={stage}
        backdrop={dossier.game.image}
    >
        <Reveal when={stage >= 1}>
            <div className={styles.introGame}>
                {dossier.game.display} — {dossier.game.category}
            </div>
        </Reveal>
        <Reveal when={stage >= 2}>
            <div className={styles.statRow}>
                <div>
                    <span className={styles.statLabel}>Personal best</span>
                    <span className={styles.statValue}>
                        {formatTimeMs(dossier.core.pbMs)}
                    </span>
                </div>
                <div>
                    <span className={styles.statLabel}>Attempts</span>
                    <span className={styles.statValue}>
                        {dossier.core.attemptCount.toLocaleString()}
                    </span>
                </div>
                {dossier.leaderboards?.pbPlacing ? (
                    <div>
                        <span className={styles.statLabel}>therun.gg rank</span>
                        <span className={styles.statValue}>
                            #{dossier.leaderboards.pbPlacing}
                        </span>
                    </div>
                ) : null}
            </div>
        </Reveal>
    </SlideShell>
);
```

Add `.introGame`, `.statRow`, `.statLabel`, `.statValue` styles (stat row: flex, gap 4vw; label small caps muted; value clamp(36px, 3.4vw, 64px) bold). Show runner avatar (`dossier.runner.picture`, rounded, ~180px) beside the headline when present.

- [ ] **Step 2: Roadmap slide**

`roadmap-slide.tsx` — the weatherman map. Horizontal SVG track (1600×~300): X = cumulative avg time (`roadmap(dossier.splits)`), one node per landmark. For readability cap labels at ~8 landmarks (evenly sample by time if more, always keeping the danger split and the final split). Danger split node uses `--danger` with a pulse; final node uses `--accent`. Under each node: split name + clock time (`formatTimeMs(atMs)`). Stage 1 draws the track line (SVG `stroke-dashoffset` transition 1s); stage 2 pops the nodes in sequence (staggered `transition-delay: i * 90ms`).

```tsx
'use client';

import React from 'react';
import { dangerSplit, roadmap } from '~src/lib/fast50/compute';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import { SlideShell } from '../deck/primitives';
import styles from '../deck/fast50.module.scss';

const W = 1600;
const TRACK_Y = 120;

export const RoadmapSlide: SlideComponent = ({ dossier, stage }) => {
    const road = roadmap(dossier.splits);
    const danger = dangerSplit(dossier.splits);
    if (road.length === 0) return null;
    const totalMs = road[road.length - 1].atMs;

    // Cap visible landmarks at 8: always keep first, last, danger.
    const keep = new Set<number>([road[0].index, road[road.length - 1].index]);
    if (danger) keep.add(danger.split.index);
    const rest = road.filter((r) => !keep.has(r.index));
    const step = Math.ceil(rest.length / Math.max(1, 8 - keep.size));
    const visible = road.filter(
        (r, i) => keep.has(r.index) || i % step === 0,
    );

    return (
        <SlideShell kicker="The road ahead" headline="Know the map" stage={stage}>
            <svg
                viewBox={`0 0 ${W} 300`}
                className={styles.roadmapSvg}
                role="img"
                aria-label="Run roadmap"
            >
                <line
                    x1={40}
                    y1={TRACK_Y}
                    x2={W - 40}
                    y2={TRACK_Y}
                    className={styles.roadTrack}
                    data-drawn={stage >= 1 || undefined}
                />
                {visible.map((r, i) => {
                    const x = 40 + (r.atMs / totalMs) * (W - 80);
                    const isDanger = danger?.split.index === r.index;
                    return (
                        <g
                            key={r.index}
                            className={styles.roadNode}
                            data-visible={stage >= 2 || undefined}
                            data-danger={isDanger || undefined}
                            style={{ transitionDelay: `${i * 90}ms` }}
                        >
                            <circle cx={x} cy={TRACK_Y} r={isDanger ? 14 : 9} />
                            <text x={x} y={TRACK_Y + 52} textAnchor="middle">
                                {r.name}
                            </text>
                            <text
                                x={x}
                                y={TRACK_Y + 88}
                                textAnchor="middle"
                                className={styles.roadClock}
                            >
                                {formatTimeMs(r.atMs)}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </SlideShell>
    );
};
```

- [ ] **Step 3: Result slide (post anchor)**

`result-slide.tsx`: kicker "Final time"; stage 1 → `BigNumber` with `formatTimeMs` of `postRun.finalTimeMs`; stage 2 → delta line vs typical (`forecastBands(dossier.finishedRuns)?.p50Ms`): `formatDelta(finalTimeMs - p50Ms)` with tone color and label "vs typical run"; if `finalTimeMs < (core.pbMs ?? Infinity)` render a `NEW PB` badge (gold, scale-in). Full JSX follows the intro-slide pattern with `BigNumber play={stage >= 1}`.

- [ ] **Step 4: Registry**

`slide-registry.tsx`:

```tsx
import type { SlideId } from '../deck/evaluators';
import type { SlideComponent } from '../deck/deck';
import { IntroSlide } from './intro-slide';
import { ResultSlide } from './result-slide';
import { RoadmapSlide } from './roadmap-slide';

export const SLIDE_COMPONENTS: Partial<Record<SlideId, SlideComponent>> = {
    intro: IntroSlide,
    roadmap: RoadmapSlide,
    result: ResultSlide,
};
```

- [ ] **Step 5: Deck page**

`app/(fast50)/fast50/screen/[username]/[game]/[category]/page.tsx`:

```tsx
import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { Deck } from '~src/components/fast50/deck/deck';
import { SLIDE_COMPONENTS } from '~src/components/fast50/slides/slide-registry';
import { getRunnerDossier } from '~src/lib/fast50/dossier';

export default async function DeckPage({
    params,
    searchParams,
}: {
    params: Promise<{ username: string; game: string; category: string }>;
    searchParams: Promise<{ deck?: string }>;
}) {
    const { username, game, category } = await params;
    const { deck } = await searchParams;
    const kind = deck === 'post' ? 'post' : 'pre';
    const dossier = await getRunnerDossier(
        decodeURIComponent(username),
        decodeURIComponent(game),
        decodeURIComponent(category),
        kind,
    );
    if (!dossier) {
        return (
            <main style={{ padding: '20vh 10vw', fontSize: 24 }}>
                No data found for this runner/game/category.
            </main>
        );
    }
    return (
        <Deck
            dossier={dossier}
            slides={composeDeck(dossier)}
            components={SLIDE_COMPONENTS}
        />
    );
}
```

Post-run capture override (client side): in `deck.tsx`, on mount when `dossier.deck === 'post'`, `loadCapture(window.localStorage, …)` and, if present, recompute `postRun` with `postRunFromLive(captured.run, dossier.splits, 'capture')` and — when non-null — use `{ ...dossier, postRun }` and recompose slides via `composeDeck`. Implement as a `useMemo` at the top of `Deck`.

- [ ] **Step 6: Demo route**

`app/(fast50)/fast50/screen/demo/page.tsx` renders `demo.tsx` (client): reads `?fixture=grinder|prodigy|sparse&deck=pre|post` via `useSearchParams` (wrap in `<Suspense>` in page.tsx), picks `FIXTURES[f]` or `fixturePost[f]`, renders `<Deck …>` identically, plus a small fixture-switcher link row in the HUD corner.

- [ ] **Step 7: Visual verification (the important one)**

```bash
npm run dev
```

Open `http://localhost:3000/fast50/screen/demo?fixture=grinder&deck=pre` at a 1920×1080 viewport.

Verify: intro → roadmap sequence; stages reveal on ArrowRight; count-up plays once per slide; roadmap track draws then nodes stagger in; danger node pulses red; `B` blacks out; Esc navigates. Then run `/critique` from the interface-design plugin if available, or self-critique against the frontend-design skill: does this look like broadcast graphics or like a website? Iterate on the SCSS until the former. Screenshot for the session log.

Also verify a real dossier: `http://localhost:3000/fast50/screen/{a-known-user}/{their-game}/{their-category}?deck=pre` (pick any live-run user from therun.gg frontpage).

- [ ] **Step 8: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add 'app/(fast50)' src/components/fast50
git commit -m "feat(fast50): anchor slides, deck page and demo route"
```

---

### Task 11: Pre-run pool slides

**Files:**
- Create: `src/components/fast50/slides/grind-slide.tsx`, `one-shot-slide.tsx`, `danger-zone-slide.tsx`, `world-class-slide.tsx`, `profile-slide.tsx`, `forecast-slide.tsx`, `form-check-slide.tsx` (same dir)
- Modify: `src/components/fast50/slides/slide-registry.tsx` (register all), `src/components/fast50/deck/primitives.tsx` (+`DistributionStrip`, `PercentileBars`), `fast50.module.scss`

**Interfaces:**
- Consumes: `SlideComponent`, primitives, compute helpers, `evaluation.headline` (slides render their evaluator's headline — single source of truth for copy).
- Produces: new primitives:
  - `DistributionStrip({ values, bands, markers, play }: { values: number[]; bands?: { p10: number; p50: number; p90: number }; markers?: { label: string; atMs: number; tone: 'accent' | 'gold' | 'muted' }[]; play: boolean })` — horizontal strip plot: each value a translucent tick, optional p10/p50/p90 shaded band, labeled vertical marker lines. SVG 1600×220.
  - `PercentileBars({ items, play }: { items: { label: string; percentile: number }[]; play: boolean })` — horizontal bars, length = `100 - percentile`, best highlighted in `--accent`.

Slides are one-idea screens: kicker + evaluator headline + ONE hero element. All use `evaluation.headline` as the `<SlideShell headline>`. Stage plan everywhere: 0 = headline, 1 = hero number/chart, 2 = supporting detail.

- [ ] **Step 1: Grind slide**

```tsx
'use client';

import React from 'react';
import type { SlideComponent } from '../deck/deck';
import { BigNumber, Reveal, SlideShell } from '../deck/primitives';
import styles from '../deck/fast50.module.scss';

export const GrindSlide: SlideComponent = ({ dossier, evaluation, stage }) => {
    const hours = dossier.core.categoryPlaytimeMs
        ? Math.round(dossier.core.categoryPlaytimeMs / 3600_000)
        : null;
    return (
        <SlideShell kicker="The grind" headline={evaluation.headline} stage={stage}>
            <BigNumber value={dossier.core.attemptCount} play={stage >= 1} />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    {hours !== null
                        ? `${hours.toLocaleString()} hours in this category alone`
                        : 'attempts and counting'}
                </div>
            </Reveal>
        </SlideShell>
    );
};
```

- [ ] **Step 2: One Shot slide**

Same shape: kicker "One shot"; `BigNumber value={Math.round((1 - dossier.core.finishRate) * 100)} format={(n) => `${n}%`}`; stage 2 sub-line: `of attempts never see the credits — tonight there are no retries`.

- [ ] **Step 3: Danger Zone slide**

The roadmap re-used with a zoom: render the same track as `RoadmapSlide` but dim everything except the danger split; add a red vertical band around it. Above the track, stage 1 reveals `BigNumber value={Math.round(danger.split.resetShare * 100)} format={(n) => `${n}%`}` ("of all resets happen here"). Stage 2 reveals the viewer cue line:

```tsx
<Reveal when={stage >= 2}>
    <div className={styles.watchCue}>
        Watch for it around {formatTimeMs(danger.startsAtMs)}
        {danger.afterName ? `, right after ${danger.afterName}` : ''}.
        Still alive after {danger.split.name}? Start believing.
    </div>
</Reveal>
```

Guard: component returns `null` if `dangerSplit(dossier.splits)` is null (composer already prevents this; belt and suspenders). Extract the track rendering from `RoadmapSlide` into a shared `RoadTrack` component in `primitives.tsx` rather than duplicating the SVG (both slides pass `highlightIndex?: number`).

- [ ] **Step 4: World Class slide**

Kicker "World class". Hero = `PercentileBars` of the runner's best 5 community segments (`dossier.community.segments` with non-null percentile, sorted ascending, slice 5), `play={stage >= 1}`. Stage 2 sub-line: `measured against ${dossier.community.userCount} runners of this game on therun.gg`.

- [ ] **Step 5: Profile slide**

Kicker "The profile". Hero = `BigNumber` of `Math.round(finishRate * 100)` with `%` format. Stage 2: two-column mini-stats — attempts started vs finished (`attemptCount.toLocaleString()` / `finishedAttemptCount.toLocaleString()`).

- [ ] **Step 6: Forecast slide**

```tsx
'use client';

import React from 'react';
import { forecastBands } from '~src/lib/fast50/compute';
import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import type { SlideComponent } from '../deck/deck';
import { DistributionStrip, Reveal, SlideShell } from '../deck/primitives';
import styles from '../deck/fast50.module.scss';

export const ForecastSlide: SlideComponent = ({
    dossier,
    evaluation,
    stage,
}) => {
    const bands = forecastBands(dossier.finishedRuns);
    if (!bands) return null;
    const markers = [
        ...(dossier.core.pbMs
            ? [{ label: 'PB', atMs: dossier.core.pbMs, tone: 'gold' as const }]
            : []),
        ...(dossier.core.sobMs
            ? [
                  {
                      label: 'Sum of bests',
                      atMs: dossier.core.sobMs,
                      tone: 'muted' as const,
                  },
              ]
            : []),
    ];
    return (
        <SlideShell
            kicker="Tonight's forecast"
            headline={evaluation.headline}
            stage={stage}
        >
            <DistributionStrip
                values={dossier.finishedRuns.slice(-20).map((r) => r.timeMs)}
                bands={{ p10: bands.p10Ms, p50: bands.p50Ms, p90: bands.p90Ms }}
                markers={markers}
                play={stage >= 1}
            />
            <Reveal when={stage >= 2}>
                <div className={styles.subStat}>
                    based on the last {bands.sample} finished runs — typical
                    finish {formatTimeMs(bands.p50Ms)}
                </div>
            </Reveal>
        </SlideShell>
    );
};
```

- [ ] **Step 7: Form Check slide**

Kicker "Form check". Hero = `BigNumber` of hours in last 14 days. Stage 2: `active ${form.last14dActiveDays} of the last 14 days` + (`currentStreakDays` ? ` — on a ${n}-day streak` : ''). Component returns `null` without `form.last14dPlaytimeMs`.

- [ ] **Step 8: Register, verify visually, commit**

Register all seven in `SLIDE_COMPONENTS`. Run `npm run dev`; walk `demo?fixture=grinder&deck=pre` and `demo?fixture=prodigy&deck=pre` end-to-end; verify grinder shows grind/one-shot/danger-zone and prodigy shows world-class/profile; sparse fixture shows anchors + ≤2. Verify every slide reads from across a room (squint test). `npm run test && npm run typecheck && npm run lint`.

```bash
git add src/components/fast50
git commit -m "feat(fast50): pre-run slide pool"
```

---

### Task 12: Post-run slides

**Files:**
- Create: `src/components/fast50/slides/where-it-lands-slide.tsx`, `survived-slide.tsx`, `gold-rush-slide.tsx`, `story-of-run-slide.tsx`, `the-table-slide.tsx`, `zoom-out-slide.tsx`
- Modify: `slide-registry.tsx`, `primitives.tsx` (+`DeltaBars`), `fast50.module.scss`

**Interfaces:**
- Consumes: `dossier.postRun` (non-null — composer guarantees; still guard with `if (!postRun) return null`), `runRank`, `runPercentile`, `DistributionStrip`.
- Produces: `DeltaBars({ items, play }: { items: { label: string; deltaMs: number; gold?: boolean }[]; play: boolean })` — vertical bars from a zero baseline, negative (faster) down in `--accent`, positive up in `--danger`, gold splits star-marked in `--gold`. SVG 1600×420, bars stagger in.

- [ ] **Step 1: Where It Lands**

Hero = `DistributionStrip` over ALL `finishedRuns` times with a single animated marker for tonight's `postRun.finalTimeMs` (tone `accent`, drops in at stage 1 with a bounce — CSS `transform-origin` top, `cubic-bezier(0.34, 1.56, 0.64, 1)`). Stage 2 sub-line: `#${runRank(...)} of ${finishedRuns.length} finished runs — top ${100 - runPercentile(...)}%`.

- [ ] **Step 2: Survived**

Re-use `RoadTrack` with the danger split highlighted, but now stamped with a check state (`--accent` fill instead of pulsing red). Hero number at stage 1: survival rate `BigNumber` (`Math.round((1 - danger.split.resetShare) * 100)`, format `${n}%` with label "of runs make it past — tonight's did"). Uses evaluator headline for the payoff copy.

- [ ] **Step 3: Gold Rush**

Kicker "Gold rush". Stage 1: `BigNumber` gold count with `--gold` color. Stage 2: list each gold — `postRun.splits.filter((s) => s.isGold)` → `${s.name} — ${formatTimeMs(s.goldSaveMs)} faster than ever before`, staggered `Reveal`s. If backend `postRun.events` contains `best_run_ever_event`, append its `description` as a bonus line.

- [ ] **Step 4: Story of the Run**

Hero = `DeltaBars` of `postRun.splits` with non-null `deltaVsAvgMs`: `items = splits.map((s) => ({ label: s.name, deltaMs: s.deltaVsAvgMs, gold: s.isGold }))`. If more than 12 splits, keep the 12 largest `|deltaMs|` (always keeping golds). Stage 2 sub-line names the biggest save and the biggest loss: `Won at ${maxSave.name}, nearly died at ${maxLoss.name}`.

- [ ] **Step 5: The Table**

Kicker "What could have been". Stage 1: `BigNumber` of total `timeLeft` (sum over splits of `max(0, singleMs - goldMs)`, same as the evaluator) formatted with `formatTimeMs`. Stage 2: top 3 contributors as staggered lines: `${name} — ${formatTimeMs(lost)}`.

- [ ] **Step 6: Zoom Out**

Kicker "Zoom out". Stage 1: `BigNumber` of `core.attemptCount + 1` (formatted `#${n.toLocaleString()}`). Stage 2: `DistributionStrip` over all finished runs with tonight's marker — the career, one line, tonight a dot in it. Closing sub-line: `${dossier.runner.username} on therun.gg`.

- [ ] **Step 7: Register, verify, commit**

Register all; walk `demo?fixture=grinder&deck=post` (expect result → where-it-lands → survived/gold-rush order per scores) and `demo?fixture=sparse&deck=post` (result + zoom-out only, no crash). `npm run test && npm run typecheck && npm run lint`.

```bash
git add src/components/fast50
git commit -m "feat(fast50): post-run slide pool"
```

---

### Task 13: Backstage picker + capture integration

**Files:**
- Create: `app/(fast50)/fast50/screen/page.tsx`, `app/(fast50)/fast50/screen/picker.tsx`, `app/(fast50)/fast50/screen/actions.ts`
- Modify: `src/components/fast50/deck/deck.tsx` (capture override from Task 10 step 5, if not already done)

**Interfaces:**
- Consumes: `getUserRuns` (server), `useRunCapture`, `loadCapture`, `composeDeck` + `getRunnerDossier` (for the slide-count warning).
- Produces: `lookupRunner(username: string)` server action returning `{ runs: { game: string; category: string; deckReadiness: { pre: number; post: number } }[] } | { error: string }`.

- [ ] **Step 1: Server action**

`actions.ts`:

```typescript
'use server';

import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getUserRuns } from '~src/lib/get-user-runs';

export interface RunnerLookup {
    runs: {
        game: string;
        category: string;
        preSlides: number;
        postSlides: number;
    }[];
}

export const lookupRunner = async (
    username: string,
): Promise<RunnerLookup | { error: string }> => {
    const trimmed = username.trim();
    if (!trimmed) return { error: 'Enter a username' };
    const runs = await getUserRuns(trimmed).catch(() => null);
    if (!runs || runs.length === 0)
        return { error: `No runs found for '${trimmed}'` };

    const detailed = await Promise.all(
        runs.slice(0, 12).map(async (r) => {
            const [pre, post] = await Promise.all([
                getRunnerDossier(trimmed, r.game, r.run, 'pre'),
                getRunnerDossier(trimmed, r.game, r.run, 'post'),
            ]);
            return {
                game: r.game,
                category: r.run,
                preSlides: pre
                    ? composeDeck(pre).filter((s) => !s.overflow).length
                    : 0,
                postSlides: post
                    ? composeDeck(post).filter((s) => !s.overflow).length
                    : 0,
            };
        }),
    );
    return { runs: detailed };
};
```

- [ ] **Step 2: Picker UI**

`picker.tsx` (client, styled with the fast50 module — dark, utilitarian, NOT broadcast-fancy; this screen is never on stream):

- Username input + Lookup button → `lookupRunner`, spinner while pending (`useTransition`).
- Result rows: `game — category`, slide-count badges (`pre 6 · post 5`; badge turns `--danger` when < 4 with title "thin data — mostly anchors"), and two links: `Pre-run deck` / `Post-run deck` → `/fast50/screen/${encodeURIComponent(username)}/${encodeURIComponent(game)}/${encodeURIComponent(category)}?deck=pre|post` (open in same tab; presenter preps multiple browser tabs).
- Capture section: text input "Capture live runner" + Arm button → sets state consumed by `useRunCapture(armedUsername)`; shows `lastEvent` timestamp ("capturing — last update 18:42:11") and a list of existing captures found in localStorage (iterate keys with prefix `fast50-capture:`) with their `savedAt`.
- Error display for failed sources: after lookup, surface nothing here — source failures show on the deck page dossier (`dossier.sources`) as a console.warn; the picker warns only via slide counts. Keep the picker simple.
- Footer link to `/fast50/screen/demo`.

`page.tsx` renders `<Picker />` with a plain `<main>`; add `export const metadata = { robots: { index: false, follow: false } }` (backstage tool — keep it out of search) and do the same in the deck and demo pages' metadata.

- [ ] **Step 3: End-to-end verification**

`npm run dev`, open `/fast50/screen`:

1. Look up a real active therun user; verify runs list with slide counts.
2. Open their pre-deck; walk it fully with keyboard.
3. Arm capture for a currently-live runner (find one on therun.gg/live); wait for an update; verify localStorage entry appears and the capture list shows it.
4. Open that runner's post-deck; verify the deck uses the captured snapshot when the live run finishes (or at minimum renders the history-tier deck without errors).

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint && npm run test
git add 'app/(fast50)' src/components/fast50
git commit -m "feat(fast50): backstage picker with capture arming and deck readiness"
```

---

### Task 14: Final verification, polish pass, push

**Files:**
- Modify: whatever the passes below surface.

- [ ] **Step 1: Full deck rehearsal against real data**

Pick 3 well-known runners with deep therun histories (frontpage live list or leaderboards). For each: pre-deck and post-deck, full keyboard walkthrough at 1920×1080. Note every slide that renders awkwardly (overflowing split names, absurd numbers, empty charts) and fix. Special attention: long game/category names on the intro, 30+ split games on the roadmap (sampling), sub-30-minute games (clock labels), runners with `community: null`.

- [ ] **Step 2: Motion/design critique**

Load `frontend-design:frontend-design` and critique the demo decks: is each slide one idea? Do the reveals land with the presenter's pacing? Is it broadcast graphics or a website? Fix what fails. Verify count-ups don't replay when returning to a slide via BACK (acceptable if they do — `GOTO/BACK` land fully revealed with `play` already true, so CountUp renders final value; confirm this behavior).

- [ ] **Step 3: Verification gate**

```bash
npm run test && npm run typecheck && npm run lint
```

Expected: all clean. Use the superpowers:verification-before-completion skill — no success claims without command output.

- [ ] **Step 4: Housekeeping + push**

```bash
rm -rf .next
git push -u origin fast50-stats-screen
```

Do NOT create a PR (user opens PRs). Report: branch pushed, demo URL paths, and the rehearsal notes.

---

## Self-Review Notes (kept for the executor)

- **Spec coverage:** dossier (Task 7), capture tiers (Tasks 6/8/10), composer + thresholds config (Task 5), all 9 pre + 7 post slides (Tasks 10–12), presenter mechanics incl. stages/blackout/HUD (Task 9), picker with thin-data warning (Task 13), demo/rehearsal route (Task 10), zero-network-after-load (dossier is fully server-assembled; capture override reads localStorage only). Spec's "wall-clock times on the roadmap" = cumulative run-clock times (formatTimeMs), not local time of day — that is the intended reading.
- **Known simplification vs spec:** consistency score is not in the dossier (backend computes it inside game-stats leaderboards; the Profile slide stands on finish rate alone). If the pitch wants it, add `consistencyScoreLeaderboard` extraction to Task 7 alongside `pbLeaderboard`.
- **Type risk:** backend response shapes for segments/leaderboards/streaks were surveyed from the backend repo, not exercised. Task 7's local interfaces are the contract points — executor must verify against real responses early (curl the endpoints before wiring).
- **`historyFixture` lives in a test file and is imported by another test file** — acceptable for vitest; if it bothers you, move it to `src/lib/fast50/__tests__/fixtures.helpers.ts`.




