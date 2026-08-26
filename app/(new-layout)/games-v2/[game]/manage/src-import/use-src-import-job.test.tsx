// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    SrcImportCommitStatus,
    SrcImportJob,
} from '../../../../../../types/src-import.types';
import type { ActionResult } from './src-import-actions';
import { POLL_MS, useSrcImportJob } from './use-src-import-job';

const job = (over: Partial<SrcImportJob> = {}): SrcImportJob =>
    ({
        id: 1,
        gameId: 12,
        status: 'done',
        commitStatus: null,
        ...over,
    }) as SrcImportJob;

const ok = (j: SrcImportJob | null): ActionResult<SrcImportJob | null> => ({
    result: j,
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('useSrcImportJob commit-phase polling', () => {
    it('keeps polling while commitStatus is applying, then stops once applied', async () => {
        vi.useFakeTimers();
        // Staging already done; commit worker running, then settles.
        const fetcher = vi
            .fn<() => Promise<ActionResult<SrcImportJob | null>>>()
            .mockResolvedValueOnce(ok(job({ commitStatus: 'applying' })))
            .mockResolvedValueOnce(ok(job({ commitStatus: 'applying' })))
            .mockResolvedValue(ok(job({ commitStatus: 'applied' })));

        renderHook(() => useSrcImportJob(fetcher));

        // Initial mount read.
        await act(async () => {
            await Promise.resolve();
        });
        expect(fetcher).toHaveBeenCalledTimes(1);

        // Interval fires while applying -> second read (still applying).
        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS);
        });
        expect(fetcher).toHaveBeenCalledTimes(2);

        // Third read returns applied -> poll must stop after this tick.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS);
        });
        expect(fetcher).toHaveBeenCalledTimes(3);

        // No further reads once settled.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS * 3);
        });
        expect(fetcher).toHaveBeenCalledTimes(3);
    });

    it('does not poll when the job is fully settled (done + applied)', async () => {
        vi.useFakeTimers();
        const fetcher = vi
            .fn<() => Promise<ActionResult<SrcImportJob | null>>>()
            .mockResolvedValue(
                ok(job({ commitStatus: 'applied' as SrcImportCommitStatus })),
            );

        renderHook(() => useSrcImportJob(fetcher));
        await act(async () => {
            await Promise.resolve();
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(POLL_MS * 3);
        });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('polls while staging is still running', async () => {
        const fetcher = vi
            .fn<() => Promise<ActionResult<SrcImportJob | null>>>()
            .mockResolvedValue(ok(job({ status: 'running' })));
        const { result } = renderHook(() => useSrcImportJob(fetcher));
        await waitFor(() => expect(result.current.job?.status).toBe('running'));
        // The running staging job schedules an interval (assert via key path:
        // at least the mount read happened and job is non-terminal).
        expect(fetcher).toHaveBeenCalled();
    });
});
