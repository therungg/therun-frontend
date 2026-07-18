'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import styles from './undo-toast.module.scss';

export type UndoResult = { error: string } | { ok: true };

// Toast body for a reversible action's success toast. Owns its own pending
// state so the Undo button disables the instant it's clicked and stays
// disabled through the in-flight call — `closeToast()` (called on click,
// below) triggers an async exit transition, so without this the button
// would remain clickable (and re-clickable) while the toast fades out.
function UndoToast({
    message,
    undo,
    onUndone,
    closeToast,
}: {
    message: string;
    undo: () => Promise<UndoResult>;
    onUndone: () => void;
    closeToast: () => void;
}) {
    const [isPending, startTransition] = useTransition();

    const handleUndo = () => {
        closeToast();
        startTransition(async () => {
            try {
                const res = await undo();
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                toast.success('Undone.');
                onUndone();
            } catch {
                // Transport-level failure (dropped connection, mid-deploy
                // RSC error) — the inverse action's `{error}` path only
                // covers handled failures, so a rejected promise needs its
                // own surface.
                toast.error(
                    "Couldn't undo — check your connection and try again.",
                );
            }
        });
    };

    return (
        <div className={styles.toastBody}>
            <span>{message}</span>
            <button
                type="button"
                className={styles.toastUndo}
                onClick={handleUndo}
                disabled={isPending}
            >
                {isPending ? 'Undoing…' : 'Undo'}
            </button>
        </div>
    );
}

/**
 * Fires a success toast with a 10s-live Undo action. Clicking it runs
 * `undo`, surfaces the result, then hands control back to `onUndone` so the
 * caller's list/card reflects the reversal. The round-1 UndoToast pattern —
 * shared by run-action-dialog.tsx's approve/remove/restore/ban flows and
 * categories-table.tsx's Featured/Archived visibility toggles.
 */
export function fireUndoToast(
    message: string,
    undo: () => Promise<UndoResult>,
    onUndone: () => void,
): void {
    toast.success(
        ({ closeToast }) => (
            <UndoToast
                message={message}
                undo={undo}
                onUndone={onUndone}
                closeToast={closeToast}
            />
        ),
        { autoClose: 10000 },
    );
}
