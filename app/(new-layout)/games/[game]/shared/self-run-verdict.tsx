'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    revalidateSelfBoardsAction,
    selfRunVerdictAction,
} from '~src/actions/run-user-actions.action';
import { BoardDialog } from './board-dialog';
import styles from './self-run-verdict.module.scss';

type Verdict = 'reject' | 'unreject';

/** The board the run sits on, so the board shows the change right away. */
export interface SelfVerdictBoard {
    gameSlug: string;
    gameId: number;
    categoryId: number;
    subcategoryKey: string;
}

interface PendingConfirm {
    runId: number;
    verdict: Verdict;
    board?: SelfVerdictBoard;
}

const COPY: Record<
    Verdict,
    { title: string; body: string; confirmLabel: string }
> = {
    reject: {
        title: 'Remove from the boards',
        body: 'It goes off every board. You can put it back from this page.',
        confirmLabel: 'Remove',
    },
    unreject: {
        title: 'Put back on the boards',
        body: 'Your run goes back on the boards.',
        confirmLabel: 'Put back',
    },
};

/**
 * Shared "hide my run" / "restore my run" logic: the server action call,
 * confirmation state, toasts, and the refresh afterward. Used by both the
 * leaderboard row menu and the run detail page's RunActions so the
 * mutation isn't duplicated between them — render `<SelfRunVerdictDialog>`
 * alongside whatever trigger calls `requestVerdict`.
 */
export function useSelfRunVerdict() {
    const router = useRouter();
    const [confirmState, setConfirmState] = useState<PendingConfirm | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const requestVerdict = (
        runId: number,
        verdict: Verdict,
        board?: SelfVerdictBoard,
    ) => {
        setError(null);
        setConfirmState({ runId, verdict, board });
    };

    const cancel = () => {
        if (pending) return;
        setConfirmState(null);
        setError(null);
    };

    const confirm = () => {
        if (!confirmState) return;
        const { runId, verdict, board } = confirmState;
        setError(null);
        startTransition(async () => {
            const res = await selfRunVerdictAction(runId, verdict);
            if ('error' in res) {
                // Stay open with the failure surfaced inline — matches every
                // other confirm dialog's convention. Only success closes it.
                setError(res.error);
                return;
            }
            // The action only expires the run's own page; the board is
            // cached separately and would keep showing the old state.
            if (board && !res.noop) {
                await revalidateSelfBoardsAction(board.gameSlug, board.gameId, [
                    {
                        categoryId: board.categoryId,
                        subcategoryKey: board.subcategoryKey,
                    },
                ]);
            }
            if (res.noop) {
                toast.info('No change needed.');
            } else if (res.applied === 'provisional') {
                toast.success('Submitted for moderator review.');
            } else {
                toast.success(
                    verdict === 'reject'
                        ? 'Your run is off the boards.'
                        : 'Your run is back on the boards.',
                );
            }
            setConfirmState(null);
            router.refresh();
        });
    };

    return { confirmState, pending, error, requestVerdict, cancel, confirm };
}

export function SelfRunVerdictDialog({
    confirmState,
    pending,
    error = null,
    onCancel,
    onConfirm,
}: {
    confirmState: PendingConfirm | null;
    pending: boolean;
    error?: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const copy = COPY[confirmState?.verdict ?? 'reject'];

    return (
        <BoardDialog
            open={confirmState != null}
            onClose={onCancel}
            labelledBy="self-run-verdict-title"
            size="sm"
            initialFocusRef={cancelRef}
            closeOnBackdropClick={!pending}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id="self-run-verdict-title">
                    {copy.title}
                </h5>
            </div>
            <div className={styles.body}>
                <p className={styles.message}>{copy.body}</p>
                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <button
                    ref={cancelRef}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onCancel}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${confirmState?.verdict === 'reject' ? styles.btnDanger : 'btn-primary'}`}
                    onClick={onConfirm}
                    disabled={pending}
                >
                    {pending ? 'Working…' : copy.confirmLabel}
                </button>
            </div>
        </BoardDialog>
    );
}
