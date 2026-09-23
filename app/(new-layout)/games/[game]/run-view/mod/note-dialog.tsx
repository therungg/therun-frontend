'use client';

import { useId, useState } from 'react';
import { BoardDialog } from '../../shared/board-dialog';
import styles from './decision-bar.module.scss';

/** The moderators' own note on a run. Only moderators see it. */
export function NoteDialog({
    initial,
    busy,
    onCancel,
    onSave,
}: {
    initial: string;
    busy: boolean;
    onCancel: () => void;
    onSave: (note: string) => void;
}) {
    const titleId = useId();
    const [note, setNote] = useState(initial);
    const changed = note.trim() !== initial.trim();

    return (
        <BoardDialog
            open
            onClose={() => {
                if (!busy) onCancel();
            }}
            labelledBy={titleId}
            size="md"
            closeOnBackdropClick={!busy}
            themed
        >
            <div className={styles.dialogHeader}>
                <h5 id={titleId} className={styles.dialogTitle}>
                    Moderator note
                </h5>
            </div>
            <div className={styles.dialogBody}>
                <textarea
                    aria-labelledby={titleId}
                    className={styles.textarea}
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={busy}
                />
            </div>
            <div className={styles.dialogFooter}>
                <button
                    type="button"
                    className={styles.cancel}
                    onClick={onCancel}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.primary}
                    onClick={() => onSave(note.trim())}
                    disabled={!changed || busy}
                >
                    Save
                </button>
            </div>
        </BoardDialog>
    );
}
