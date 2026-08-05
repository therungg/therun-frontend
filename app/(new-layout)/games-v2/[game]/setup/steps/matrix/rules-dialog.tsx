'use client';

import { useEffect, useState } from 'react';
import styles from './matrix.module.scss';

interface Props {
    title: string;
    /** Body copy under the title — what this text is for. */
    lede: string;
    initial: string;
    /** Board template, offered as a one-click fill. Absent on the board's own
     *  template dialog, which has nothing above it to inherit from. */
    template?: string | null;
    busy: boolean;
    placeholder: string;
    onSave: (text: string) => void;
    onClose: () => void;
}

/**
 * Rules, in a modal.
 *
 * Rules are the one setting on this screen that needs real room — a paragraph
 * or ten, not a value. Expanding a row to hold it pushed everything below it
 * half a screen down and made the grid jump every time one was opened or
 * closed; a modal costs the list nothing because the list is still there when
 * it closes. Everything else stayed a cell precisely so this could be the only
 * thing that takes over.
 */
export function RulesDialog({
    title,
    lede,
    initial,
    template,
    busy,
    placeholder,
    onSave,
    onClose,
}: Props) {
    const [text, setText] = useState(initial);

    // Escape closes, like every other dismissible surface on the board.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const dirty = text.trim() !== initial.trim();

    return (
        // Backdrop dismissal is a convenience; Escape and Cancel are the
        // keyboard paths.
        <div className={styles.dialogBackdrop} onClick={onClose}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.dialogHeader}>
                    <p className={styles.dialogTitle}>{title}</p>
                    <p className={styles.dialogLede}>{lede}</p>
                </div>

                <div className={styles.dialogBody}>
                    <textarea
                        className={styles.rulesTextarea}
                        value={text}
                        disabled={busy}
                        // biome-ignore lint/a11y/noAutofocus: the dialog exists
                        // to type in; landing anywhere else costs a tab.
                        autoFocus
                        aria-label={title}
                        placeholder={placeholder}
                        onChange={(e) => setText(e.target.value)}
                    />
                </div>

                <div className={styles.dialogFooter}>
                    {template && (
                        <button
                            type="button"
                            className={styles.rulesChip}
                            disabled={busy || text.trim() === template.trim()}
                            onClick={() => setText(template)}
                        >
                            Use board template
                        </button>
                    )}
                    <span className={styles.dialogSpacer} />
                    <button
                        type="button"
                        className={styles.rulesChip}
                        disabled={busy}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.dialogSave}
                        disabled={busy || !dirty}
                        onClick={() => onSave(text.trim())}
                    >
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
