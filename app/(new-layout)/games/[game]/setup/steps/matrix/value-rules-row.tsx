'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import styles from './matrix.module.scss';

/**
 * The rules one subcategory value carries.
 *
 * A value is part of what a board IS ("Any% · No Death Abuse"), and the rules
 * that come with it are often the only ones written down — speedrun.com keeps
 * them on the variant, not on the category, so an imported board arrives with
 * them here. Editing is one value at a time: the text belongs to the value,
 * and it follows that value onto every board it is part of.
 */
export function ValueRulesRow({
    label,
    rules,
    disabled,
    onSave,
}: {
    label: string;
    rules: string;
    disabled: boolean;
    onSave: (rules: string) => Promise<{ ok: true } | { error: string }>;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState(rules);
    const [saving, startSave] = useTransition();

    const save = () => {
        startSave(async () => {
            const res = await onSave(text);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success(`Rules for ${label} saved.`);
            setOpen(false);
            router.refresh();
        });
    };

    if (!open) {
        return (
            <div className={styles.sliceRow}>
                <span className={styles.sliceLabel}>{label}</span>
                <button
                    type="button"
                    className={styles.rulesChip}
                    disabled={disabled}
                    onClick={() => {
                        setText(rules);
                        setOpen(true);
                    }}
                >
                    {rules.trim() ? 'Edit rules' : 'Add rules'}
                </button>
                <span className={styles.sliceNote}>
                    {rules.trim()
                        ? firstLine(rules)
                        : `Rules that hold only for ${label}.`}
                </span>
            </div>
        );
    }

    return (
        <div className={styles.valueRulesEditor}>
            <span className={styles.sliceLabel}>{label}</span>
            <textarea
                className={`form-control form-control-sm ${styles.valueRulesInput}`}
                rows={5}
                value={text}
                disabled={saving}
                aria-label={`Rules for ${label}`}
                onChange={(e) => setText(e.target.value)}
            />
            <div className={styles.valueRulesActions}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={saving}
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={saving || text === rules}
                    onClick={save}
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
}

/** Enough of the rules to recognise them, on one line. */
function firstLine(rules: string): string {
    const line = rules.replace(/\s+/g, ' ').trim();
    return line.length > 70 ? `${line.slice(0, 69)}…` : line;
}
