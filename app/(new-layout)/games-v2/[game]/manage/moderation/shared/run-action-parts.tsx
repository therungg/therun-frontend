'use client';

import type { KeyboardEvent, RefObject } from 'react';
import { useId } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserEligibleRunRow } from '../../../../../../../types/moderation.types';
import {
    REMOVE_REASONS,
    type RemoveReason,
    removeReasonMeta,
} from './action-model';
import styles from './run-action-dialog.module.scss';

export interface ScopeCardOption<V extends string> {
    value: V;
    title: string;
    detail?: string;
}

/**
 * Roving-tabindex helper for a radiogroup laid out as a flat array of
 * options: the selected option (or the first, when none is selected) is
 * the sole tab stop; ArrowDown/ArrowRight and ArrowUp/ArrowLeft move both
 * focus and selection to the next/previous option, wrapping at the ends —
 * matching native radio-button behavior (selection follows focus).
 */
function rovingRadioKeyDown<V>(
    e: KeyboardEvent<HTMLButtonElement>,
    values: readonly V[],
    currentIndex: number,
    onChange: (v: V) => void,
) {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % values.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + values.length) % values.length;
    }
    if (nextIndex == null) return;
    e.preventDefault();
    onChange(values[nextIndex]);
    const group = e.currentTarget.closest('[role="radiogroup"]');
    const target =
        group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex];
    target?.focus();
}

/**
 * Segmented cards standing in for scope radios (remove run/runner, ban
 * category/game): one card per option, title + optional detail line,
 * full radiogroup semantics — roving tabindex (selected option is the only
 * tab stop) plus arrow-key navigation that moves selection with focus.
 */
export function ScopeCards<V extends string>({
    label,
    options,
    value,
    onChange,
    disabled = false,
}: {
    label: string;
    options: ScopeCardOption<V>[];
    value: V;
    onChange: (v: V) => void;
    disabled?: boolean;
}) {
    const labelId = useId();
    const values = options.map((opt) => opt.value);
    const selectedIndex = Math.max(
        0,
        values.findIndex((v) => v === value),
    );
    return (
        <div className={styles.zone}>
            <span id={labelId} className={styles.fieldLabel}>
                {label}
            </span>
            <div
                className={styles.scopeCards}
                role="radiogroup"
                aria-labelledby={labelId}
            >
                {options.map((opt, i) => (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={opt.value === value}
                        tabIndex={i === selectedIndex ? 0 : -1}
                        disabled={disabled}
                        className={
                            opt.value === value
                                ? `${styles.scopeCard} ${styles.scopeCardActive}`
                                : styles.scopeCard
                        }
                        onClick={() => onChange(opt.value)}
                        onKeyDown={(e) =>
                            rovingRadioKeyDown(e, values, i, onChange)
                        }
                    >
                        <span className={styles.scopeCardTitle}>
                            {opt.title}
                        </span>
                        {opt.detail && (
                            <span className={styles.scopeCardDetail}>
                                {opt.detail}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** One-line "N runs affected across M leaderboards." summary. */
export function AffectedSummary({
    runCount,
    leaderboardCount,
}: {
    runCount: number;
    leaderboardCount: number;
}) {
    return (
        <p className={styles.previewSummary}>
            <strong>{runCount}</strong> run{runCount === 1 ? '' : 's'} affected
            across <strong>{leaderboardCount}</strong> leaderboard
            {leaderboardCount === 1 ? '' : 's'}.
        </p>
    );
}

/**
 * "Fastest time you've verified as legit" — a pinned None row plus a
 * bounded, scrollable list of the runner's other times (fastest first).
 * Rows behave as radios but render as table rows: mono time left, muted
 * status tag right. Bounded height keeps a 50-run runner from turning the
 * dialog into a scroll marathon (the reason this redesign exists).
 */
export function CutoffPicker({
    runs,
    timing,
    value,
    onChange,
    fasterCount,
    disabled = false,
}: {
    runs: UserEligibleRunRow[];
    timing: 'rt' | 'gt';
    value: number | null;
    onChange: (runId: number | null) => void;
    fasterCount: number;
    disabled?: boolean;
}) {
    const labelId = useId();
    // Option order matches render order: None first, then runs.
    const values: (number | null)[] = [null, ...runs.map((r) => r.runId)];
    const selectedIndex = Math.max(
        0,
        values.findIndex((v) => v === value),
    );
    return (
        <div className={styles.zone}>
            <span id={labelId} className={styles.fieldLabel}>
                Fastest time you&apos;ve verified as legit
            </span>
            <div
                className={styles.cutoff}
                role="radiogroup"
                aria-labelledby={labelId}
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={value == null}
                    tabIndex={selectedIndex === 0 ? 0 : -1}
                    disabled={disabled}
                    className={
                        value == null
                            ? `${styles.cutoffRow} ${styles.cutoffNone} ${styles.cutoffRowActive}`
                            : `${styles.cutoffRow} ${styles.cutoffNone}`
                    }
                    onClick={() => onChange(null)}
                    onKeyDown={(e) =>
                        rovingRadioKeyDown(e, values, 0, onChange)
                    }
                >
                    None — just remove this one
                </button>
                <div className={styles.cutoffScroll}>
                    {runs.map((r, i) => (
                        <button
                            key={r.runId}
                            type="button"
                            role="radio"
                            aria-checked={value === r.runId}
                            tabIndex={i + 1 === selectedIndex ? 0 : -1}
                            disabled={disabled}
                            className={
                                value === r.runId
                                    ? `${styles.cutoffRow} ${styles.cutoffRowActive}`
                                    : styles.cutoffRow
                            }
                            onClick={() => onChange(r.runId)}
                            onKeyDown={(e) =>
                                rovingRadioKeyDown(e, values, i + 1, onChange)
                            }
                        >
                            <span className={styles.cutoffTime}>
                                <DurationToFormatted
                                    duration={
                                        (timing === 'gt'
                                            ? r.gameTime
                                            : r.time) ?? 0
                                    }
                                />
                            </span>
                            <span className={styles.cutoffStatus}>
                                {r.verificationStatus}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            {fasterCount > 0 && (
                <p className={styles.cutoffConsequence}>
                    {fasterCount} faster run
                    {fasterCount === 1 ? ' goes' : 's go'} with it — a board
                    always shows a runner&apos;s best eligible run, so leaving a
                    faster one behind would just promote it.
                </p>
            )}
        </div>
    );
}

/**
 * The paperwork zone: optional reason-category select + notify switch on
 * one row (Remove only), then the audit-logged free-text field with its
 * requirements as muted helper text instead of a shouted label.
 */
export function ReasonZone({
    category,
    reason,
    onReasonChange,
    required,
    minLength,
    fieldRef,
    disabled = false,
}: {
    category?: {
        value: RemoveReason;
        onChange: (v: RemoveReason) => void;
        notify: boolean | null;
        onNotifyChange: (v: boolean) => void;
    };
    reason: string;
    onReasonChange: (v: string) => void;
    required: boolean;
    minLength: number;
    fieldRef?: RefObject<HTMLTextAreaElement | null>;
    disabled?: boolean;
}) {
    const selectId = useId();
    const notifyId = useId();
    const textId = useId();
    const hintId = useId();
    const errorId = useId();
    const shortfall = minLength - reason.trim().length;
    const showError = required && shortfall > 0 && reason.length > 0;
    return (
        <div className={styles.zone}>
            {category && (
                <>
                    <label htmlFor={selectId} className={styles.fieldLabel}>
                        Why are you removing this?
                    </label>
                    <div className={styles.reasonRow}>
                        <select
                            id={selectId}
                            className="form-select form-select-sm"
                            value={category.value}
                            onChange={(e) =>
                                category.onChange(
                                    e.target.value as RemoveReason,
                                )
                            }
                            disabled={disabled}
                        >
                            {REMOVE_REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                        {category.notify != null && (
                            <div className="form-check form-switch mb-0">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id={notifyId}
                                    checked={category.notify}
                                    onChange={(e) =>
                                        category.onNotifyChange(
                                            e.target.checked,
                                        )
                                    }
                                    disabled={disabled}
                                />
                                <label
                                    className="form-check-label small text-nowrap"
                                    htmlFor={notifyId}
                                >
                                    Notify the runner and allow an appeal
                                </label>
                            </div>
                        )}
                    </div>
                    <div className={styles.reasonBlurb}>
                        {removeReasonMeta(category.value).blurb}
                    </div>
                </>
            )}
            <label htmlFor={textId} className={styles.fieldLabel}>
                {required ? 'Reason' : 'Note'}
            </label>
            <textarea
                id={textId}
                ref={fieldRef}
                className={styles.reasonTextarea}
                rows={3}
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                disabled={disabled}
                aria-describedby={showError ? `${hintId} ${errorId}` : hintId}
            />
            <div id={hintId} className={styles.reasonHint}>
                {required
                    ? `Required — min ${minLength} characters. Audit-logged.`
                    : 'Optional. Audit-logged.'}
            </div>
            {showError && (
                <div id={errorId} className={styles.reasonError}>
                    {shortfall} more needed.
                </div>
            )}
        </div>
    );
}
