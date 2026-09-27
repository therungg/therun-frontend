'use client';

import type { WorklistEntry } from '../../../../../../types/worklist.types';
import {
    checkSentences,
    REASON_LABEL,
    reasonLine,
    reasonTone,
} from '../../manage/moderation/worklist/worklist-model';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

export const MOD_SPLITS_ID = 'mod-splits';

function scrollToSplits() {
    document
        .getElementById(MOD_SPLITS_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * The band above the run that says why it is on the queue: the queue's own
 * reason and line, the other reasons as chips. Only the queue knows why a run
 * is there, so opened from anywhere else there is no band.
 */
export function WhyHere({
    model,
    entry,
}: {
    model: RunViewModel;
    entry: WorklistEntry | null;
}) {
    if (!entry) return null;
    const tone = reasonTone(entry.reason);
    const failed = entry.reason === 'auto_verify_failed';
    const checks = failed ? checkSentences(entry.failedChecks) : [];
    const label = REASON_LABEL[entry.reason];
    const line = reasonLine(entry);
    const chips = [
        ...entry.otherReasons.map((r) => REASON_LABEL[r]),
        ...checks.slice(1),
        ...(entry.newRunner ? ['New runner'] : []),
    ];
    const showSplits =
        failed &&
        entry.failedChecks.includes('gold-beat') &&
        model.splits.length > 0;

    return (
        <div
            className={`${styles.why} ${tone === 'red' ? styles.whyHigh : ''} ${tone === 'quiet' ? styles.whyQuiet : ''}`}
        >
            <div className={styles.whyRow}>
                <span
                    className={`${styles.whyLabel} ${tone === 'red' ? styles.whyLabelHigh : ''} ${tone === 'quiet' ? styles.whyLabelQuiet : ''}`}
                >
                    {label}
                </span>
                <span className={styles.whyText}>
                    {line === label ? null : line}
                </span>
                {showSplits ? (
                    <button
                        type="button"
                        className={styles.linkButton}
                        onClick={scrollToSplits}
                    >
                        Show
                    </button>
                ) : (
                    <span />
                )}
            </div>
            {chips.length > 0 ? (
                <div className={styles.whyChips}>
                    {chips.map((c) => (
                        <span key={c} className={styles.whyChip}>
                            {c}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
