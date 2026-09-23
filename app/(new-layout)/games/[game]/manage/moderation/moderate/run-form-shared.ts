'use client';

import { useEffect, useState } from 'react';
import { otherTiming } from '~src/lib/run-times';
import type { SecondaryTimeInput } from '../../../../../../../types/moderation.types';
import { previewManualTimeAction } from '../shared/actions/manual-times.action';
import type { BoardClocks } from '../shared/board-clocks';
import type { SheetBoard } from './subject';

/**
 * Where a proposed time would land on the board: typed into Set time, or
 * measured by the Retime markers. Both replace the run's time, so both
 * preview a rank. Null while there is no time, or the read failed.
 */
export function useTimePreviewRank({
    gameSlug,
    userId,
    runnerName,
    board,
    timeMs,
    retime,
}: {
    gameSlug: string;
    userId: number | null;
    runnerName: string;
    board: SheetBoard;
    timeMs: number | null;
    /** A retime measures real time whatever the board's clock is. */
    retime: boolean;
}): number | null {
    const [rank, setRank] = useState<number | null>(null);
    const { categoryId, subcategoryKey, primaryTiming } = board;
    useEffect(() => {
        if (timeMs == null) {
            setRank(null);
            return;
        }
        let cancelled = false;
        const t = setTimeout(() => {
            previewManualTimeAction(gameSlug, {
                runnerRef:
                    userId != null ? { userId } : { guestName: runnerName },
                categoryId,
                subcategoryKey,
                timing:
                    retime || primaryTiming !== 'gt' ? 'realtime' : 'gametime',
                timeMs,
            })
                .then((res) => {
                    if (cancelled || 'error' in res) return;
                    setRank(res.preview.resultingEntry.rank);
                })
                .catch(() => {
                    // No rank then; the time itself still reads.
                });
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [
        timeMs,
        retime,
        gameSlug,
        userId,
        runnerName,
        categoryId,
        subcategoryKey,
        primaryTiming,
    ]);
    return rank;
}

/**
 * Set time's second clock. Clearing a clock the entry showed removes it. An
 * empty field that started empty sends nothing: not every read path reports
 * the second clock, and absence there must not delete a row the moderator
 * was never shown.
 */
export function setTimeSecondary(
    clocks: BoardClocks | null,
    newSecondaryMs: number | null,
    runSecondaryMs: number | null,
): SecondaryTimeInput | null | undefined {
    if (!clocks?.showSecondary) return undefined;
    if (newSecondaryMs != null) {
        return {
            timing: otherTiming(clocks.primaryTiming),
            timeMs: newSecondaryMs,
        };
    }
    return runSecondaryMs != null ? null : undefined;
}
