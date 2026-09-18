import { formatBoardDate } from '~src/lib/format-run-date';
import { originSummary } from '~src/lib/run-view/origin-summary';
import { srcRunUrl } from '~src/lib/src-links';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

export function OriginPanel({ model }: { model: RunViewModel }) {
    const summary = originSummary(model.origin, model.runnerName);
    if (!summary) return null;

    const ingestedAt = model.origin?.ingestedAt ?? null;
    const srcRunId = model.origin?.srcRunId ?? null;
    const pendingSelfClaim =
        model.origin?.path === 'manual_self' &&
        model.verificationStatus === 'pending';

    return (
        <span className={styles.origin}>
            <span>{summary.line}</span>
            {pendingSelfClaim && (
                <span className={styles.warnPill}>
                    Self-reported · unverified
                </span>
            )}
            {ingestedAt && <span>Added {formatBoardDate(ingestedAt)}</span>}
            {srcRunId && (
                <a href={srcRunUrl(srcRunId)} target="_blank" rel="noreferrer">
                    View on speedrun.com
                </a>
            )}
        </span>
    );
}
