import type {
    DossierFinishedRun,
    DossierSplit,
    PostRun,
    RunnerDossier,
} from './dossier.types';
import type { PrepSessionData } from './prep.types';

// Helper to build a split quickly
const split = (
    index: number,
    name: string,
    avgSingleMs: number,
    over: Partial<DossierSplit> = {},
): DossierSplit => ({
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

const accumulate = (splits: DossierSplit[]): DossierSplit[] => {
    let total = 0;
    let pbTotal = 0;
    return splits.map((s) => {
        total += s.avgSingleMs ?? 0;
        pbTotal += s.pbSingleMs ?? 0;
        return { ...s, avgTotalMs: total, pbTotalMs: pbTotal };
    });
};

// ---------------------------------------------------------------------------
// finishedRuns helpers
// ---------------------------------------------------------------------------

const isoDaysAgo = (daysAgo: number): string => {
    const d = new Date('2026-07-08T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString();
};

// ---------------------------------------------------------------------------
// grinder: OoT 100%-style, 6 splits, ~1h40m game, huge attempts, tiny finish
// rate, one dominant danger split (Water Temple).
// ---------------------------------------------------------------------------

const grinderPbMs = 98 * 60 * 1000 + 40 * 1000; // 1h38m40s
const grinderSobMs = 96 * 60 * 1000 + 10 * 1000; // 1h36m10s

// Total deaths across all splits. Water Temple carries 1850 of them at a
// 0.41 share => total deaths ≈ 1850 / 0.41 ≈ 4512.
const grinderWaterDeaths = 1850;
const grinderTotalDeaths = Math.round(grinderWaterDeaths / 0.41); // 4512
const grinderOtherDeaths = grinderTotalDeaths - grinderWaterDeaths; // 2662
// Spread the remainder across the other 5 splits, front-loaded (early splits
// see more attempts so more raw deaths), none dominant on their own.
// Keep every other split's resetShare comfortably under the 0.15 danger
// threshold (max weight 0.22 -> resetShare ≈ 0.13) so Water Temple is the
// only split that trips dangerSplit()'s resetShare>=0.15 && deaths>=5 gate.
const grinderOtherDeathSplit = [0.18, 0.22, 0.21, 0.2, 0.19]; // sums to 1

const grinderSplitsRaw: DossierSplit[] = [
    split(0, 'Forest Escape', 5 * 60 * 1000 + 20 * 1000, {
        deaths: Math.round(grinderOtherDeaths * grinderOtherDeathSplit[0]),
        resetShare:
            Math.round(grinderOtherDeaths * grinderOtherDeathSplit[0]) /
            grinderTotalDeaths,
        attemptsReached: 4812,
    }),
    split(1, 'Kakariko/Gorons', 12 * 60 * 1000 + 10 * 1000, {
        deaths: Math.round(grinderOtherDeaths * grinderOtherDeathSplit[1]),
        resetShare:
            Math.round(grinderOtherDeaths * grinderOtherDeathSplit[1]) /
            grinderTotalDeaths,
        attemptsReached: 4580,
    }),
    split(2, 'Water Temple', 21 * 60 * 1000 + 45 * 1000, {
        deaths: grinderWaterDeaths,
        resetShare: 0.41,
        attemptsReached: 2100,
        stdDevMs: 95_000,
    }),
    split(3, 'Shadow Temple', 16 * 60 * 1000 + 5 * 1000, {
        deaths: Math.round(grinderOtherDeaths * grinderOtherDeathSplit[2]),
        resetShare:
            Math.round(grinderOtherDeaths * grinderOtherDeathSplit[2]) /
            grinderTotalDeaths,
        attemptsReached: 640,
    }),
    split(4, 'Spirit Temple', 17 * 60 * 1000 + 30 * 1000, {
        deaths: Math.round(grinderOtherDeaths * grinderOtherDeathSplit[3]),
        resetShare:
            Math.round(grinderOtherDeaths * grinderOtherDeathSplit[3]) /
            grinderTotalDeaths,
        attemptsReached: 410,
    }),
    split(5, 'Ganon', 25 * 60 * 1000 + 40 * 1000, {
        deaths: Math.round(grinderOtherDeaths * grinderOtherDeathSplit[4]),
        resetShare:
            Math.round(grinderOtherDeaths * grinderOtherDeathSplit[4]) /
            grinderTotalDeaths,
        attemptsReached: 289,
    }),
];

const grinderSplits = accumulate(grinderSplitsRaw);

// 60 finished runs trending downward over ~2 years. Most recent 20 are
// clustered pb+2m..pb+5m; older runs range up to pb+30m down toward pb+30s
// at the very end (best/most recent runs are fastest).
const buildGrinderRuns = (): DossierFinishedRun[] => {
    const runs: DossierFinishedRun[] = [];
    const n = 60;
    for (let i = 0; i < n; i++) {
        // i=0 is oldest, i=n-1 is most recent.
        const isRecent20 = i >= n - 20;
        let offsetMs: number;
        if (isRecent20) {
            // recent 20: pb+2m..pb+5m, jittered by index within that window
            const t = (i - (n - 20)) / 19; // 0..1
            offsetMs = (2 + t * 3) * 60 * 1000 + (i % 5) * 1000;
        } else {
            // older 40: downward trend from pb+8m (oldest) to pb+5m
            const t = i / (n - 21); // 0..1 across the older portion
            offsetMs = (8 - t * 3) * 60 * 1000 + ((i * 37) % 4000) - 2000;
        }
        const daysAgo = Math.round(730 - (i / (n - 1)) * 730);
        runs.push({
            timeMs: grinderPbMs + Math.round(offsetMs),
            endedAt: isoDaysAgo(daysAgo),
        });
    }
    return runs;
};

const grinder: RunnerDossier = {
    deck: 'pre',
    generatedAt: '2026-07-08T12:00:00Z',
    runner: {
        username: 'GrindLordZelda',
        picture: 'https://static-cdn.jtvnw.net/jtv_user_pictures/grindlord.png',
        country: 'US',
        pronouns: 'he/him',
    },
    game: {
        game: 'Ocarina of Time',
        display: 'The Legend of Zelda: Ocarina of Time',
        category: '100%',
        image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/oot.jpg',
    },
    core: {
        pbMs: grinderPbMs,
        sobMs: grinderSobMs,
        attemptCount: 4812,
        finishedAttemptCount: 289,
        finishRate: 289 / 4812,
        categoryPlaytimeMs: 379 * 60 * 60 * 1000,
    },
    splits: grinderSplits,
    finishedRuns: buildGrinderRuns(),
    community: {
        userCount: 214,
        segments: [
            {
                index: 0,
                name: 'Forest Escape',
                userAvgMs: 5 * 60 * 1000 + 20 * 1000,
                percentile: 3,
            },
            {
                index: 1,
                name: 'Kakariko/Gorons',
                userAvgMs: 12 * 60 * 1000 + 10 * 1000,
                percentile: 22,
            },
            {
                index: 2,
                name: 'Water Temple',
                userAvgMs: 21 * 60 * 1000 + 45 * 1000,
                percentile: 35,
            },
            {
                index: 3,
                name: 'Shadow Temple',
                userAvgMs: 16 * 60 * 1000 + 5 * 1000,
                percentile: 40,
            },
            {
                index: 4,
                name: 'Spirit Temple',
                userAvgMs: 17 * 60 * 1000 + 30 * 1000,
                percentile: 45,
            },
            {
                index: 5,
                name: 'Ganon',
                userAvgMs: 25 * 60 * 1000 + 40 * 1000,
                percentile: 50,
            },
        ],
    },
    leaderboards: { pbPlacing: 11, entrants: 214 },
    form: {
        last14dPlaytimeMs: 42 * 60 * 60 * 1000,
        last14dActiveDays: 12,
        currentStreakDays: 9,
    },
    postRun: null,
    sources: [
        { name: 'history', ok: true },
        { name: 'community', ok: true },
        { name: 'leaderboards', ok: true },
        { name: 'form', ok: true },
    ],
};

// ---------------------------------------------------------------------------
// prodigy: 8 splits, world-class finish rate, #1 leaderboard, no danger
// split, tightly clustered runs.
// ---------------------------------------------------------------------------

const prodigyPbMs = 42 * 60 * 1000 + 15 * 1000; // 42m15s
const prodigySobMs = 41 * 60 * 1000 + 5 * 1000;

// total deaths across the 8 splits: 1+2+3+4+4+3+2+1 = 20. resetShare below
// is each split's deaths/20 (sums to 1). Max deaths is 4, so no split can
// ever trip dangerSplit()'s resetShare>=0.15 && deaths>=5 gate regardless of
// resetShare magnitude — the deaths<5 half of the AND always fails first.
const prodigySplitsRaw: DossierSplit[] = [
    split(0, 'Intro', 2 * 60 * 1000 + 5 * 1000, {
        deaths: 1,
        resetShare: 0.05,
        attemptsReached: 611,
    }),
    split(1, 'Sewers', 4 * 60 * 1000 + 40 * 1000, {
        deaths: 2,
        resetShare: 0.1,
        attemptsReached: 605,
    }),
    split(2, 'Docks', 5 * 60 * 1000 + 10 * 1000, {
        deaths: 3,
        resetShare: 0.15,
        attemptsReached: 590,
    }),
    split(3, 'Old Town', 6 * 60 * 1000 + 30 * 1000, {
        deaths: 4,
        resetShare: 0.2,
        attemptsReached: 560,
    }),
    split(4, 'Clocktower', 5 * 60 * 1000 + 55 * 1000, {
        deaths: 4,
        resetShare: 0.2,
        attemptsReached: 530,
    }),
    split(5, 'Industrial', 6 * 60 * 1000 + 45 * 1000, {
        deaths: 3,
        resetShare: 0.15,
        attemptsReached: 500,
    }),
    split(6, 'Bridge', 4 * 60 * 1000 + 50 * 1000, {
        deaths: 2,
        resetShare: 0.1,
        attemptsReached: 470,
    }),
    split(7, 'Final Boss', 6 * 60 * 1000 + 20 * 1000, {
        deaths: 1,
        resetShare: 0.05,
        attemptsReached: 434,
    }),
];

const prodigySplits = accumulate(prodigySplitsRaw);

const buildProdigyRuns = (): DossierFinishedRun[] => {
    const runs: DossierFinishedRun[] = [];
    const n = 40;
    for (let i = 0; i < n; i++) {
        // tight cluster: pb..pb+45s, newest runs (higher i) trend faster
        const t = i / (n - 1); // 0..1
        const offsetMs = Math.round(45_000 * (1 - t) * 0.6 + (i % 7) * 400);
        const daysAgo = Math.round(365 - t * 365);
        runs.push({
            timeMs: prodigyPbMs + offsetMs,
            endedAt: isoDaysAgo(daysAgo),
        });
    }
    runs[n - 1] = { timeMs: prodigyPbMs, endedAt: isoDaysAgo(2) };
    return runs;
};

const prodigy: RunnerDossier = {
    deck: 'pre',
    generatedAt: '2026-07-08T12:00:00Z',
    runner: {
        username: 'FlickFrame',
        picture:
            'https://static-cdn.jtvnw.net/jtv_user_pictures/flickframe.png',
        country: 'JP',
        pronouns: 'she/her',
    },
    game: {
        game: 'Hollow Knight',
        display: 'Hollow Knight',
        category: 'Any%',
        image: 'https://images.igdb.com/igdb/image/upload/t_cover_big/hk.jpg',
    },
    core: {
        pbMs: prodigyPbMs,
        sobMs: prodigySobMs,
        attemptCount: 611,
        finishedAttemptCount: 434,
        finishRate: 434 / 611,
        categoryPlaytimeMs: 96 * 60 * 60 * 1000,
    },
    splits: prodigySplits,
    finishedRuns: buildProdigyRuns(),
    community: {
        userCount: 89,
        segments: [
            {
                index: 0,
                name: 'Intro',
                userAvgMs: 2 * 60 * 1000 + 5 * 1000,
                percentile: 1,
            },
            {
                index: 1,
                name: 'Sewers',
                userAvgMs: 4 * 60 * 1000 + 40 * 1000,
                percentile: 2,
            },
            {
                index: 2,
                name: 'Docks',
                userAvgMs: 5 * 60 * 1000 + 10 * 1000,
                percentile: 1,
            },
            {
                index: 3,
                name: 'Old Town',
                userAvgMs: 6 * 60 * 1000 + 30 * 1000,
                percentile: 3,
            },
            {
                index: 4,
                name: 'Clocktower',
                userAvgMs: 5 * 60 * 1000 + 55 * 1000,
                percentile: 4,
            },
            {
                index: 5,
                name: 'Industrial',
                userAvgMs: 6 * 60 * 1000 + 45 * 1000,
                percentile: 2,
            },
            {
                index: 6,
                name: 'Bridge',
                userAvgMs: 4 * 60 * 1000 + 50 * 1000,
                percentile: 5,
            },
            {
                index: 7,
                name: 'Final Boss',
                userAvgMs: 6 * 60 * 1000 + 20 * 1000,
                percentile: 1,
            },
        ],
    },
    leaderboards: { pbPlacing: 1, entrants: 89 },
    form: {
        last14dPlaytimeMs: 18 * 60 * 60 * 1000,
        last14dActiveDays: 10,
        currentStreakDays: 4,
    },
    postRun: null,
    sources: [
        { name: 'history', ok: true },
        { name: 'community', ok: true },
        { name: 'leaderboards', ok: true },
        { name: 'form', ok: true },
    ],
};

// ---------------------------------------------------------------------------
// sparse: almost nothing to build a dossier from.
// ---------------------------------------------------------------------------

const sparsePbMs = 15 * 60 * 1000 + 40 * 1000;
const sparseSobMs = 14 * 60 * 1000 + 55 * 1000;

const sparseSplitsRaw: DossierSplit[] = [
    split(0, 'Start', 1 * 60 * 1000 + 30 * 1000, {
        deaths: 4,
        resetShare: 4 / 9,
        attemptsReached: 34,
    }),
    split(1, 'Cave', 2 * 60 * 1000 + 10 * 1000, {
        deaths: 3,
        resetShare: 3 / 9,
        attemptsReached: 20,
    }),
    split(2, 'Bridge', 3 * 60 * 1000 + 0 * 1000, {
        deaths: 1,
        resetShare: 1 / 9,
        attemptsReached: 10,
    }),
    split(3, 'Tower', 4 * 60 * 1000 + 20 * 1000, {
        deaths: 1,
        resetShare: 1 / 9,
        attemptsReached: 5,
    }),
    split(4, 'Finale', 4 * 60 * 1000 + 40 * 1000, {
        deaths: 0,
        resetShare: 0,
        attemptsReached: 3,
    }),
];

const sparseSplits = accumulate(sparseSplitsRaw);

const sparse: RunnerDossier = {
    deck: 'pre',
    generatedAt: '2026-07-08T12:00:00Z',
    runner: {
        username: 'JustStartedThis',
        pronouns: undefined,
    },
    game: {
        game: 'Celeste',
        display: 'Celeste',
        category: 'Any%',
    },
    core: {
        pbMs: sparsePbMs,
        sobMs: sparseSobMs,
        attemptCount: 34,
        finishedAttemptCount: 3,
        finishRate: 3 / 34,
        categoryPlaytimeMs: 6 * 60 * 60 * 1000,
    },
    splits: sparseSplits,
    finishedRuns: [
        { timeMs: sparsePbMs + 90_000, endedAt: isoDaysAgo(20) },
        { timeMs: sparsePbMs + 40_000, endedAt: isoDaysAgo(10) },
        { timeMs: sparsePbMs, endedAt: isoDaysAgo(3) },
    ],
    community: null,
    leaderboards: null,
    form: null,
    postRun: null,
    sources: [
        { name: 'history', ok: true },
        { name: 'community', ok: false, error: 'insufficient sample' },
        { name: 'leaderboards', ok: false, error: 'insufficient sample' },
        { name: 'form', ok: false, error: 'insufficient sample' },
    ],
};

export const FIXTURES: Record<'grinder' | 'prodigy' | 'sparse', RunnerDossier> =
    {
        grinder,
        prodigy,
        sparse,
    };

// ---------------------------------------------------------------------------
// fixturePost: post-deck clones with postRun filled.
// ---------------------------------------------------------------------------

const buildPostSplits = (
    splits: DossierSplit[],
    finalTimeMs: number,
    golds: Record<number, number>, // index -> goldSaveMs
): {
    postSplits: import('./dossier.types').PostRunSplit[];
    goldCount: number;
} => {
    // Scale each split's avgSingleMs proportionally so the cumulative total
    // lands exactly on finalTimeMs, keeping relative pacing plausible.
    const avgTotal = splits.reduce((sum, s) => sum + (s.avgSingleMs ?? 0), 0);
    const scale = avgTotal === 0 ? 1 : finalTimeMs / avgTotal;
    let runningTotal = 0;
    let goldCount = 0;
    const postSplits = splits.map((s) => {
        const isGold = s.index in golds;
        if (isGold) goldCount += 1;
        const singleMs = Math.round((s.avgSingleMs ?? 0) * scale);
        runningTotal += singleMs;
        return {
            index: s.index,
            name: s.name,
            singleMs,
            totalMs: runningTotal,
            isGold,
            goldSaveMs: isGold ? golds[s.index] : null,
            deltaVsAvgMs: singleMs - (s.avgSingleMs ?? 0),
        };
    });
    return { postSplits, goldCount };
};

const grinderPostFinalMs = grinderPbMs + 95_000;
const { postSplits: grinderPostSplits, goldCount: grinderGoldCount } =
    buildPostSplits(grinderSplits, grinderPostFinalMs, { 1: 1200, 3: 800 });

const grinderPostRun: PostRun = {
    source: 'capture',
    finalTimeMs: grinderPostFinalMs,
    endedAt: isoDaysAgo(0),
    splits: grinderPostSplits,
    goldCount: grinderGoldCount,
    events: [
        {
            type: 'gold_split_event',
            name: 'Gold split!',
            description: 'New best segment on Barrel Room',
        },
    ],
};

const prodigyForecast = (() => {
    // p50 of the last 20 finished runs, mirroring forecastBands' recent=20 window
    const sample = prodigy.finishedRuns
        .slice(-20)
        .map((r) => r.timeMs)
        .sort((a, b) => a - b);
    const mid = Math.floor(sample.length / 2);
    return sample.length % 2 === 0
        ? Math.round((sample[mid - 1] + sample[mid]) / 2)
        : sample[mid];
})();

const prodigyPostFinalMs = prodigyForecast - 20_000;
const { postSplits: prodigyPostSplits, goldCount: prodigyGoldCount } =
    buildPostSplits(prodigySplits, prodigyPostFinalMs, {});

const prodigyPostRun: PostRun = {
    source: 'history',
    finalTimeMs: prodigyPostFinalMs,
    endedAt: isoDaysAgo(0),
    splits: prodigyPostSplits,
    goldCount: prodigyGoldCount,
    events: [],
};

const sparseMedianMs = sparse.finishedRuns
    .map((r) => r.timeMs)
    .sort((a, b) => a - b)[1];
const { postSplits: sparsePostSplits, goldCount: sparseGoldCount } =
    buildPostSplits(sparseSplits, sparseMedianMs, {});

const sparsePostRun: PostRun = {
    source: 'history',
    finalTimeMs: sparseMedianMs,
    endedAt: isoDaysAgo(0),
    splits: sparsePostSplits,
    goldCount: sparseGoldCount,
    events: [],
};

export const fixturePost: Record<
    'grinder' | 'prodigy' | 'sparse',
    RunnerDossier
> = {
    grinder: { ...grinder, deck: 'post', postRun: grinderPostRun },
    prodigy: { ...prodigy, deck: 'post', postRun: prodigyPostRun },
    sparse: { ...sparse, deck: 'post', postRun: sparsePostRun },
};

export const fixturePrep: PrepSessionData = {
    interview: {
        goal: {
            text: 'beat his average — and survive Water Temple',
            // slightly above the fixture's final time so the demo verdict is HIT
            targetTimeMs:
                (fixturePost.grinder.postRun?.finalTimeMs ?? 0) + 45_000,
        },
        quotes: [
            {
                id: 'fixture-quote-1',
                text: "I've never made it past the danger split with a crowd watching.",
                context: 'On nerves',
            },
        ],
        facts: [
            {
                id: 'fixture-fact-1',
                template: 'versus',
                title: 'Attempts',
                body: '4,812 at home',
                secondary: '1 tonight',
            },
        ],
    },
    clips: [
        {
            id: 'fixture-clip-1',
            videoUrl: '/fast50-demo-clip.mp4',
            title: 'The wrong-warp',
            caption: 'Watch the camera flick — blink and you miss it',
        },
    ],
    // Optional local asset, same pattern as the demo clip above.
    headshotUrl: '/fast50-demo-headshot.jpg',
    roadmapNotes: [{ splitIndex: 2, text: 'He invented this skip' }],
};
