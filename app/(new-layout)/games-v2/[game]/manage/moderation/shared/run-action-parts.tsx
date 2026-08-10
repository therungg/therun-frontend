'use client';

import { useId } from 'react';
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
