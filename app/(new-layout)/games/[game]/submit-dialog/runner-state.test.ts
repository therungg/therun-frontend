import { describe, expect, it } from 'vitest';
import type {
    RunnerEntriesResult,
    RunnerGameEntry,
} from '../../../../../types/leaderboards.types';
import { entriesOnOtherBoards, resolveRunnerChoice } from './runner-state';

const board = { categoryId: 10, subcategoryKey: '' };

const entry = (over: Partial<RunnerGameEntry> = {}): RunnerGameEntry => ({
    categoryId: 10,
    category: 'Any%',
    categorySlug: 'any',
    subcategoryKey: '',
    timeMs: 120000,
    timing: 'realtime',
    rank: 3,
    totalRunners: 40,
    source: 'run',
    runId: 7,
    ...over,
});

const found = (entries: RunnerGameEntry[]): RunnerEntriesResult => ({
    status: 'found',
    userId: 42,
    entries,
});

describe('resolveRunnerChoice', () => {
    it('links to the account and allows next when the board is free', () => {
        const c = resolveRunnerChoice(found([]), 'Kirbymastah', board);
        expect(c.kind).toBe('account');
        expect(c.canProceed).toBe(true);
        expect(c.ref).toEqual({ userId: 42 });
    });

    it('blocks next when the account already holds the selected board', () => {
        const c = resolveRunnerChoice(found([entry()]), 'Kirbymastah', board);
        expect(c.canProceed).toBe(false);
        expect(c.existing?.timeMs).toBe(120000);
    });

    it('does not block on an entry from a different subcategory', () => {
        const c = resolveRunnerChoice(
            found([entry({ subcategoryKey: 'glitchless' })]),
            'Kirbymastah',
            board,
        );
        expect(c.canProceed).toBe(true);
        expect(c.existing).toBeNull();
    });

    it('falls back to a name-only ref when there is no account', () => {
        const c = resolveRunnerChoice(
            { status: 'no-account' },
            'SomeRunner',
            board,
        );
        expect(c.kind).toBe('name-only');
        expect(c.ref).toEqual({ guestName: 'SomeRunner' });
        expect(c.canProceed).toBe(true);
    });

    it('blocks a name-only runner that already holds the board', () => {
        const c = resolveRunnerChoice(
            {
                status: 'found',
                userId: null,
                entries: [
                    entry({
                        source: 'manual',
                        manualTimeId: 5,
                        runId: undefined,
                    }),
                ],
            },
            'SomeRunner',
            board,
        );
        expect(c.kind).toBe('name-only');
        expect(c.canProceed).toBe(false);
        expect(c.existing?.manualTimeId).toBe(5);
    });

    it('trims the typed name into the ref', () => {
        const c = resolveRunnerChoice(
            { status: 'no-account' },
            '  Ann  ',
            board,
        );
        expect(c.ref).toEqual({ guestName: 'Ann' });
    });

    it('cannot proceed on an empty name with no account', () => {
        const c = resolveRunnerChoice({ status: 'no-account' }, '   ', board);
        expect(c.canProceed).toBe(false);
    });
});

describe('entriesOnOtherBoards', () => {
    it('excludes the selected board', () => {
        const others = entriesOnOtherBoards(
            [
                entry(),
                entry({
                    categoryId: 11,
                    category: '100%',
                    categorySlug: '100',
                }),
            ],
            board,
        );
        expect(others).toHaveLength(1);
        expect(others[0].categorySlug).toBe('100');
    });
});
