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
