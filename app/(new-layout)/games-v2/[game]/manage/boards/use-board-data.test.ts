// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardRow } from '../../../../../../types/moderation.types';
import {
    BOARD_PAGE_SIZE,
    type BoardQuery,
    useBoardData,
} from './use-board-data';

const mocks = vi.hoisted(() => ({
    loadBoardPageAction: vi.fn(),
}));

vi.mock('./actions/load-board-page.action', () => ({
    loadBoardPageAction: mocks.loadBoardPageAction,
}));

function makeRows(count: number, startId = 1): BoardRow[] {
    return Array.from({ length: count }, (_, i) => ({
        runId: startId + i,
        userId: startId + i,
        runnerName: `runner-${startId + i}`,
        subcategoryKey: '',
        time: 1000 * (startId + i),
        gameTime: null,
        verificationStatus: 'verified',
        vodUrl: null,
        endedAt: '2026-01-01T00:00:00Z',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: false,
        boardRank: startId + i,
    }));
}

function pageOf(rows: BoardRow[], total = rows.length) {
    return { ok: true as const, rows, total, markedTotal: 0 };
}

function deferred<T>() {
    let resolve!: (v: T) => void;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

const QUERY: BoardQuery = {
    timing: 'rt',
    sortDesc: false,
    markedOnly: false,
    page: 0,
};

beforeEach(() => {
    mocks.loadBoardPageAction.mockReset();
});

describe('useBoardData', () => {
    it('fetches one page and exposes rows + totals', async () => {
        mocks.loadBoardPageAction.mockResolvedValue({
            ok: true,
            rows: makeRows(3),
            total: 250,
            markedTotal: 4,
        });

        const { result } = renderHook(() =>
            useBoardData('my-game', 7, '', QUERY),
        );

        await waitFor(() => expect(result.current.rows).toHaveLength(3));
        expect(result.current.total).toBe(250);
        expect(result.current.markedTotal).toBe(4);
        expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(1);
        expect(mocks.loadBoardPageAction).toHaveBeenCalledWith('my-game', 7, {
            subcategoryKey: undefined,
            timing: 'rt',
            sortDesc: undefined,
            markedOnly: undefined,
            limit: BOARD_PAGE_SIZE,
            offset: 0,
        });
    });

    it('maps page/sortDesc/markedOnly onto the request', async () => {
        mocks.loadBoardPageAction.mockResolvedValue(pageOf(makeRows(1)));

        const { result } = renderHook(() =>
            useBoardData('my-game', 7, 'glitchless', {
                timing: 'gt',
                sortDesc: true,
                markedOnly: true,
                page: 3,
            }),
        );

        await waitFor(() => expect(result.current.rows).toHaveLength(1));
        expect(mocks.loadBoardPageAction).toHaveBeenCalledWith('my-game', 7, {
            subcategoryKey: 'glitchless',
            timing: 'gt',
            sortDesc: true,
            markedOnly: true,
            limit: BOARD_PAGE_SIZE,
            offset: 3 * BOARD_PAGE_SIZE,
        });
    });

    it('discards a late response after the selection changed', async () => {
        const slowA = deferred<ReturnType<typeof pageOf>>();
        mocks.loadBoardPageAction.mockImplementation(
            (
                _game: string,
                _cat: number,
                filter: { subcategoryKey?: string },
            ) =>
                filter.subcategoryKey === 'a'
                    ? slowA.promise
                    : Promise.resolve(pageOf(makeRows(2, 100))),
        );

        const { result, rerender } = renderHook(
            ({ key }: { key: string }) =>
                useBoardData('my-game', 7, key, QUERY),
            { initialProps: { key: 'a' } },
        );

        rerender({ key: 'b' });
        await waitFor(() => expect(result.current.rows).toHaveLength(2));

        await act(async () => {
            slowA.resolve(pageOf(makeRows(50)));
        });
        // Board b's rows must survive board a's late response.
        expect(result.current.rows).toHaveLength(2);
        expect(result.current.rows[0].runId).toBe(100);
    });

    it('shows empty rows, not the previous board, while an unseen board loads', async () => {
        const slowB = deferred<ReturnType<typeof pageOf>>();
        mocks.loadBoardPageAction.mockImplementation(
            (
                _game: string,
                _cat: number,
                filter: { subcategoryKey?: string },
            ) =>
                filter.subcategoryKey === 'b'
                    ? slowB.promise
                    : Promise.resolve(pageOf(makeRows(4))),
        );

        const { result, rerender } = renderHook(
            ({ key }: { key: string }) =>
                useBoardData('my-game', 7, key, QUERY),
            { initialProps: { key: 'a' } },
        );
        await waitFor(() => expect(result.current.rows).toHaveLength(4));

        rerender({ key: 'b' });
        expect(result.current.rows).toHaveLength(0);
    });

    it('serves the cached page instantly when returning to a board, then revalidates', async () => {
        const revalidate = deferred<ReturnType<typeof pageOf>>();
        let aCalls = 0;
        mocks.loadBoardPageAction.mockImplementation(
            (
                _game: string,
                _cat: number,
                filter: { subcategoryKey?: string },
            ) => {
                if (filter.subcategoryKey === 'a') {
                    aCalls += 1;
                    return aCalls === 1
                        ? Promise.resolve(pageOf(makeRows(4)))
                        : revalidate.promise;
                }
                return Promise.resolve(pageOf(makeRows(2, 100)));
            },
        );

        const { result, rerender } = renderHook(
            ({ key }: { key: string }) =>
                useBoardData('my-game', 7, key, QUERY),
            { initialProps: { key: 'a' } },
        );
        await waitFor(() => expect(result.current.rows).toHaveLength(4));

        rerender({ key: 'b' });
        await waitFor(() => expect(result.current.rows).toHaveLength(2));

        rerender({ key: 'a' });
        // Cached board-a page paints before the revalidating fetch resolves.
        expect(result.current.rows).toHaveLength(4);
        expect(result.current.rows[0].runId).toBe(1);

        await act(async () => {
            revalidate.resolve(pageOf(makeRows(6)));
        });
        await waitFor(() => expect(result.current.rows).toHaveLength(6));
    });

    it('surfaces errors and clears rows', async () => {
        mocks.loadBoardPageAction.mockResolvedValue({ error: 'nope' });

        const { result } = renderHook(() =>
            useBoardData('my-game', 7, '', QUERY),
        );

        await waitFor(() => expect(result.current.error).toBe('nope'));
        expect(result.current.rows).toHaveLength(0);
    });

    it('a reload closure captured before a selection change is a no-op', async () => {
        mocks.loadBoardPageAction.mockResolvedValue(pageOf(makeRows(2)));

        const { result, rerender } = renderHook(
            ({ key }: { key: string }) =>
                useBoardData('my-game', 7, key, QUERY),
            { initialProps: { key: 'a' } },
        );
        await waitFor(() => expect(result.current.rows).toHaveLength(2));
        const staleReload = result.current.reload;

        rerender({ key: 'b' });
        await waitFor(() =>
            expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(2),
        );

        act(() => {
            staleReload();
        });
        // No third fetch for the board the mod already left.
        expect(mocks.loadBoardPageAction).toHaveBeenCalledTimes(2);
    });

    it('returns empty without fetching when no category is selected', async () => {
        const { result } = renderHook(() =>
            useBoardData('my-game', null, '', QUERY),
        );
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rows).toHaveLength(0);
        expect(mocks.loadBoardPageAction).not.toHaveBeenCalled();
    });
});
