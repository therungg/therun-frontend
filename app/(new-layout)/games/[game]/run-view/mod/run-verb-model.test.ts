import { beforeEach, describe, expect, it, vi } from 'vitest';
import { declineRuns } from '../../manage/moderation/moderate/run-heavy-verbs';
import { applyVerdictsAction } from '../../manage/moderation/shared/actions/verdicts.action';
import { rejectRun } from './run-verb-model';

vi.mock('../../manage/moderation/moderate/run-heavy-verbs', () => ({
    declineRuns: vi.fn(),
    MIN_REASON: 10,
}));
vi.mock('../../manage/moderation/moderate/run-verbs', () => ({
    runTabVerbs: vi.fn(),
}));
vi.mock('../../manage/moderation/shared/actions/verdicts.action', () => ({
    applyVerdictsAction: vi.fn(),
}));

const run = {
    runId: 1,
    userId: 1,
    runnerName: 'a',
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

    it('undo unrejects every batch, then re-verifies the verified runs', async () => {
        const order: string[] = [];
        let n = 0;
        vi.mocked(declineRuns).mockImplementation(async () => {
            const i = n++;
            return {
                ok: true,
                undo: async () => {
                    order.push(`unreject${i}`);
                    return { ok: true };
                },
            } as never;
        });
        vi.mocked(applyVerdictsAction).mockReset();
        vi.mocked(applyVerdictsAction).mockImplementation((async (
            _g: string,
            action: string,
            batch: number[],
        ) => {
            order.push(`${action}:${batch.length}`);
            return { ok: true };
        }) as never);
        const verified = Array.from({ length: 600 }, (_, i) => i + 1);
        const res = await rejectRun(
            'g',
            run,
            'other',
            'a note here',
            ids,
            verified,
        );
        if (!('ok' in res) || !res.undo) throw new Error('expected an undo');
        expect(await res.undo()).toEqual({ ok: true });
        expect(order).toEqual([
            'unreject0',
            'unreject1',
            'unreject2',
            'verify:500',
            'verify:100',
        ]);
        const sent = vi
            .mocked(applyVerdictsAction)
            .mock.calls.flatMap((c) => c[2]);
        expect(sent).toEqual(verified);
    });

    it('does not verify anything when none were verified', async () => {
        vi.mocked(applyVerdictsAction).mockReset();
        vi.mocked(declineRuns).mockResolvedValue({
            ok: true,
            undo: async () => ({ ok: true }),
        } as never);
        const res = await rejectRun('g', run, 'other', 'a note here', [1, 2]);
        if (!('ok' in res) || !res.undo) throw new Error('expected an undo');
        await res.undo();
        expect(applyVerdictsAction).not.toHaveBeenCalled();
    });

    it('an undo batch failure stops and returns the error', async () => {
        vi.mocked(applyVerdictsAction).mockReset();
        const second = vi.fn(async () => ({ ok: true }) as const);
        vi.mocked(declineRuns)
            .mockResolvedValueOnce({
                ok: true,
                undo: async () => ({ error: 'nope' }),
            } as never)
            .mockResolvedValueOnce({ ok: true, undo: second } as never);
        const res = await rejectRun(
            'g',
            run,
            'other',
            'a note here',
            ids.slice(0, 600),
            [1],
        );
        if (!('ok' in res) || !res.undo) throw new Error('expected an undo');
        expect(await res.undo()).toEqual({ error: 'nope' });
        expect(second).not.toHaveBeenCalled();
        expect(applyVerdictsAction).not.toHaveBeenCalled();
    });
});
