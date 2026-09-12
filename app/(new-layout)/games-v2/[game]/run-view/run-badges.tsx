// Shared, server-safe badge/line renderers used by both the public run view
// (run-view.tsx) and the mod action card (manage/run/[runId]/run-card.tsx).
// Kept prop-plain (no RunDetail/RunViewModel dependency) so either side can
// import without pulling in the other's types.

import moment from 'moment';
import {
    CheckCircleFill,
    HourglassSplit,
    XCircleFill,
} from 'react-bootstrap-icons';
import type {
    AutoVerifyCheckName,
    AutoVerifyCheckResult,
    AutoVerifyOutcome,
    AutoVerifyResult,
    VerifiedVia,
} from '../../../../../types/moderation.types';
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

const AUTO_VERIFY_TOOLTIP =
    'Verified automatically from split data — not checked by a human.';

/**
 * Shared check-label map — also consumed by the triage/queue check display
 * (see docs/frontend-guide-auto-verify.md §3).
 */
export const AUTO_VERIFY_CHECK_LABELS: Record<AutoVerifyCheckName, string> = {
    consistency: 'Split consistency',
    'live-match': 'Live timing match',
    'gold-beat': 'Gold beat',
    'pb-jump': 'PB improvement',
    'prior-runs': 'Prior verified runs',
    'top-n': 'Top-N guard',
};

const AUTO_VERIFY_OUTCOME_LABELS: Record<AutoVerifyOutcome, string> = {
    pass: 'Passed',
    fail: 'Failed',
    awaiting_live: 'Waiting for live timing',
};

/**
 * Secondary badge beside VerificationBadge — only ever renders when the
 * run's current verdict was produced by the auto-verify checks. Doesn't
 * replace VerificationBadge (a run can be both "Verified" and "Auto-verified").
 */
export function AutoVerifiedBadge({
    verifiedVia,
}: {
    verifiedVia: VerifiedVia;
}) {
    if (verifiedVia !== 'auto') return null;
    return (
        <span
            className={styles.autoVerified}
            aria-label="auto-verified"
            title={AUTO_VERIFY_TOOLTIP}
        >
            Auto-verified
        </span>
    );
}

/**
 * Mod-only per-check breakdown of an auto-verify verdict. Caller is
 * responsible for gating this to moderators — this component renders
 * unconditionally off whatever `result` it's given.
 */
export function AutoVerifyBreakdown({ result }: { result: AutoVerifyResult }) {
    const entries = Object.entries(result.checks) as Array<
        [AutoVerifyCheckName, AutoVerifyCheckResult]
    >;
    return (
        <div className={styles.autoVerifyBreakdown}>
            <div className={styles.autoVerifyHeading}>
                Auto-verify: {AUTO_VERIFY_OUTCOME_LABELS[result.outcome]}
            </div>
            {entries.map(([check, checkResult]) => (
                <div key={check} className={styles.autoVerifyLine}>
                    {checkResult.pass ? (
                        <CheckCircleFill
                            size={11}
                            className={styles.autoVerifyPass}
                            aria-hidden
                        />
                    ) : (
                        <XCircleFill
                            size={11}
                            className={styles.autoVerifyFail}
                            aria-hidden
                        />
                    )}{' '}
                    {AUTO_VERIFY_CHECK_LABELS[check]}
                    {!checkResult.pass && checkResult.reason && (
                        <span className="text-muted">
                            {' '}
                            — {checkResult.reason}
                        </span>
                    )}
                </div>
            ))}
            <div className={`text-muted small ${styles.autoVerifyFooter}`}>
                preset {result.preset} v{result.presetVersion}, evaluated{' '}
                {moment(result.evaluatedAt).format('D MMM YYYY, HH:mm')}
            </div>
        </div>
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
