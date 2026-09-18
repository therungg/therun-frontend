'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { buildSubcategoryKey } from '~src/lib/variables/keys';
import type {
    LeaderboardEntry,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import {
    defaultCanonicalOf,
    subcategoryVariablesFor,
} from '../../boards/subcategory-bands';
import { previewExcludeAction } from '../shared/actions/exclude.action';
import { previewVerdictsAction } from '../shared/actions/verdicts.action';
import { loadRemovedRunIdsAction } from './actions/sheet-reads.action';
import { bulkVerbs, type RunVerbState, type VerbAvailability } from './verbs';

export type BulkVerb = 'approve' | 'decline' | 'remove' | 'restore' | 'move';

export interface BulkRun {
    runId: number;
    runnerName: string;
    /** The run's own board within the subject's category. */
    subcategoryKey: string;
}

/** The exclude preview lists at most this many runs, so it is asked in chunks. */
const PREVIEW_CHUNK = 25;

const isManual = (e: LeaderboardEntry) => e.source === 'manual';

class PreviewError extends Error {}

interface SelectionPreview {
    /** Approved runs still on the board: what Remove acts on. */
    onBoardIds: number[];
    /**
     * Approved runs a moderator removed, from each run's history: what Restore
     * adds to the declined. An approved run can also be off the board without
     * being removed (not eligible); Restore leaves those alone.
     */
    removedIds: number[];
    /** Distinct boards the pending and approved runs sit on. */
    boards: Set<string>;
}

const boardKey = (b: { categoryId: number; subcategoryKey: string }) =>
    `${b.categoryId}:${b.subcategoryKey}`;

/**
 * A bulk selection split by what each verb acts on, with the counts the bar
 * and the forms show. Removed is not on the row: the exclude preview says
 * which approved runs are still on the board, and the history of the rest
 * says which of them were removed. `reload()` clears it and reads again;
 * until it lands the counts that need it read as loading.
 */
export function useBulkSelection(
    entries: LeaderboardEntry[],
    gameSlug: string,
    board: { categoryId: number; subcategoryKey: string },
    variables: VariableRow[],
) {
    const subVars = subcategoryVariablesFor(board.categoryId, variables);
    const sourceKeyOf = (e: LeaderboardEntry) =>
        subVars.length === 0
            ? board.subcategoryKey
            : buildSubcategoryKey(
                  subVars.map((v) => ({
                      name: v.nameNormalized,
                      value:
                          e.variables?.[v.nameNormalized] ??
                          defaultCanonicalOf(v),
                  })),
              );

    const runEntries = entries.filter(
        (e): e is LeaderboardEntry & { runId: number } =>
            !isManual(e) && e.runId != null,
    );
    const manuals = entries.filter(
        (e): e is LeaderboardEntry & { manualTimeId: number } =>
            isManual(e) && e.manualTimeId != null,
    );
    const runs: BulkRun[] = runEntries.map((e) => ({
        runId: e.runId,
        runnerName: e.runnerName,
        subcategoryKey: sourceKeyOf(e),
    }));
    const runIdsWith = (status: LeaderboardEntry['verificationStatus']) =>
        runEntries
            .filter((e) => e.verificationStatus === status)
            .map((e) => e.runId);
    const manualIdsWith = (status: LeaderboardEntry['verificationStatus']) =>
        manuals
            .filter((e) => e.verificationStatus === status)
            .map((e) => e.manualTimeId);
    const pendingRunIds = runIdsWith('pending');
    const approvedRunIds = runIdsWith('verified');
    const declinedRunIds = runIdsWith('rejected');
    const pendingManualIds = manualIdsWith('pending');
    const approvedManualIds = manualIdsWith('verified');

    // ---- Preview ----------------------------------------------------------------
    const [preview, setPreview] = useState<SelectionPreview | null>(null);
    const [tick, setTick] = useState(0);
    const loadSeq = useRef(0);
    const pendingSig = pendingRunIds.join(',');
    const approvedSig = approvedRunIds.join(',');

    useEffect(() => {
        const seq = ++loadSeq.current;
        // Counts never mix fresh entries with an old read.
        setPreview(null);
        const pending = pendingSig ? pendingSig.split(',').map(Number) : [];
        const approved = approvedSig ? approvedSig.split(',').map(Number) : [];
        const load = async (): Promise<SelectionPreview> => {
            const chunks: number[][] = [];
            for (let i = 0; i < approved.length; i += PREVIEW_CHUNK) {
                chunks.push(approved.slice(i, i + PREVIEW_CHUNK));
            }
            const [verdicts, ...excludes] = await Promise.all([
                pending.length
                    ? previewVerdictsAction(gameSlug, 'verify', pending)
                    : null,
                ...chunks.map((runIds) =>
                    previewExcludeAction(gameSlug, { runIds }),
                ),
            ]);
            const boards = new Set<string>();
            if (verdicts) {
                if ('error' in verdicts) throw new PreviewError(verdicts.error);
                for (const lb of verdicts.preview.affectedLeaderboards) {
                    boards.add(boardKey(lb));
                }
            }
            const onBoard = new Set<number>();
            for (const res of excludes) {
                if ('error' in res) throw new PreviewError(res.error);
                for (const lb of res.preview.affectedLeaderboards) {
                    boards.add(boardKey(lb));
                }
                for (const r of res.preview.sampleRuns) onBoard.add(r.runId);
            }
            const offBoard = approved.filter((id) => !onBoard.has(id));
            let removedIds: number[] = [];
            if (offBoard.length) {
                const removed = await loadRemovedRunIdsAction(
                    gameSlug,
                    offBoard,
                );
                if ('error' in removed) throw new PreviewError(removed.error);
                const set = new Set(removed.removedIds);
                removedIds = offBoard.filter((id) => set.has(id));
            }
            return {
                onBoardIds: approved.filter((id) => onBoard.has(id)),
                removedIds,
                boards,
            };
        };
        load()
            .then((p) => {
                if (seq === loadSeq.current) setPreview(p);
            })
            .catch((e: unknown) => {
                if (seq !== loadSeq.current) return;
                toast.error(
                    e instanceof PreviewError
                        ? e.message
                        : 'Could not check the selection.',
                );
                // Without the read Remove and Restore act on no approved run.
                setPreview({
                    onBoardIds: [],
                    removedIds: [],
                    boards: new Set(),
                });
            });
    }, [gameSlug, pendingSig, approvedSig, tick]);

    // ---- Counts ---------------------------------------------------------------------
    const loaded = preview !== null;
    const onBoardIds = preview?.onBoardIds ?? [];
    const removedIds = preview?.removedIds ?? [];
    const pendingCount = pendingRunIds.length + pendingManualIds.length;
    const counts: Record<BulkVerb, number> = {
        approve: pendingCount,
        decline: pendingCount,
        remove: onBoardIds.length + approvedManualIds.length,
        restore: declinedRunIds.length + removedIds.length,
        move: runs.length,
    };
    // Manual times sit on the subject's board.
    const boardsTouched = preview
        ? new Set([
              ...preview.boards,
              ...(manuals.length ? [boardKey(board)] : []),
          ]).size
        : null;

    const removedSet = new Set(removedIds);
    const states: RunVerbState[] = entries.map((e) => ({
        status: e.verificationStatus,
        excluded: e.runId != null && removedSet.has(e.runId),
        hasVideo: Boolean(e.vodUrl),
        isManual: isManual(e),
        marked: false,
        inScope: true,
    }));
    const availability: VerbAvailability[] = bulkVerbs(states).map((a) => {
        const verb = a.verb as BulkVerb;
        // Removed is unknown until the preview lands.
        if (
            !loaded &&
            approvedRunIds.length > 0 &&
            (verb === 'remove' ||
                (verb === 'restore' && declinedRunIds.length === 0))
        ) {
            return { verb: a.verb, enabled: false, reason: 'Loading' };
        }
        if (counts[verb] > 0) return { verb: a.verb, enabled: true };
        return {
            verb: a.verb,
            enabled: false,
            reason: a.reason ?? 'Applies to none of the selected runs',
        };
    });

    return {
        runs,
        manuals,
        pendingRunIds,
        approvedRunIds,
        declinedRunIds,
        pendingManualIds,
        approvedManualIds,
        onBoardIds,
        removedIds,
        loaded,
        counts,
        /** Approved entries on the board (runs and manual times), or null while loading. */
        approvedCount: loaded ? counts.remove : null,
        boardsTouched,
        availability,
        reload: () => setTick((t) => t + 1),
    };
}
