'use client';

import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    describeConsequences,
    type VariablePreview,
} from '~src/lib/variables/consequences';
import { BoardDialog } from '../../shared/board-dialog';
import { rebuildBoardsAction } from './actions/rebuild-boards.action';
import styles from './variables.module.scss';

interface Props {
    open: boolean;
    /** null while the dry run is in flight. */
    preview: VariablePreview | null;
    loading: boolean;
    error: string | null;
    variableName: string;
    action: 'save' | 'delete';
    gameSlug: string;
    gameId: number;
    onConfirm: () => void;
    onCancel: () => void;
    pending: boolean;
}

/**
 * The review step in front of every write.
 *
 * Ceremony scales to consequence: a change that moves nothing collapses to a
 * single confirm; one that repartitions the board shows the boards and their
 * counts, and offers the rebuild that applies it to runs that already exist.
 */
export function ConsequenceDialog({
    open,
    preview,
    loading,
    error,
    variableName,
    action,
    gameSlug,
    gameId,
    onConfirm,
    onCancel,
    pending,
}: Props) {
    const [rebuilding, startRebuild] = useTransition();
    const [rebuilt, setRebuilt] = useState(false);

    const copy = preview
        ? describeConsequences(preview, { variableName, action })
        : null;

    const rebuild = () => {
        startRebuild(async () => {
            const res = await rebuildBoardsAction({ gameSlug, gameId });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setRebuilt(true);
        });
    };

    return (
        <BoardDialog
            open={open}
            onClose={onCancel}
            labelledBy="consequence-title"
            size="md"
            closeOnBackdropClick={!pending && !loading}
        >
            <h5 id="consequence-title" className={styles.dialogTitle}>
                {action === 'delete'
                    ? `Delete ${variableName}?`
                    : `Save ${variableName}?`}
            </h5>

            {loading && (
                <p className={styles.dialogBody}>
                    Working out what this changes…
                </p>
            )}

            {error && <div className={styles.dialogError}>{error}</div>}

            {copy && !loading && (
                <div className={styles.dialogBody}>
                    <p className={styles.dialogHeadline}>{copy.headline}</p>
                    {copy.detail && (
                        <p className={styles.dialogDetail}>{copy.detail}</p>
                    )}

                    {copy.boards.length > 0 && (
                        <ul className={styles.boardList}>
                            {copy.boards.map((b) => (
                                <li key={b.key} className={styles.boardRow}>
                                    <span>{b.label}</span>
                                    <span className={styles.boardCounts}>
                                        {b.before.toLocaleString()} →{' '}
                                        {b.after.toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {preview && preview.categories.length > 1 && (
                        <ul className={styles.boardList}>
                            {preview.categories.map((c) => (
                                <li
                                    key={c.categoryId}
                                    className={styles.boardRow}
                                >
                                    <span>{c.display}</span>
                                    <span className={styles.boardCounts}>
                                        {c.moved.toLocaleString()} moving
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!copy.nothingMoves && (
                        <div className={styles.rebuildRow}>
                            <span>Runs move on the next rebuild.</span>
                            {rebuilt ? (
                                <span className={styles.rebuildDone}>
                                    Rebuild queued. Boards update within a few
                                    minutes.
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={rebuilding}
                                    onClick={rebuild}
                                >
                                    {rebuilding ? 'Starting…' : 'Rebuild now'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className={styles.dialogFooter}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onCancel}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={
                        action === 'delete'
                            ? 'btn btn-sm btn-danger'
                            : 'btn btn-sm btn-primary'
                    }
                    onClick={onConfirm}
                    disabled={pending || loading || !!error || !preview}
                >
                    {pending
                        ? 'Saving…'
                        : action === 'delete'
                          ? `Delete ${variableName}`
                          : 'Save changes'}
                </button>
            </div>
        </BoardDialog>
    );
}
