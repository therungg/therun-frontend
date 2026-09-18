'use client';

import { type ReactNode, useId } from 'react';
import { QuestionCircle } from 'react-bootstrap-icons';
import styles from './setup.module.scss';

// Field explanations live behind a hover/focus bubble instead of permanent
// helper copy — the form stays scannable, the "what does this even do?"
// answer is one hover away. The bubble stays in the DOM (opacity, not
// display) so aria-describedby keeps working for screen readers.
export function FieldHint({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    const id = useId();

    return (
        <span className={styles.hint}>
            <button
                type="button"
                className={styles.hintTrigger}
                aria-label={`What is ${label}?`}
                aria-describedby={id}
            >
                <QuestionCircle size={13} aria-hidden />
            </button>
            <span id={id} role="tooltip" className={styles.hintBubble}>
                {children}
            </span>
        </span>
    );
}

// A form label with its explanation attached. `htmlFor` is optional because
// some groups (Links) label a set of controls rather than one input.
export function FieldLabel({
    htmlFor,
    label,
    hint,
    className = '',
}: {
    htmlFor?: string;
    label: string;
    hint: ReactNode;
    className?: string;
}) {
    return (
        <div className={`${styles.fieldLabel} ${className}`}>
            <label className="form-label mb-0" htmlFor={htmlFor}>
                {label}
            </label>
            <FieldHint label={label}>{hint}</FieldHint>
        </div>
    );
}
