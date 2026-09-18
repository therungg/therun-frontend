'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type {
    BoardPage,
    LeaderboardRosterRow,
} from '../../../../../../types/moderation.types';
import { loadBoardPageAction } from './actions/load-board-page.action';

export const BOARD_PAGE_SIZE = 100;

export interface BoardQuery {
    /** Which board: entry flags + sort column for real time or game time. */
    timing: 'rt' | 'gt';
    /** Inverted categories (`sortAscending: false`) rank longest time #1. */
    sortDesc: boolean;
    /** Restrict rows to marked-for-later runs; totals stay board-wide. */
    markedOnly: boolean;
    /** 0-based page of BOARD_PAGE_SIZE rows. */
    page: number;
}

export interface UseBoardData {
    rows: LeaderboardRosterRow[];
    /** Board entries for this timing/subcategory, ignoring markedOnly. */
    total: number;
    markedTotal: number;
    loading: boolean;
    error: string | null;
    reload: () => void;
}

interface BoardState extends BoardPage {
    key: string;
    error: string | null;
}

const EMPTY: BoardPage = { rows: [], total: 0, markedTotal: 0 };

/**
 * Loads one server-side page of one board through the mod eligible-runs
 * endpoint's `onBoard` mode (`loadBoardPageAction`): the backend filters to
 * actual board entries, orders them, and counts totals, so a page's rank is
 * just offset + index. Every mutation (row actions, bulk, undo toasts)
 * calls `reload()` after a successful action rather than patching local
 * state.
 *
 * Responses are cached per (board, filters, page) for the lifetime of the
 * component, and the cache paints synchronously when a selection changes —
 * switching between boards shows the previously-loaded page instantly (never
 * the *other* board's rows) while a background refetch revalidates it.
 */
export function useBoardData(
    gameSlug: string,
    categoryId: number | null,
    subcategoryKey: string,
    query: BoardQuery,
): UseBoardData {
    const { timing, sortDesc, markedOnly, page } = query;
    const key =
        categoryId == null
            ? null
            : `${categoryId}|${subcategoryKey}|${timing}|${sortDesc}|${markedOnly}|${page}`;
    // Totals are board-wide (the server counts them ignoring markedOnly and
    // paging), so they're remembered per board rather than per page-key:
    // without this, navigating to a not-yet-cached page would report total 0
    // for a render, the pager's pageCount would collapse to 1, and the page
    // clamp in BoardCuration would snap the mod straight back to page 0 —
    // "Next does nothing".
    const boardKey =
        categoryId == null
            ? null
            : `${categoryId}|${subcategoryKey}|${timing}|${sortDesc}`;

    const [state, setState] = useState<BoardState>({
        key: '',
        ...EMPTY,
        error: null,
    });
    const [isPending, startTransition] = useTransition();
    const cacheRef = useRef(new Map<string, BoardPage>());
    const totalsRef = useRef(
        new Map<string, { total: number; markedTotal: number }>(),
    );

    // What this render is actually showing — checked before an in-flight
    // fetch's result gets applied, and before a stale closure's `load` even
    // fires. `reload` is handed out to callers (undo toasts, sibling-row
    // mutations) that stash it in a closure and may not invoke it until well
    // after the mod has switched board/filter/page; without the guard the old
    // closure would overwrite the new selection's rows.
    const keyRef = useRef(key);
    keyRef.current = key;

    const load = useCallback(() => {
        if (categoryId == null || key == null) return;
        if (keyRef.current !== key) return;
        startTransition(async () => {
            const res = await loadBoardPageAction(gameSlug, categoryId, {
                subcategoryKey: subcategoryKey || undefined,
                timing,
                sortDesc: sortDesc || undefined,
                markedOnly: markedOnly || undefined,
                limit: BOARD_PAGE_SIZE,
                offset: page * BOARD_PAGE_SIZE,
            });
            if (keyRef.current !== key) return;
            if ('error' in res) {
                cacheRef.current.delete(key);
                setState({ key, ...EMPTY, error: res.error });
                return;
            }
            const data: BoardPage = {
                rows: res.rows,
                total: res.total,
                markedTotal: res.markedTotal,
            };
            cacheRef.current.set(key, data);
            totalsRef.current.set(
                `${categoryId}|${subcategoryKey}|${timing}|${sortDesc}`,
                { total: res.total, markedTotal: res.markedTotal },
            );
            setState({ key, ...data, error: null });
        });
    }, [
        gameSlug,
        categoryId,
        subcategoryKey,
        timing,
        sortDesc,
        markedOnly,
        page,
        key,
    ]);

    useEffect(() => {
        load();
    }, [load]);

    // Derived at render time so a selection switch never shows the previous
    // board: fresh state if it matches this key, else the cached page for
    // this key (instant back-switching), else empty rows — but with the
    // board's last-known totals, so the pager stays put while a new page of
    // the same board loads.
    const knownTotals =
        (boardKey != null ? totalsRef.current.get(boardKey) : undefined) ??
        EMPTY;
    const display: BoardState =
        key != null && state.key === key
            ? state
            : {
                  key: key ?? '',
                  ...EMPTY,
                  ...knownTotals,
                  ...(key != null ? cacheRef.current.get(key) : undefined),
                  error: null,
              };

    return {
        rows: display.rows,
        total: display.total,
        markedTotal: display.markedTotal,
        loading: isPending,
        error: display.error,
        reload: load,
    };
}
