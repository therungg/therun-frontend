'use client';

import { useState } from 'react';
import { XLg } from 'react-bootstrap-icons';
import { RunActionDialog } from '../manage/moderation/shared/run-action-dialog';
import styles from './leaderboard.module.scss';

interface Props {
    gameSlug: string;
    /** Null for a set time, which has no backing run. */
    runId: number | null;
    /** Set only for a set time — Remove maps to delete for these. */
    manualTimeId: number | null;
    runnerName: string;
    /** Null for a guest — Remove then has no runner-scoped option to offer. */
    userId: number | null;
    /** Absent on boards that haven't been given one; the runner-scoped
     *  option needs it, the per-run removal doesn't. */
    categoryId?: number;
    categoryDisplay: string;
    /** Board page refetch — also runs after an Undo from the toast. */
    onMutated: () => void;
}

/**
 * Remove, straight from the board row, beside Verify.
 *
 * Verify and Remove are the two halves of the same judgement, and Verify was
 * already one click while Remove meant opening the drawer first. This is not
 * a second removal mechanism: it opens the same `RunActionDialog` every other
 * surface opens, with the same reason gate, preview and undo — including the
 * choice between this run and every run the runner has on this board.
 */
export function QuickRemoveButton({
    gameSlug,
    runId,
    manualTimeId,
    runnerName,
    userId,
    categoryId,
    categoryDisplay,
    onMutated,
}: Props) {
    const [open, setOpen] = useState(false);
    const subject = manualTimeId != null ? 'set time' : 'run';

    return (
        <>
            <button
                type="button"
                className={styles.quickRemove}
                aria-label={`Remove ${runnerName}'s ${subject}`}
                title={`Remove ${runnerName}'s ${subject}`}
                onClick={() => setOpen(true)}
            >
                <XLg size={14} aria-hidden />
                Remove
            </button>
            {open && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb="remove"
                    target={{
                        kind: 'runs',
                        runIds: runId != null ? [runId] : [],
                        manualTimeIds:
                            manualTimeId != null ? [manualTimeId] : undefined,
                        label: `${runnerName}'s ${subject}`,
                        // Offered on real runs only. An exclusion rule flips
                        // `excluded` on runs; manual_times has no such column
                        // and propagateExclusion never touches it, so on a
                        // set-time row "every run on this board" would leave
                        // the very row the mod is looking at standing.
                        runner:
                            manualTimeId == null &&
                            userId != null &&
                            categoryId != null
                                ? {
                                      id: userId,
                                      name: runnerName,
                                      categoryId,
                                      categoryDisplay,
                                  }
                                : undefined,
                    }}
                    onDone={() => {
                        setOpen(false);
                        onMutated();
                    }}
                    onClose={() => setOpen(false)}
                    onUndoComplete={onMutated}
                />
            )}
        </>
    );
}
