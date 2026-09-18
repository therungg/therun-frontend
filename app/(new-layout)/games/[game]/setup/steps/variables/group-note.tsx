'use client';

import { useState } from 'react';
import styles from './variables-grid.module.scss';

/**
 * The group's mod-facing note (`description` on every row it owns).
 *
 * It has no reader on the public board — it exists so moderators can leave
 * each other a reason. The per-category variable form used to be the only
 * place it could be written; when that form went away this came with it,
 * rather than leaving a stored column with no editor anywhere.
 *
 * Collapsed by default: most groups never carry a note, and an always-open
 * textarea under every group would be the loudest thing on a screen whose
 * subject is the grid above it.
 */
export function GroupNote({
    note,
    busy,
    onSave,
}: {
    note: string | null;
    busy: boolean;
    onSave: (next: string | null) => void;
}) {
    const [draft, setDraft] = useState(note ?? '');
    const trimmed = draft.trim();
    const dirty = trimmed !== (note ?? '').trim();

    return (
        <details className={styles.noteBlock} open={(note ?? '').length > 0}>
            <summary className={styles.noteSummary}>
                Note for moderators
                {note ? '' : ' (none)'}
            </summary>
            <textarea
                className={styles.noteTextarea}
                rows={2}
                value={draft}
                disabled={busy}
                placeholder="Why this exists, or what to watch for. Not shown to runners."
                onChange={(e) => setDraft(e.target.value)}
            />
            <div className={styles.noteActions}>
                <button
                    type="button"
                    className={styles.noteSave}
                    disabled={busy || !dirty}
                    onClick={() => onSave(trimmed.length > 0 ? trimmed : null)}
                >
                    Save note
                </button>
                {dirty && (
                    <button
                        type="button"
                        className={styles.noteCancel}
                        disabled={busy}
                        onClick={() => setDraft(note ?? '')}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </details>
    );
}
