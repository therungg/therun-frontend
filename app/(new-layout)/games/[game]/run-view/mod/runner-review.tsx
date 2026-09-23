'use client';

import moment from 'moment';
import Link from '~src/components/link';
import { buildModRunnerHref, buildRunHref } from '~src/lib/board-url';
import { formatDuration } from '~src/lib/duration';
import { statusLabel } from '~src/lib/moderation/run-status-copy';
import type {
    OtherPending,
    PbPoint,
    RunReview,
} from '../../../../../../types/run-review.types';
import { formatSubcategoryKey } from '../../labels';
import { RunnerAvatar } from '../../leaderboard/runner-avatar';
import { formatGap } from '../run-format';
import type { RunViewModel } from '../run-view';
import styles from './mod-layer.module.scss';

function statusClass(p: PbPoint): string {
    if (p.excluded || p.status === 'rejected') return styles.statusRejected;
    if (p.status === 'pending') return styles.statusPending;
    return '';
}

function boardName(o: OtherPending): string {
    const sub = formatSubcategoryKey(o.subcategoryKey);
    return sub ? `${o.categoryDisplay} · ${sub}` : o.categoryDisplay;
}

/** Who ran it: their standing on this game and how their times have moved. */
export function RunnerReview({
    model,
    review,
    gameSlug,
    onOpenRun,
}: {
    model: RunViewModel;
    review: RunReview | null;
    gameSlug: string;
    /** Inside the moderator modal: open another run in place. */
    onOpenRun?: (runId: number) => void;
}) {
    const record = review?.trackRecord;
    if (!review || !record || model.isGuest || model.userId == null) {
        return null;
    }

    const pending =
        review.otherPending.length +
        (model.verificationStatus === 'pending' ? 1 : 0);
    const since = record.accountCreatedAt
        ? moment(record.accountCreatedAt).format('MMM YYYY')
        : null;
    const counts: { value: number; label: string; pending?: boolean }[] = [
        { value: record.verifiedRunsThisGame, label: 'verified here' },
        { value: record.rejectedRunsThisGame, label: 'rejected' },
        { value: pending, label: 'pending', pending: pending > 0 },
        { value: record.verifiedRuns, label: 'verified overall' },
    ];
    const points = review.pbProgression;
    // The backend sends at most 8 points; a full list may not reach back to
    // the runner's first time.
    const complete = points.length < 8;

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <span className={styles.eyebrow}>Runner</span>
                <Link
                    href={buildModRunnerHref(gameSlug, record.userId)}
                    className={styles.headLink}
                >
                    All their runs
                </Link>
            </div>
            <div className={styles.runnerHead}>
                <RunnerAvatar
                    name={model.runnerName}
                    picture={model.picture}
                    size="md"
                />
                <div className={styles.runnerText}>
                    <span className={styles.runnerName}>
                        {model.runnerName}
                    </span>
                    {since && (
                        <span className={`${styles.small} ${styles.muted}`}>
                            On therun since {since}
                        </span>
                    )}
                </div>
            </div>
            <div className={styles.counts}>
                {counts.map((c) => (
                    <div key={c.label} className={styles.countCell}>
                        <span
                            className={`${styles.countValue} ${c.pending ? styles.countPending : ''}`}
                        >
                            {c.value}
                        </span>
                        <span className={styles.countLabel}>{c.label}</span>
                    </div>
                ))}
            </div>
            {points.length > 0 && (
                <div>
                    <div className={styles.subhead}>
                        Their {model.categoryDisplay} progress
                    </div>
                    <table className={styles.table}>
                        <tbody>
                            {points.map((p, i) => {
                                const older = points[i + 1];
                                const delta = older
                                    ? p.timeMs - older.timeMs
                                    : null;
                                const self = p.runId === review.runId;
                                return (
                                    <tr key={p.runId}>
                                        <td className={styles.muted}>
                                            {moment(p.endedAt).format('D MMM')}
                                        </td>
                                        <td className={styles.mono}>
                                            {formatDuration(p.timeMs)}
                                        </td>
                                        <td
                                            className={`${styles.mono} ${
                                                delta != null && delta < 0
                                                    ? styles.faster
                                                    : styles.slower
                                            }`}
                                        >
                                            {delta != null
                                                ? formatGap(delta)
                                                : complete
                                                  ? 'first'
                                                  : ''}
                                        </td>
                                        <td className={statusClass(p)}>
                                            {self ? 'This run · ' : ''}
                                            {statusLabel(p.status, p.excluded)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {review.otherPending.length > 0 && (
                <div className={styles.alsoPending}>
                    <span className={styles.subhead}>Also pending</span>
                    {review.otherPending.map((o) => (
                        <span key={o.runId}>
                            {boardName(o)} ·{' '}
                            <span className={styles.mono}>
                                {formatDuration(o.timeMs)}
                            </span>{' '}
                            ·{' '}
                            {onOpenRun ? (
                                <button
                                    type="button"
                                    className={styles.linkButton}
                                    onClick={() => onOpenRun(o.runId)}
                                >
                                    open
                                </button>
                            ) : (
                                <Link href={buildRunHref(gameSlug, o.runId)}>
                                    open
                                </Link>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </section>
    );
}
