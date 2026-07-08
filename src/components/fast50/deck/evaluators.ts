import { formatTimeMs } from '~src/components/live/commentary-drawer/format';
import {
    dangerSplit,
    forecastBands,
    runPercentile,
    runRank,
} from '~src/lib/fast50/compute';
import type { RunnerDossier } from '~src/lib/fast50/dossier.types';

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
        const danger = dangerSplit(d.splits, {
            minResetShare: THRESHOLDS.dangerMinResetShare,
            minDeaths: THRESHOLDS.dangerMinDeaths,
        });
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
            .sort(
                (a, b) => (a.percentile as number) - (b.percentile as number),
            )[0];
        if (
            !best ||
            (best.percentile as number) > THRESHOLDS.worldClassPercentile
        )
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
        const bands = forecastBands(
            d.finishedRuns,
            20,
            THRESHOLDS.forecastMinRuns,
        );
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
        if (d.finishedRuns.length < THRESHOLDS.whereItLandsMinRuns) return null;
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
        const danger = dangerSplit(d.splits, {
            minResetShare: THRESHOLDS.dangerMinResetShare,
            minDeaths: THRESHOLDS.dangerMinDeaths,
        });
        if (!danger) return null;
        const passed = d.postRun.splits.some(
            (s) => s.index === danger.split.index && s.singleMs !== null,
        );
        if (!passed) return null;
        const surviveRate = Math.round((1 - danger.split.resetShare) * 100);
        return {
            score: 70 + Math.round(danger.split.resetShare * 30),
            headline: `${danger.split.name} kills ${100 - surviveRate}% of runs. Tonight it lived.`,
        };
    },

    'gold-rush': (d) => {
        if (!d.postRun) return null;
        if (d.postRun.goldCount < THRESHOLDS.goldRushMinGolds) return null;
        return {
            score: Math.min(100, 60 + d.postRun.goldCount * 15),
            headline: `${d.postRun.goldCount} gold${d.postRun.goldCount > 1 ? 's' : ''} tonight — splits they had never done faster`,
        };
    },

    'story-of-run': (d) => {
        if (!d.postRun) return null;
        const withDeltas = d.postRun.splits.filter(
            (s) => s.deltaVsAvgMs !== null,
        );
        if (withDeltas.length < 3) return null;
        return {
            score: 55,
            headline: 'Where it was won, where it nearly died',
        };
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
