'use client';

import moment from 'moment';
import { useRef } from 'react';
import { describeEvent } from '~src/lib/run-view/describe-event';
import type { HistoryEvent } from '../../../../../types/moderation.types';
import { BoardDialog } from '../shared/board-dialog';
import styles from './row-action-dialogs.module.scss';

const MIN_REASON = 10;

interface ReasonDialogProps {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    eyebrow: string;
    title: string;
    blurb: string;
    placeholder: string;
    submitLabel: string;
    reason: string;
    onReasonChange: (value: string) => void;
    onSubmit: () => void;
    pending: boolean;
}

/**
 * Report / appeal dialog — identical chrome, differing copy. A reason
 * textarea (min 10 chars) with a right-aligned Cancel / submit footer,
 * on the shared BoardDialog primitive.
 */
export function ReasonDialog({
    open,
    onClose,
    labelledBy,
    eyebrow,
    title,
    blurb,
    placeholder,
    submitLabel,
    reason,
    onReasonChange,
    onSubmit,
    pending,
}: ReasonDialogProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const reasonOk = reason.trim().length >= MIN_REASON;

    return (
        <BoardDialog
            open={open}
            onClose={onClose}
            labelledBy={labelledBy}
            size="md"
            initialFocusRef={textareaRef}
            closeOnBackdropClick={!pending}
        >
            <div className={styles.header}>
                <div className={styles.headingBlock}>
                    <p className={styles.eyebrow}>{eyebrow}</p>
                    <h5 className={styles.title} id={labelledBy}>
                        {title}
                    </h5>
                </div>
            </div>
            <div className={styles.body}>
                <p className={styles.blurb}>{blurb}</p>
                <label
                    htmlFor={`${labelledBy}-reason`}
                    className={styles.fieldLabel}
                >
                    Reason — min {MIN_REASON} characters
                </label>
                <textarea
                    ref={textareaRef}
                    id={`${labelledBy}-reason`}
                    className={styles.reasonTextarea}
                    rows={3}
                    value={reason}
                    onChange={(e) => onReasonChange(e.target.value)}
                    disabled={pending}
                    placeholder={placeholder}
                />
                {!reasonOk && reason.length > 0 && (
                    <div className={styles.reasonError}>
                        {MIN_REASON - reason.trim().length} more needed.
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={onSubmit}
                    disabled={pending || !reasonOk}
                >
                    {pending ? 'Working…' : submitLabel}
                </button>
            </div>
        </BoardDialog>
    );
}

interface HistoryDialogProps {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    history: HistoryEvent[] | null;
}

/** Read-only moderation-history timeline for a run. */
export function HistoryDialog({
    open,
    onClose,
    labelledBy,
    history,
}: HistoryDialogProps) {
    const closeRef = useRef<HTMLButtonElement>(null);

    return (
        <BoardDialog
            open={open}
            onClose={onClose}
            labelledBy={labelledBy}
            size="md"
            initialFocusRef={closeRef}
        >
            <div className={styles.header}>
                <div className={styles.headingBlock}>
                    <p className={styles.eyebrow}>Run</p>
                    <h5 className={styles.title} id={labelledBy}>
                        Run history
                    </h5>
                </div>
                <button
                    ref={closeRef}
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onClose}
                />
            </div>
            <div className={styles.body}>
                {history === null && (
                    <p className={styles.historyStatus}>Loading…</p>
                )}
                {history !== null && history.length === 0 && (
                    <p className={styles.historyStatus}>
                        No moderation history for this run.
                    </p>
                )}
                {history !== null && history.length > 0 && (
                    <ul className={styles.historyList}>
                        {history.map((event, i) => (
                            <li
                                key={`${event.at}-${i}`}
                                className={styles.historyItem}
                            >
                                <div className={styles.historyEvent}>
                                    {describeEvent(event)}
                                </div>
                                <div className={styles.historyMeta}>
                                    {event.byRole} ·{' '}
                                    {moment(event.at).fromNow()}
                                </div>
                                {event.reason && (
                                    <div className={styles.historyReason}>
                                        “{event.reason}”
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </BoardDialog>
    );
}
