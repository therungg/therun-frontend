'use client';

import { type ReactNode, useId } from 'react';
import { Check2, Dot, QuestionCircle } from 'react-bootstrap-icons';
import styles from './form-kit.module.scss';

/** Same doneness vocabulary as the wizard's category hub: a check when the
 * section's content is in place, a warning dot when it's genuinely missing.
 * Sections where nothing can be "missing" pass neither. */
export type SectionStatus = 'done' | 'attention';

/** An explanation behind a hover/focus bubble, so a section can be a title and
 *  its controls rather than a title, its controls and a paragraph. The bubble
 *  stays in the DOM (opacity, not display) so aria-describedby keeps working. */
export function HintBubble({
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

export function FormSection({
    title,
    titleHint,
    lede,
    actions,
    status,
    children,
}: {
    title: string;
    /** An explanation for the whole section, behind the title's hover bubble. */
    titleHint?: ReactNode;
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
            {titleHint && <HintBubble label={title}>{titleHint}</HintBubble>}
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
    labelHidden = false,
    hint,
    value,
    options,
    onChange,
    disabled = false,
}: {
    label: string;
    /** Keep the label for screen readers when a section title already says it. */
    labelHidden?: boolean;
    /** An explanation behind a hover bubble beside the label. */
    hint?: ReactNode;
    value: string;
    options: Array<{ value: string; label: string; disabled?: boolean }>;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    const labelId = useId();
    return (
        <div className={styles.segGroup}>
            <span
                id={labelId}
                className={labelHidden ? 'visually-hidden' : styles.segLabel}
            >
                {label}
                {hint && <HintBubble label={label}>{hint}</HintBubble>}
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
                        disabled={disabled || opt.disabled}
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

/** Draft value for the players-range editor. `null` on either side reads as
 *  "unset" — blank inputs, not a rendered 1 or infinity symbol. */
export interface PlayersRangeDraft {
    min: number | null;
    max: number | null;
}

/**
 * Plain-language summary of what a players policy actually does, for the
 * line above the fields — the two numbers alone don't say "how many runners
 * can share a run" on their own.
 */
export function describePlayersRange(value: PlayersRangeDraft | null): string {
    const min = value?.min ?? 1;
    const max = value?.max ?? null;
    if (min <= 1 && max === null) {
        return 'No limit — any number of runners can share a run.';
    }
    if (max !== null && min === max) {
        return `Exactly ${min} runner${min === 1 ? '' : 's'} per run.`;
    }
    if (max === null) {
        return `At least ${min} runner${min === 1 ? '' : 's'} per run.`;
    }
    if (min <= 1) {
        return `Up to ${max} runners per run.`;
    }
    return `Between ${min} and ${max} runners per run.`;
}

/**
 * Two small integer inputs — minimum and optional maximum runners — shared
 * by the category and subcategory players-policy editors so there is one
 * renderer for this control, not two. Commit strategy is the caller's: pass
 * `onCommit` for a per-field instant write (the subcategory dialog's
 * pattern), or leave it out and drive a Save button off `onChange` alone
 * (the category Standards pattern).
 */
export function PlayersRangeFields({
    idPrefix,
    value,
    onChange,
    onCommit,
    disabled = false,
}: {
    idPrefix: string;
    value: PlayersRangeDraft;
    onChange: (next: PlayersRangeDraft) => void;
    onCommit?: (next: PlayersRangeDraft) => void;
    disabled?: boolean;
}) {
    return (
        <div className={styles.playersRange}>
            <div className={styles.playersField}>
                <label
                    htmlFor={`${idPrefix}-min`}
                    className="form-label small mb-1"
                >
                    Minimum runners
                </label>
                <input
                    id={`${idPrefix}-min`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className={`form-control form-control-sm ${styles.playersInput}`}
                    placeholder="1"
                    value={value.min ?? ''}
                    disabled={disabled}
                    onChange={(e) => {
                        const raw = e.target.value;
                        onChange({
                            ...value,
                            min: raw === '' ? null : Number(raw),
                        });
                    }}
                    onBlur={() => onCommit?.(value)}
                />
            </div>
            <div className={styles.playersField}>
                <label
                    htmlFor={`${idPrefix}-max`}
                    className="form-label small mb-1"
                >
                    Maximum runners
                </label>
                <input
                    id={`${idPrefix}-max`}
                    type="number"
                    inputMode="numeric"
                    min={value.min ?? 1}
                    step={1}
                    className={`form-control form-control-sm ${styles.playersInput}`}
                    placeholder="No limit"
                    value={value.max ?? ''}
                    disabled={disabled}
                    onChange={(e) => {
                        const raw = e.target.value;
                        onChange({
                            ...value,
                            max: raw === '' ? null : Number(raw),
                        });
                    }}
                    onBlur={() => onCommit?.(value)}
                />
            </div>
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
