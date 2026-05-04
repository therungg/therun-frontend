'use client';

import { type KeyboardEvent, useState } from 'react';
import styles from './tournament-form.module.scss';

export function UsersListEditor({
    value,
    onChange,
    placeholder,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
}) {
    const [draft, setDraft] = useState('');

    function commit() {
        const trimmed = draft.trim();
        if (!trimmed) return;
        const lower = trimmed.toLowerCase();
        if (value.some((u) => u.toLowerCase() === lower)) {
            setDraft('');
            return;
        }
        onChange([...value, trimmed]);
        setDraft('');
    }

    function onKey(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
        }
    }

    function remove(name: string) {
        onChange(value.filter((u) => u !== name));
    }

    return (
        <div
            className={styles.chipList}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName !== 'INPUT') {
                    target
                        .closest(`.${styles.chipList}`)
                        ?.querySelector('input')
                        ?.focus();
                }
            }}
        >
            {value.map((u) => (
                <span key={u} className={styles.chip}>
                    {u}
                    <button
                        type="button"
                        aria-label={`Remove ${u}`}
                        className={styles.chipRemove}
                        onClick={() => remove(u)}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                className={styles.chipInput}
                value={draft}
                placeholder={
                    value.length ? '' : (placeholder ?? 'Add a username…')
                }
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                onBlur={commit}
            />
        </div>
    );
}
