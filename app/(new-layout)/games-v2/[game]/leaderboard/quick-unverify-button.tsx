'use client';

import { type Ref, useTransition } from 'react';
import { ArrowCounterclockwise } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { undoReason } from '../manage/moderation/shared/action-model';
import { applyVerdictsAction } from '../manage/moderation/shared/actions/verdicts.action';
import { fireUndoToast } from '../manage/moderation/shared/undo-toast';
import styles from './leaderboard.module.scss';

interface Props {
    gameSlug: string;
    runId: number;
    runnerName: string;
    /** Board page refetch — also runs after an Undo from the toast. */
    onMutated: () => void;
    /** The row's hover shortcut (`v`) clicks the button through this. */
    ref?: Ref<HTMLButtonElement>;
}

// Same canned note the drawer's Unverify form sends for a blank optional
// reason — the backend requires a non-empty reason on every verdict.
const QUICK_UNVERIFY_REASON = 'Verification unset — back to pending.';

/**
 * One-click Unverify for a verified run, straight from its board row — the
 * mirror of QuickVerifyButton, occupying the same slot (`v` and all) on rows
 * where Verify has already happened. Unsets the verification (verified →
 * pending) without removing the run; the undo toast re-verifies.
 */
export function QuickUnverifyButton({
    gameSlug,
    runId,
    runnerName,
    onMutated,
    ref,
}: Props) {
    const [isPending, startTransition] = useTransition();

    const unverify = () => {
        startTransition(async () => {
            const res = await applyVerdictsAction(
                gameSlug,
                'unverify',
                [runId],
                QUICK_UNVERIFY_REASON,
            );
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            fireUndoToast(
                `Unverified ${runnerName}'s run — back to pending.`,
                () =>
                    applyVerdictsAction(
                        gameSlug,
                        'verify',
                        [runId],
                        undoReason('unverify'),
                    ),
                onMutated,
            );
            onMutated();
        });
    };

    return (
        <button
            ref={ref}
            type="button"
            className={styles.quickUnverify}
            disabled={isPending}
            onClick={unverify}
            aria-label={`Unverify ${runnerName}'s run`}
            title={`Unset verification on ${runnerName}'s run (v)`}
        >
            <ArrowCounterclockwise size={14} aria-hidden />
            {isPending ? 'Unverifying…' : 'Unverify'}
            <kbd className={styles.shortcutKey}>v</kbd>
        </button>
    );
}
