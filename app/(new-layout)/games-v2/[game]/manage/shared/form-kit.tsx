'use client';

import { type ReactNode, useId } from 'react';
import { Check2, Dot } from 'react-bootstrap-icons';
import styles from './form-kit.module.scss';

/** Same doneness vocabulary as the wizard's category hub: a check when the
 * section's content is in place, a warning dot when it's genuinely missing.
 * Sections where nothing can be "missing" pass neither. */
export type SectionStatus = 'done' | 'attention';

export function FormSection({
    title,
    lede,
    actions,
    status,
    children,
}: {
    title: string;
    lede?: ReactNode;
    actions?: ReactNode;
    status?: SectionStatus;
    children: ReactNode;
}) {
    const heading = (
        <h3 className={styles.sectionTitle}>
            {status === 'done' && (
                <Check2 className={styles.statusDone} size={14} aria-hidden />
            )}
            {status === 'attention' && (
                <Dot className={styles.statusAttention} size={14} aria-hidden />
            )}
            {status && (
                <span className="visually-hidden">
                    {status === 'done' ? 'Set up: ' : 'Needs attention: '}
                </span>
            )}
            {title}
        </h3>
    );
    return (
        <section className={styles.section}>
            {actions ? (
                <div className={styles.sectionHead}>
                    {heading}
                    {actions}
                </div>
            ) : (
                heading
            )}
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
