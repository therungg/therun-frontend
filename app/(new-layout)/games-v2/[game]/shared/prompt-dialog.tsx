'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { BoardDialog } from './board-dialog';
import styles from './prompt-dialog.module.scss';

type SubmitVariant = 'primary' | 'danger';

const VARIANT_CLASS: Record<SubmitVariant, string> = {
    primary: 'btn-primary',
    danger: styles.btnDanger,
};

interface PromptDialogProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (value: string) => void;
    labelledBy: string;
    title: string;
    blurb?: ReactNode;
    fieldLabel: string;
    placeholder?: string;
    /** What the field holds when the dialog opens — a rename starts from the
     *  current name, a create from nothing. Default empty. */
    initialValue?: string;
    /** Textarea instead of a single-line input. Default false. */
    multiline?: boolean;
    /**
     * Minimum trimmed length required to submit. 0 (the default) means the
     * field is optional — matches the native prompt's "OK on empty" behavior
     * for call sites where the API accepts an empty/omitted value.
     */
    minLength?: number;
    /**
     * Extra gate beyond `minLength` — e.g. requiring the typed value to
     * match some other string exactly (case-insensitively) before the
     * submit button enables, rather than just meeting a length floor.
     * Checked against the trimmed value. Omit for the plain length check.
     */
    isValid?: (trimmed: string) => boolean;
    /**
     * Message shown instead of the length-based "is required" hint when the
     * value is long enough but fails `isValid`. Ignored without `isValid`.
     */
    invalidHint?: string;
    submitLabel: string;
    submitVariant?: SubmitVariant;
    pending: boolean;
    /** Server-side error from the last submit attempt, if any. */
    error?: string | null;
}

/**
 * Shared single-field prompt dialog — text input or textarea with inline
 * validation + Cancel/submit, on the BoardDialog primitive. Replaces the
 * browser's native prompt dialog across the console.
 */
export function PromptDialog({
    open,
    onClose,
    onSubmit,
    labelledBy,
    title,
    blurb,
    fieldLabel,
    placeholder,
    initialValue = '',
    multiline = false,
    minLength = 0,
    isValid,
    invalidHint,
    submitLabel,
    submitVariant = 'primary',
    pending,
    error = null,
}: PromptDialogProps) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const initialFocusRef = multiline ? textareaRef : inputRef;
    const fieldId = `${labelledBy}-field`;

    // Every open starts from the initial value — mirrors the native prompt,
    // and this component instance can be reused across multiple opens.
    useEffect(() => {
        if (open) setValue(initialValue);
    }, [open, initialValue]);

    const trimmed = value.trim();
    const meetsLength = minLength <= 0 || trimmed.length >= minLength;
    const valid = meetsLength && (!isValid || isValid(trimmed));

    const requestClose = () => {
        if (!pending) onClose();
    };

    const submit = () => {
        if (!valid || pending) return;
        onSubmit(trimmed);
    };

    return (
        <BoardDialog
            open={open}
            onClose={requestClose}
            labelledBy={labelledBy}
            size="sm"
            initialFocusRef={initialFocusRef}
            closeOnBackdropClick={!pending}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id={labelledBy}>
                    {title}
                </h5>
            </div>
            <div className={styles.body}>
                {blurb && <p className={styles.blurb}>{blurb}</p>}
                <label htmlFor={fieldId} className={styles.fieldLabel}>
                    {fieldLabel}
                </label>
                {multiline ? (
                    <textarea
                        id={fieldId}
                        ref={textareaRef}
                        className={styles.textarea}
                        rows={3}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        disabled={pending}
                    />
                ) : (
                    <input
                        id={fieldId}
                        ref={inputRef}
                        type="text"
                        className={styles.input}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') submit();
                        }}
                        placeholder={placeholder}
                        disabled={pending}
                    />
                )}
                {minLength > 0 && !meetsLength && value.length > 0 && (
                    <div className={styles.fieldError}>
                        {fieldLabel} is required.
                    </div>
                )}
                {meetsLength && !valid && invalidHint && value.length > 0 && (
                    <div className={styles.fieldError}>{invalidHint}</div>
                )}
                {error && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={requestClose}
                    disabled={pending}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${VARIANT_CLASS[submitVariant]}`}
                    onClick={submit}
                    disabled={pending || !valid}
                >
                    {pending ? 'Working…' : submitLabel}
                </button>
            </div>
        </BoardDialog>
    );
}
