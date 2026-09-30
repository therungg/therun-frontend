'use client';

import { useEffect, useState } from 'react';
import { useBackdropDismiss } from './backdrop-dismiss';
import styles from './matrix.module.scss';

interface Props {
    title: string;
    /** Body copy under the title — what this text is for. */
    lede: string;
    initial: string;
    busy: boolean;
    placeholder: string;
    /**
     * Where the unsaved draft is kept between openings, e.g. game + category
     * id. Unique per rules field.
     */
    draftKey: string;
    /** Resolves true once the write landed. */
    onSave: (text: string) => Promise<boolean>;
    onClose: () => void;
}

interface Draft {
    text: string;
    /** The saved rules the draft was written against. */
    base: string;
}

const storageKey = (draftKey: string) => `therun:rules-draft:${draftKey}`;

function readDraft(draftKey: string): Draft | null {
    try {
        const raw = localStorage.getItem(storageKey(draftKey));
        if (!raw) return null;
        const d = JSON.parse(raw) as Draft;
        return typeof d?.text === 'string' && typeof d?.base === 'string'
            ? d
            : null;
    } catch {
        return null;
    }
}

function writeDraft(draftKey: string, draft: Draft | null) {
    try {
        if (draft)
            localStorage.setItem(storageKey(draftKey), JSON.stringify(draft));
        else localStorage.removeItem(storageKey(draftKey));
    } catch {
        // Storage off or full: the draft just isn't kept.
    }
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
    busy,
    placeholder,
    draftKey,
    onSave,
    onClose,
}: Props) {
    const [text, setText] = useState(initial);
    const [restored, setRestored] = useState(false);

    // Unsaved text survives the dialog closing: a stray Escape or a closed
    // tab must not throw away paragraphs of rules. A draft written against
    // rules that have since changed is dropped rather than restored over
    // them. Read after mount: the dialog can be open on the server render.
    useEffect(() => {
        const draft = readDraft(draftKey);
        if (!draft) return;
        if (draft.base.trim() !== initial.trim()) {
            writeDraft(draftKey, null);
            return;
        }
        if (draft.text.trim() === initial.trim()) return;
        setText(draft.text);
        setRestored(true);
        // Only on open; later changes to `initial` are this dialog's own save.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey]);

    const edit = (next: string) => {
        setText(next);
        writeDraft(
            draftKey,
            next.trim() === initial.trim()
                ? null
                : { text: next, base: initial },
        );
    };

    const discard = () => {
        writeDraft(draftKey, null);
        setText(initial);
        setRestored(false);
    };

    // Escape closes, like every other dismissible surface on the board.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const dirty = text.trim() !== initial.trim();
    // A stray click outside must not throw away typed rules; with unsaved
    // edits only Cancel, Escape or Save leave.
    const backdrop = useBackdropDismiss(() => {
        if (!dirty) onClose();
    });

    return (
        // Backdrop dismissal is a convenience; Escape and Cancel are the
        // keyboard paths.
        <div className={styles.dialogBackdrop} {...backdrop}>
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
                        onChange={(e) => edit(e.target.value)}
                    />
                    {restored && (
                        <p className={styles.draftNote}>
                            Restored your unsaved changes.{' '}
                            <button
                                type="button"
                                className={styles.draftDiscard}
                                disabled={busy}
                                onClick={discard}
                            >
                                Discard
                            </button>
                        </p>
                    )}
                </div>

                <div className={styles.dialogFooter}>
                    <span className={styles.dialogSpacer} />
                    <button
                        type="button"
                        className={styles.rulesChip}
                        disabled={busy}
                        onClick={() => {
                            writeDraft(draftKey, null);
                            onClose();
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.dialogSave}
                        disabled={busy || !dirty}
                        onClick={async () => {
                            if (await onSave(text.trim())) {
                                writeDraft(draftKey, null);
                            }
                        }}
                    >
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
