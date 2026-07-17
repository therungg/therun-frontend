// Shared, server-safe badge/line renderers used by both the public run view
// (run-view.tsx) and the mod action card (manage/run/[runId]/run-card.tsx).
// Kept prop-plain (no RunDetail/RunViewModel dependency) so either side can
// import without pulling in the other's types.

import { CheckCircleFill, HourglassSplit } from 'react-bootstrap-icons';
import { formatVariableList, type LabelVariableDef } from '../labels';
import styles from './run-badges.module.scss';

export function VerificationBadge({
    status,
}: {
    status: 'pending' | 'verified' | 'rejected';
}) {
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
            className="text-muted small text-truncate"
            title={text}
            style={{ maxWidth: '100%' }}
        >
            {text}
        </div>
    );
}
