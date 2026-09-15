import type { RunnerStats } from '../../../../../types/runner-profile.types';
import { formatCount } from '../format';
import { medalOf } from '../ranks';
import type { StripCatalog } from './resolve';

export interface StatsStripData {
    totals: RunnerStats['totals'];
    bestRank: number | null;
}

const word = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const statsStrip: StripCatalog<StatsStripData> = {
    tab: 'stats',
    tiles: [
        {
            id: 'attempts',
            name: 'Attempts',
            build: ({ totals: t }) =>
                t.attempts > 0
                    ? {
                          value: formatCount(t.attempts),
                          label: word(t.attempts, 'attempt', 'attempts'),
                      }
                    : null,
        },
        {
            id: 'finishedRuns',
            name: 'Finished runs',
            build: ({ totals: t }) =>
                t.finishedAttempts > 0
                    ? {
                          value: formatCount(t.finishedAttempts),
                          label: word(
                              t.finishedAttempts,
                              'finished run',
                              'finished runs',
                          ),
                      }
                    : null,
        },
        {
            id: 'finishRate',
            name: 'Finish rate',
            build: ({ totals: t }) =>
                t.attempts > 0
                    ? {
                          value: `${Math.round((t.finishedAttempts / t.attempts) * 100)}%`,
                          label: 'of attempts finished',
                      }
                    : null,
        },
        {
            id: 'bestRank',
            name: 'Best rank',
            build: ({ bestRank }) =>
                bestRank !== null
                    ? {
                          value: `#${bestRank}`,
                          label: 'best rank',
                          medal: medalOf(bestRank),
                      }
                    : null,
        },
        {
            id: 'games',
            name: 'Games',
            build: ({ totals: t }) =>
                t.games > 0
                    ? {
                          value: formatCount(t.games),
                          label: word(t.games, 'game', 'games'),
                      }
                    : null,
        },
        {
            id: 'categories',
            name: 'Categories',
            build: ({ totals: t }) =>
                t.categories > 0
                    ? {
                          value: formatCount(t.categories),
                          label: word(t.categories, 'category', 'categories'),
                      }
                    : null,
        },
    ],
    defaults: () => ['attempts', 'finishedRuns', 'finishRate', 'bestRank'],
};
