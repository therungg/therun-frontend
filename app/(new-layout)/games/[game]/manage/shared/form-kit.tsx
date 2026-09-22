'use client';

import { type ReactNode, useId } from 'react';
import { Check2, Dot, QuestionCircle } from 'react-bootstrap-icons';
import {
    isDefaultPlayersRange,
    playersRangeError,
} from '~src/lib/setup/game-minimum';
import type { PlayersRange } from '../../../../../../types/leaderboards.types';
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

/** Blank fields: what no stored row reads as, and what a cleared editor
 *  leaves behind. Never written as a row of its own — see
 *  `isDefaultPlayersRange`. */
export const DEFAULT_PLAYERS_DRAFT: PlayersRangeDraft = {
    min: null,
    max: null,
};

export function samePlayersDraft(
    a: PlayersRangeDraft,
    b: PlayersRangeDraft,
): boolean {
    return a.min === b.min && a.max === b.max;
}

/**
 * What a draft writes: a range, or `null` to clear the row at this scope.
 * The permissive default collapses to `null` here as well as server-side, so
 * a moderator who blanks the fields ends up with no row rather than one that
 * says nothing.
 */
export function playersDraftValue(
    draft: PlayersRangeDraft,
): PlayersRange | null {
    return isDefaultPlayersRange(draft)
        ? null
        : { min: draft.min ?? 1, max: draft.max };
}

/**
 * What `PolicyPreview` should dry-run for a draft, in its own three-state
 * vocabulary: `undefined` for nothing to preview, `null` for a delete, a
 * range for a write.
 *
 * `storedDefault` is the one case a clean draft still has something to
 * preview — a row IS stored and it carries the default, so the only move
 * left is removing it.
 */
export function playersPreviewValue(
    draft: PlayersRangeDraft,
    { dirty, storedDefault }: { dirty: boolean; storedDefault: boolean },
): PlayersRange | null | undefined {
    if (dirty) {
        if (playersRangeError(draft)) return undefined;
        return playersDraftValue(draft);
    }
    return storedDefault ? null : undefined;
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
 * by every players-policy editor so there is one renderer for this control,
 * not several. Purely `onChange`-driven: every caller drives its own
 * explicit Save button off the draft this produces, rather than committing
 * on blur — a save the caller can't see coming (and Escape can't undo) is
 * worse than one extra click.
 *
 * `compact` is the same control on one line: a settings row already has a
 * label of its own and a note beside it, so the captions come off and the
 * boxes narrow to the width of a runner count.
 */
export function PlayersRangeFields({
    idPrefix,
    value,
    onChange,
    disabled = false,
    autoFocus = false,
    compact = false,
}: {
    idPrefix: string;
    value: PlayersRangeDraft;
    onChange: (next: PlayersRangeDraft) => void;
    disabled?: boolean;
    /** For a dialog that exists to type in — landing anywhere else costs a
     *  tab. Off for the fields sitting inside a longer form. */
    autoFocus?: boolean;
    /** For a row that reads label, control, note — the captions become
     *  labels for a screen reader only. */
    compact?: boolean;
}) {
    return (
        <div
            className={
                compact
                    ? `${styles.playersRange} ${styles.playersRangeCompact}`
                    : styles.playersRange
            }
        >
            <div className={styles.playersField}>
                {compact ? null : (
                    <label
                        htmlFor={`${idPrefix}-min`}
                        className="form-label small mb-1"
                    >
                        Minimum runners
                    </label>
                )}
                <input
                    id={`${idPrefix}-min`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    className={`form-control form-control-sm ${styles.playersInput}`}
                    placeholder="1"
                    aria-label={compact ? 'Minimum runners' : undefined}
                    value={value.min ?? ''}
                    disabled={disabled}
                    autoFocus={autoFocus}
                    onChange={(e) => {
                        const raw = e.target.value;
                        onChange({
                            ...value,
                            min: raw === '' ? null : Number(raw),
                        });
                    }}
                />
            </div>
            <div className={styles.playersField}>
                {compact ? null : (
                    <label
                        htmlFor={`${idPrefix}-max`}
                        className="form-label small mb-1"
                    >
                        Maximum runners
                    </label>
                )}
                <input
                    id={`${idPrefix}-max`}
                    type="number"
                    inputMode="numeric"
                    min={value.min ?? 1}
                    step={1}
                    className={`form-control form-control-sm ${styles.playersInput}`}
                    placeholder={compact ? 'Any' : 'No limit'}
                    aria-label={compact ? 'Maximum runners' : undefined}
                    value={value.max ?? ''}
                    disabled={disabled}
                    onChange={(e) => {
                        const raw = e.target.value;
                        onChange({
                            ...value,
                            max: raw === '' ? null : Number(raw),
                        });
                    }}
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
