// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import { isSettled, POLL_MS, useSrcImportJob } from './use-src-import-job';

const job = (over: Partial<SrcImportJob>): SrcImportJob => ({
    id: 7,
    gameId: 12,
    srcGameId: 'x',
    srcGameAbbreviation: 'sm64',
    srcGameName: 'Super Mario 64',
    srcUrl: 'https://www.speedrun.com/sm64',
    requestedBy: 1,
    status: 'running',
    phase: 'meta',
    checkpoint: null,
    categoriesCount: 0,
    levelsCount: 0,
    variablesCount: 0,
    runsCount: 0,
    playersCount: 0,
    playersMatchedCount: 0,
    requestsMade: 0,
    estimatedRequests: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-03T10:00:00Z',
    commitStatus: null,
    commitPhase: null,
    importedRunsCount: 0,
    importSkippedCount: 0,
    configAppliedAt: null,
    runsImportedAt: null,
    srcOnlyLeaderboard: false,
    kind: 'settings',
    changeSummary: null,
    commitFlags: null,
    ...over,
});

describe('isSettled', () => {
    it('settings: done + null commit is still chaining', () => {
        expect(isSettled(job({ status: 'done', commitStatus: null }))).toBe(
            false,
        );
        expect(
            isSettled(job({ status: 'done', commitStatus: 'applying' })),
        ).toBe(false);
        expect(
            isSettled(job({ status: 'done', commitStatus: 'applied' })),
        ).toBe(true);
        expect(isSettled(job({ status: 'done', commitStatus: 'failed' }))).toBe(
            true,
        );
        expect(isSettled(job({ status: 'failed' }))).toBe(true);
    });

    it('resync: settles on pruned, not on applied or imported', () => {
        const r = (commitStatus: SrcImportJob['commitStatus']) =>
            isSettled(job({ kind: 'resync', status: 'done', commitStatus }));
        expect(r('applied')).toBe(false);
        expect(r('imported')).toBe(false);
        expect(r('pruned')).toBe(true);
        expect(r('reconciled')).toBe(true);
    });

    it('manual: settles when staging is done and no worker is running', () => {
        expect(
            isSettled(
                job({ kind: 'manual', status: 'done', commitStatus: null }),
            ),
        ).toBe(true);
        expect(
            isSettled(
                job({
                    kind: 'manual',
                    status: 'done',
                    commitStatus: 'applying',
                }),
            ),
        ).toBe(false);
    });
});

describe('useSrcImportJob', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('polls until the job settles, then stops', async () => {
        const fetcher = vi
            .fn()
            .mockResolvedValueOnce({ result: job({ status: 'running' }) })
            .mockResolvedValueOnce({
                result: job({ status: 'done', commitStatus: null }),
            })
            .mockResolvedValue({
                result: job({ status: 'done', commitStatus: 'applied' }),
            });
        const { result } = renderHook(() => useSrcImportJob(fetcher));
        await act(async () => {});
        expect(fetcher).toHaveBeenCalledTimes(1);

        await act(async () => {
            vi.advanceTimersByTime(POLL_MS);
        });
        expect(fetcher).toHaveBeenCalledTimes(2);

        await act(async () => {
            vi.advanceTimersByTime(POLL_MS);
        });
        expect(fetcher).toHaveBeenCalledTimes(3);
        expect(result.current.job?.commitStatus).toBe('applied');

        await act(async () => {
            vi.advanceTimersByTime(POLL_MS * 3);
        });
        expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('surfaces a fetch error and stops loading', async () => {
        const fetcher = vi.fn().mockResolvedValue({ error: 'nope' });
        const { result } = renderHook(() => useSrcImportJob(fetcher));
        await act(async () => {});
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('nope');
    });
});
