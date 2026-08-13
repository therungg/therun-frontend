'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatDurationFull, parseDurationText } from '~src/lib/duration';
import styles from './duration-field.module.scss';
import {
    applyBackspace,
    applyDecimal,
    applyDigit,
    draftToMs,
    draftToText,
    msToDraft,
    nudge,
} from './keystrokes';

interface Props {
    /** Milliseconds, or null for empty. Never a string — callers hold a number. */
    value: number | null;
    onChange: (ms: number | null) => void;
    /** `lg` for a dialog where the time is the subject; `sm` for a table cell. */
    size?: 'lg' | 'sm';
    id?: string;
    /** Rendered above the field. Without one, pass `aria-label`. */
    label?: string;
    'aria-label'?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    /**
     * Shown while empty. Defaults to the `0:00.000` scaffold; a cell whose
     * empty state means "inherits" passes the inherited value instead.
     */
    placeholder?: string;
    /** Enter submits the surrounding row/dialog. */
    onEnter?: () => void;
    /**
     * Fired on blur with the settled value — for cells that save when the
     * user leaves them rather than on every keystroke.
     */
    onCommit?: (ms: number | null) => void;
    /** For dialogs that focus this field on open (`initialFocusRef`). */
    inputRef?: React.RefObject<HTMLInputElement | null>;
    className?: string;
}

const SECOND = 1_000;
const MINUTE = 60_000;

/**
 * A run time, typed like a timer.
 *
 * Digits fill from the right and the field draws its own colons, so nothing
 * invalid can be entered and there is no error state to show. What the user
 * typed and what it parses as are shown separately: the field keeps the
 * digits where they were typed (`0:95` stays `0:95` under the cursor) and the
 * readout underneath says what that means, until blur settles the field to
 * the canonical form.
 *
 * Input is read from the `input` event rather than `keydown` because that is
 * the one path every soft keyboard and IME agrees on; the caret is pinned to
 * the end, so the difference is always at the right edge.
 */
export function DurationField({
    value,
    onChange,
    size = 'lg',
    id,
    label,
    'aria-label': ariaLabel,
    disabled,
    autoFocus,
    placeholder = '0:00.000',
    onEnter,
    onCommit,
    inputRef: externalRef,
    className,
}: Props) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const readoutId = `${inputId}-readout`;
    const inputRef = useRef<HTMLInputElement>(null);

    // Both refs point at the same input: the component needs it to pin the
    // caret, a dialog needs it to focus the field on open.
    const setInputRef = (el: HTMLInputElement | null) => {
        inputRef.current = el;
        if (externalRef) externalRef.current = el;
    };

    const [draft, setDraft] = useState(() => msToDraft(value));
    const [focused, setFocused] = useState(false);

    // The draft owns the value while the user is in the field — re-seeding
    // mid-typing would rearrange digits under the cursor. Outside of that, an
    // externally-changed value wins (a dialog reopening on a different row).
    useEffect(() => {
        if (!focused) setDraft(msToDraft(value));
    }, [value, focused]);

    const text = draftToText(draft);
    const ms = draftToMs(draft);

    const commit = (next: ReturnType<typeof msToDraft>) => {
        setDraft(next);
        const nextMs = draftToMs(next);
        if (nextMs !== ms) onChange(nextMs);
    };

    const caretToEnd = () => {
        const el = inputRef.current;
        if (!el) return;
        const end = el.value.length;
        el.setSelectionRange(end, end);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const typed = e.target.value;
        if (typed.length > text.length) {
            const ch = typed.slice(-1);
            if (ch >= '0' && ch <= '9') commit(applyDigit(draft, ch));
            else if (ch === '.' || ch === ',') commit(applyDecimal(draft));
            else setDraft({ ...draft }); // reject anything else
        } else if (typed.length < text.length) {
            commit(applyBackspace(draft));
        }
        requestAnimationFrame(caretToEnd);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
            return;
        }
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const step = e.shiftKey ? MINUTE : SECOND;
        commit(nudge(draft, e.key === 'ArrowUp' ? step : -step));
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = parseDurationText(e.clipboardData.getData('text'));
        if (pasted === undefined) return;
        commit(msToDraft(pasted));
    };

    const handleBlur = () => {
        setFocused(false);
        // Segments settle on the way out: 0:95 becomes 1:35.
        setDraft(msToDraft(ms));
        onCommit?.(ms);
    };

    const showReadout = size === 'lg' || focused;

    return (
        <div className={`${styles.wrap} ${className ?? ''}`}>
            {label && (
                <label htmlFor={inputId} className="form-label">
                    {label}
                </label>
            )}
            <input
                ref={setInputRef}
                id={inputId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className={`${styles.input} ${styles[size]}`}
                placeholder={placeholder}
                value={text}
                aria-label={ariaLabel}
                aria-describedby={readoutId}
                disabled={disabled}
                autoFocus={autoFocus}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => {
                    setFocused(true);
                    caretToEnd();
                }}
                onBlur={handleBlur}
                onClick={caretToEnd}
            />
            <p
                id={readoutId}
                className={[
                    styles.readout,
                    size === 'lg' ? styles.readoutLg : styles.readoutSm,
                    showReadout && size === 'sm' ? styles.readoutSmVisible : '',
                    ms === null ? styles.empty : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {ms === null ? '—' : `= ${formatDurationFull(ms)}`}
            </p>
        </div>
    );
}
