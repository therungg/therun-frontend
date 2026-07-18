// Shared, server-safe badge/line renderers used by both the public run view
// (run-view.tsx) and the mod action card (manage/run/[runId]/run-card.tsx).
// Kept prop-plain (no RunDetail/RunViewModel dependency) so either side can
// import without pulling in the other's types.

import { CheckCircleFill, HourglassSplit } from 'react-bootstrap-icons';
import { formatVariableList, type LabelVariableDef } from '../labels';
import styles from './run-badges.module.scss';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

/**
 * Several backend rows (LeaderboardRosterRow, UserEligibleRunRow) type
 * `verificationStatus` as a loose `string`, not the real 3-value union — so
 * callers feeding VerificationBadge need to normalize first. Unknown/missing
 * values fall back to 'pending' rather than silently rendering nothing.
 */
export function normalizeVerificationStatus(
    status: string | null | undefined,
): VerificationStatus {
    if (status === 'verified' || status === 'rejected') return status;
    return 'pending';
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
    if (status === 'verified') {
        return (
            <span className={styles.verified} aria-label="verified">
                <CheckCircleFill size={11} aria-hidden /> Verified
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className={styles.pending} aria-label="pending">
                <HourglassSplit size={11} aria-hidden /> Pending
            </span>
        );
    }
    return (
        <span className={styles.rejected} aria-label="rejected">
            Rejected
        </span>
    );
}

export function VariablesLine({
    variables,
    defs,
}: {
    variables: Record<string, string>;
    defs?: LabelVariableDef[];
}) {
    const text = formatVariableList(variables, defs);
    if (!text) return null;
    return (
        <div
            className={`text-muted small text-truncate ${styles.variablesLine}`}
            title={text}
        >
            {text}
        </div>
    );
}
