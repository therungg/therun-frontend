'use client';

import type { VariablePreview } from '~src/lib/variables/consequences';
import { describeConsequences } from '~src/lib/variables/consequences';
import styles from './variables-grid.module.scss';

/**
 * The confirm step for a staged change set: what it will do to existing runs,
 * in words, before anything is written.
 *
 * One honest summary for the whole staged set, instead of N confirmations.
 * Reuses describeConsequences so the wording matches the per-variable editor.
 *
 * Split out of variables-grid.tsx, which had grown to serve two surfaces (the
 * wizard step and the console pane) and every control on both.
 */
export function ConsequenceDialog({
    name,
    preview,
    busy,
    onCancel,
    onConfirm,
}: {
    name: string;
    preview: VariablePreview;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const copy = describeConsequences(preview, {
        variableName: name,
        action: 'save',
    });

    return (
        // Backdrop dismissal is a convenience; Cancel is the keyboard path.
        <div className={styles.dialogBackdrop} onClick={onCancel}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={`Apply changes to ${name}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.dialogHeader}>
                    <p className={styles.dialogTitle}>{copy.headline}</p>
                </div>

                <div className={styles.dialogBody}>
                    {copy.detail && (
                        <p className={styles.dialogNote}>{copy.detail}</p>
                    )}

                    {preview.categories.length > 0 && (
                        <ul className={styles.dialogList}>
                            {preview.categories.map((c) => (
                                <li key={c.categoryId}>
                                    {c.display} —{' '}
                                    <span className={styles.dialogMoved}>
                                        {c.moved}
                                    </span>{' '}
                                    {c.moved === 1 ? 'run' : 'runs'} move
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.dialogFooter}>
                    <button
                        type="button"
                        className={styles.pendingBtn}
                        disabled={busy}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.pendingApply}
                        disabled={busy}
                        onClick={onConfirm}
                    >
                        {busy ? 'Applying…' : 'Apply'}
                    </button>
                </div>
            </div>
        </div>
    );
}
