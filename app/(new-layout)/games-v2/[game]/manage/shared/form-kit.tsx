'use client';

import { type ReactNode, useId } from 'react';
import styles from './form-kit.module.scss';

export function FormSection({
    title,
    lede,
    children,
}: {
    title: string;
    lede?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{title}</h3>
            {lede && <p className={styles.sectionLede}>{lede}</p>}
            {children}
        </section>
    );
}

export function SegmentedControl({
    label,
    value,
    options,
    onChange,
    disabled = false,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    const labelId = useId();
    return (
        <div className={styles.segGroup}>
            <span id={labelId} className={styles.segLabel}>
                {label}
            </span>
            <div
                className={styles.segmented}
                role="radiogroup"
                aria-labelledby={labelId}
            >
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={opt.value === value}
                        disabled={disabled}
                        className={
                            opt.value === value
                                ? `${styles.segment} ${styles.segmentActive}`
                                : styles.segment
                        }
                        onClick={() => onChange(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function SwitchField({
    id,
    label,
    hint,
    checked,
    onChange,
    disabled = false,
}: {
    id: string;
    label: string;
    hint?: ReactNode;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className={styles.switchRow}>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                className={styles.switch}
                onClick={() => onChange(!checked)}
            />
            <label htmlFor={id} className={styles.switchLabel}>
                {label}
                {hint && <span className={styles.switchHint}>{hint}</span>}
            </label>
        </div>
    );
}

export function SectionFooter({ children }: { children: ReactNode }) {
    return <div className={styles.footer}>{children}</div>;
}

export function InlineError({ children }: { children: ReactNode }) {
    if (!children) return null;
    return (
        <div role="alert" className={styles.error}>
            {children}
        </div>
    );
}
