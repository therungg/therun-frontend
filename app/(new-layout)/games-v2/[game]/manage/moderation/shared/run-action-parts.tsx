'use client';

import type { RefObject } from 'react';
import { useId } from 'react';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { UserEligibleRunRow } from '../../../../../../types/moderation.types';
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
 * Segmented cards standing in for scope radios (remove run/runner, ban
 * category/game): one card per option, title + optional detail line,
 * radiogroup semantics so arrow-key users aren't worse off than before.
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
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={opt.value === value}
                        disabled={disabled}
                        className={
                            opt.value === value
                                ? `${styles.scopeCard} ${styles.scopeCardActive}`
                                : styles.scopeCard
                        }
                        onClick={() => onChange(opt.value)}
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
                    disabled={disabled}
                    className={
                        value == null
                            ? `${styles.cutoffRow} ${styles.cutoffNone} ${styles.cutoffRowActive}`
                            : `${styles.cutoffRow} ${styles.cutoffNone}`
                    }
                    onClick={() => onChange(null)}
                >
                    None — just remove this one
                </button>
                <div className={styles.cutoffScroll}>
                    {runs.map((r) => (
                        <button
                            key={r.runId}
                            type="button"
                            role="radio"
                            aria-checked={value === r.runId}
                            disabled={disabled}
                            className={
                                value === r.runId
                                    ? `${styles.cutoffRow} ${styles.cutoffRowActive}`
                                    : styles.cutoffRow
                            }
                            onClick={() => onChange(r.runId)}
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
    const shortfall = minLength - reason.trim().length;
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
            />
            <div className={styles.reasonHint}>
                {required
                    ? `Required — min ${minLength} characters. Audit-logged.`
                    : 'Optional. Audit-logged.'}
            </div>
            {required && shortfall > 0 && reason.length > 0 && (
                <div className={styles.reasonError}>
                    {shortfall} more needed.
                </div>
            )}
        </div>
    );
}
