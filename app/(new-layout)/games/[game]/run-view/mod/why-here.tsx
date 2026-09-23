'use client';

import {
    REVIEW_REASON_LABEL,
    reviewReasonLine,
} from '~src/lib/moderation/run-status-copy';
import type {
    AutoVerifyCheckName,
    AutoVerifyCheckResult,
} from '../../../../../../types/moderation.types';
import type { RunReview } from '../../../../../../types/run-review.types';
import { AUTO_VERIFY_CHECK_LABELS } from '../run-badges';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

type Row = {
    key: string;
    label: string;
    text: string;
    high: boolean;
    showSplits: boolean;
};

export const MOD_SPLITS_ID = 'mod-splits';

/** What a known reason reads when it carries no text of its own. */
const NO_TEXT: Record<string, string> = {
    reported: 'No reason given.',
    appeal: 'No reason given.',
    pending_self_claim: 'Typed in by the runner, no timer data.',
};

function scrollToSplits() {
    document
        .getElementById(MOD_SPLITS_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** The band above the run that says why a moderator is looking at it. */
export function WhyHere({
    model,
    review,
}: {
    model: RunViewModel;
    review: RunReview | null;
}) {
    const failed = (
        Object.entries(model.autoVerifyResult?.checks ?? {}) as Array<
            [AutoVerifyCheckName, AutoVerifyCheckResult]
        >
    ).filter(([, check]) => !check.pass);
    // A failed check also opens a flag named after it; the check's own
    // sentence says more, so the flag row is dropped.
    const checkNames = new Set<string>(
        failed.flatMap(([name, check]) =>
            check.flagReason ? [name, check.flagReason] : [name],
        ),
    );
    const hasSplits = model.splits.length > 0;

    const rows: Row[] = [];
    for (const [i, r] of (review?.reasons ?? []).entries()) {
        if (checkNames.has(r.reason)) continue;
        const head = REVIEW_REASON_LABEL[r.reason];
        rows.push({
            key: `reason-${i}`,
            label: head ?? 'Check failed',
            // The label column already names a known reason; the text is
            // what the reporter or runner wrote.
            text:
                r.text && head
                    ? `“${r.text}”`
                    : (NO_TEXT[r.reason] ?? reviewReasonLine(r)),
            high: r.severity === 'high',
            showSplits: false,
        });
    }
    for (const [name, check] of failed) {
        rows.push({
            key: `check-${name}`,
            label: 'Check failed',
            text: check.reason ?? AUTO_VERIFY_CHECK_LABELS[name] ?? name,
            high: true,
            showSplits: name === 'gold-beat' && hasSplits,
        });
    }
    // A typed-in time waiting in the queue has no review to explain it; say
    // what it is so the band is never empty for it.
    if (
        model.kind === 'manual' &&
        model.verificationStatus === 'pending' &&
        !review?.reasons.some((r) => r.reason === 'pending_self_claim')
    ) {
        rows.unshift({
            key: 'typed-in',
            label: 'Typed-in time',
            text: NO_TEXT.pending_self_claim,
            high: false,
            showSplits: false,
        });
    }
    const record = review?.trackRecord;
    const rank = model.boardContext?.rank;
    if (
        record &&
        record.verifiedRunsThisGame === 0 &&
        record.rejectedRunsThisGame === 0 &&
        rank != null &&
        rank <= 3
    ) {
        rows.push({
            key: 'new-runner',
            label: 'New runner',
            text: `First run on this game, lands at #${rank}.`,
            high: false,
            showSplits: false,
        });
    }

    if (rows.length === 0) return null;
    const high = rows.some((r) => r.high);

    return (
        <div className={`${styles.why} ${high ? styles.whyHigh : ''}`}>
            {rows.map((row) => (
                <div key={row.key} className={styles.whyRow}>
                    <span
                        className={`${styles.whyLabel} ${row.high ? styles.whyLabelHigh : ''}`}
                    >
                        {row.label}
                    </span>
                    <span className={styles.whyText}>{row.text}</span>
                    {row.showSplits ? (
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
            ))}
        </div>
    );
}
