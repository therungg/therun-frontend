'use client';

import type { ReactNode } from 'react';
import styles from './tournament-form.module.scss';

export function FormSection({
    icon,
    title,
    description,
    children,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className={styles.section}>
            <header className={styles.sectionHeader}>
                <div className={styles.sectionIcon} aria-hidden="true">
                    {icon}
                </div>
                <div className={styles.sectionMeta}>
                    <h2 className={styles.sectionTitle}>{title}</h2>
                    <p className={styles.sectionDescription}>{description}</p>
                </div>
            </header>
            {children}
        </section>
    );
}

export function FieldGrid({
    children,
    full,
}: {
    children: ReactNode;
    full?: boolean;
}) {
    return (
        <div
            className={
                full
                    ? `${styles.fieldGrid} ${styles.fieldGridFull}`
                    : styles.fieldGrid
            }
        >
            {children}
        </div>
    );
}

export function FieldFull({ children }: { children: ReactNode }) {
    return <div className={styles.fieldGridFull}>{children}</div>;
}

export function Field({
    label,
    required,
    optional,
    help,
    children,
}: {
    label: string;
    required?: boolean;
    optional?: boolean;
    help?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className={styles.field}>
            <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
                {optional && (
                    <span className={styles.optionalTag}>Optional</span>
                )}
            </div>
            {children}
            {help && <p className={styles.fieldHelp}>{help}</p>}
        </div>
    );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={styles.input} />;
}

export function NumberInput(
    props: React.InputHTMLAttributes<HTMLInputElement>,
) {
    return <input type="number" {...props} className={styles.input} />;
}

export function TextArea(
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
    return <textarea {...props} className={styles.textarea} />;
}

export function ToggleCard({
    checked,
    onChange,
    title,
    description,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    title: string;
    description: string;
}) {
    const cls = `${styles.toggleCard} ${
        checked ? styles.toggleCardActive : ''
    }`;
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            className={cls}
            onClick={() => onChange(!checked)}
        >
            <span
                className={`${styles.toggleSwitch} ${
                    checked ? styles.toggleSwitchOn : ''
                }`}
                aria-hidden="true"
            />
            <span className={styles.toggleBody}>
                <span className={styles.toggleTitle}>{title}</span>
                <span className={styles.toggleDescription}>{description}</span>
            </span>
        </button>
    );
}

export { styles as formStyles };
