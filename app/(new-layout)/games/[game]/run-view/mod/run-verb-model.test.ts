import { beforeEach, describe, expect, it, vi } from 'vitest';
import { declineRuns } from '../../manage/moderation/moderate/run-heavy-verbs';
import { rejectRun } from './run-verb-model';

vi.mock('../../manage/moderation/moderate/run-heavy-verbs', () => ({
    declineRuns: vi.fn(),
    MIN_REASON: 10,
}));
vi.mock('../../manage/moderation/moderate/run-verbs', () => ({
    runTabVerbs: vi.fn(),
}));
vi.mock('../../manage/moderation/shared/actions/manual-times.action', () => ({
    manualTimeVerdictAction: vi.fn(),
}));

const run = {
    runId: 1,
    manualTimeId: null,
    userId: 1,
    runnerName: 'a',
    isManual: false,
    timeMs: 1000,
    realTimeMs: 1000,
    gameTimeMs: null,
};
const ids = Array.from({ length: 1201 }, (_, i) => i + 1);

describe('rejectRun batching', () => {
    beforeEach(() => vi.mocked(declineRuns).mockReset());

    it('splits 1201 ids into 500/500/201 and chains the undos', async () => {
        const undos = [0, 1, 2].map(() =>
            vi.fn(async () => ({ ok: true }) as const),
        );
        let n = 0;
        vi.mocked(declineRuns).mockImplementation(
            async () => ({ ok: true, undo: undos[n++] }) as never,
        );
        const res = await rejectRun('g', run, 'other', 'a note here', ids);
        const sizes = vi.mocked(declineRuns).mock.calls.map((c) => c[1].length);
        expect(sizes).toEqual([500, 500, 201]);
        if (!('ok' in res) || !res.undo) throw new Error('expected an undo');
        expect(await res.undo()).toEqual({ ok: true });
        for (const u of undos) expect(u).toHaveBeenCalledTimes(1);
    });

    it('stops at a failed batch and reports what was applied', async () => {
        vi.mocked(declineRuns)
            .mockResolvedValueOnce({ ok: true, undo: null } as never)
            .mockResolvedValueOnce({ error: 'boom' });
        const res = await rejectRun('g', run, 'other', 'a note here', ids);
        expect(vi.mocked(declineRuns)).toHaveBeenCalledTimes(2);
        expect(res).toEqual({
            error: 'boom (500 runs were already rejected)',
        });
    });
});
