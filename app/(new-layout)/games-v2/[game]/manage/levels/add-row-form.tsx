'use client';

import { type FormEvent, useState } from 'react';
import { Plus } from 'react-bootstrap-icons';
import styles from './levels.module.scss';

export interface AddRowFormProps {
    /**
     * The submit button's visible label. The text input takes "<label> name"
     * as its accessible name so a screen reader doesn't announce two
     * identically-named controls in the same form.
     */
    label: string;
    placeholder: string;
    pending: boolean;
    onAdd: (name: string) => void;
}

/**
 * A single-name add control: type one name, press Enter or the button. Used
 * by both the levels and subcategories tables — the whole point of this pane
 * is that adding is one at a time, not a bulk paste.
 */
export function AddRowForm({
    label,
    placeholder,
    pending,
    onAdd,
}: AddRowFormProps) {
    const [name, setName] = useState('');

    // Only the button is disabled while a add is in flight. Disabling the
    // input too would blur it to <body> on every successful add, which is
    // exactly the flow this control exists to support — typing one name
    // after another. The `pending` guard below stops a double submit.
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || pending) return;
        onAdd(trimmed);
        setName('');
    };

    return (
        <form className={styles.addRow} onSubmit={submit}>
            <input
                type="text"
                className={styles.addInput}
                placeholder={placeholder}
                aria-label={`${label} name`}
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className={styles.addBtn} disabled={pending}>
                <Plus size={14} aria-hidden />
                {label}
            </button>
        </form>
    );
}
