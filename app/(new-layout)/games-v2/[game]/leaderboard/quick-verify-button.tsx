'use client';

import { type Ref, useTransition } from 'react';
import { Check2 } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { UNDO_VERIFY_REASON } from '../manage/moderation/shared/action-model';
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

// Same canned note the action form sends for a blank optional reason —
// the backend requires a non-empty reason on every verdict.
const QUICK_VERIFY_REASON = 'Approved — no issues found.';

/**
 * One-click Verify for a pending run, straight from its board row. The
 * common queue-clearing verb skips the inspector entirely; the undo toast
 * (verify's true inverse, `unverify`) is the safety net.
 */
export function QuickVerifyButton({
    gameSlug,
    runId,
    runnerName,
    onMutated,
    ref,
}: Props) {
    const [isPending, startTransition] = useTransition();

    const verify = () => {
        startTransition(async () => {
            const res = await applyVerdictsAction(
                gameSlug,
                'verify',
                [runId],
                QUICK_VERIFY_REASON,
            );
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            fireUndoToast(
                `Verified ${runnerName}'s run.`,
                () =>
                    applyVerdictsAction(
                        gameSlug,
                        'unverify',
                        [runId],
                        UNDO_VERIFY_REASON,
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
            className={styles.quickVerify}
            disabled={isPending}
            onClick={verify}
            aria-label={`Verify ${runnerName}'s run`}
            title={`Verify ${runnerName}'s run (v)`}
        >
            <Check2 size={14} aria-hidden />
            {isPending ? 'Verifying…' : 'Verify'}
            <kbd className={styles.shortcutKey}>v</kbd>
        </button>
    );
}
