'use client';

import { useId, useState } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { RejectionReasonKey } from '../../../../../../types/moderation.types';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import { MIN_REASON } from '../../manage/moderation/moderate/run-heavy-verbs';
import { ReasonKeyPicker } from '../../manage/moderation/shared/reason-key-picker';
import { BoardDialog } from '../../shared/board-dialog';
import type { RunViewModel } from '../run-view';
import styles from './decision-bar.module.scss';

/**
 * Reject: a reason from the closed list and an optional note to the runner.
 * "Other" is not a reason on its own, so it needs the note.
 */
export function RejectDialog({
    model,
    timeMs,
    busy,
    onCancel,
    onSubmit,
}: {
    model: RunViewModel;
    /** The time the board ranks the run by. */
    timeMs: number | null;
    busy: boolean;
    onCancel: () => void;
    onSubmit: (key: RejectionReasonKey, note: string) => void;
}) {
    const titleId = useId();
    const noteId = useId();
    const [key, setKey] = useState<RejectionReasonKey | null>(null);
    const [note, setNote] = useState('');
    // A manual time sends the note itself as its reason, and that takes
    // written words: an empty note falls back to the reason's label, a
    // short one is held back rather than swapped for the label unseen.
    const noteLength = note.trim().length;
    const noteShort =
        noteLength < MIN_REASON &&
        (key === 'other' || (model.kind === 'manual' && noteLength > 0));
    const ready = key !== null && !noteShort;

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
                    Reject this run
                </h5>
                <span className={styles.dialogSub}>
                    <span className={styles.dialogSubRunner}>
                        <RunnerAvatar
                            name={model.runnerName}
                            picture={model.picture}
                            size="xs"
                        />
                        {model.runnerName}
                    </span>{' '}
                    · {model.categoryDisplay}
                    {timeMs != null ? (
                        <>
                            {' · '}
                            <span className={styles.mono}>
                                <DurationToFormatted duration={timeMs} />
                            </span>
                        </>
                    ) : null}
                </span>
            </div>
            <form
                className={styles.dialogBody}
                id={`${titleId}-form`}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (ready && !busy && key) onSubmit(key, note.trim());
                }}
            >
                <ReasonKeyPicker
                    value={key}
                    onChange={setKey}
                    disabled={busy}
                    legend="Reason"
                />
                <div>
                    <label htmlFor={noteId} className={styles.fieldLabel}>
                        Note to the runner
                        {noteShort ? (
                            <span className={styles.fieldRequired}>
                                Required, {MIN_REASON} characters or more
                            </span>
                        ) : null}
                    </label>
                    <textarea
                        id={noteId}
                        className={styles.textarea}
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={busy}
                    />
                </div>
                <p className={styles.notice}>
                    They get a notification with this reason and note, and can
                    appeal from the run page.
                </p>
            </form>
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
                    type="submit"
                    form={`${titleId}-form`}
                    className={styles.danger}
                    disabled={!ready || busy}
                >
                    Reject
                </button>
            </div>
        </BoardDialog>
    );
}
