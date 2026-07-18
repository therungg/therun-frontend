'use client';

import { type ReactNode, useRef } from 'react';
import { BoardDialog } from './board-dialog';
import styles from './confirm-dialog.module.scss';

export type ConfirmVariant = 'danger' | 'warning' | 'primary';

const VARIANT_CLASS: Record<ConfirmVariant, string> = {
    danger: styles.btnDanger,
    warning: 'btn-warning',
    primary: 'btn-primary',
};

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    labelledBy: string;
    title: string;
    /** The consequence sentence — what confirming actually does. */
    message: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    /** 'danger' for destructive/irreversible actions (the default). */
    variant?: ConfirmVariant;
    pending: boolean;
}

/**
 * Shared confirm dialog — title + consequence sentence + Cancel/Confirm on
 * the BoardDialog primitive. Replaces the browser's native confirm dialog
 * across the console. Cancel holds initial focus (not Confirm) so an
 * accidental Enter doesn't trigger a consequential action.
 */
export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    labelledBy,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Cancel',
    variant = 'danger',
    pending,
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    const requestClose = () => {
        if (!pending) onClose();
    };

    return (
        <BoardDialog
            open={open}
            onClose={requestClose}
            labelledBy={labelledBy}
            size="sm"
            initialFocusRef={cancelRef}
            closeOnBackdropClick={!pending}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id={labelledBy}>
                    {title}
                </h5>
            </div>
            <div className={styles.body}>
                <p className={styles.message}>{message}</p>
            </div>
            <div className={styles.footer}>
                <button
                    ref={cancelRef}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={requestClose}
                    disabled={pending}
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${VARIANT_CLASS[variant]}`}
                    onClick={onConfirm}
                    disabled={pending}
                >
                    {pending ? 'Working…' : confirmLabel}
                </button>
            </div>
        </BoardDialog>
    );
}
