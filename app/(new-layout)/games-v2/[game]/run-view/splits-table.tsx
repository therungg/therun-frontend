'use client';

import Link from '~src/components/link';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    RunComparison,
    RunSplit,
} from '../../../../../types/leaderboards.types';
import { formatDelta } from './run-format';
import { useRunMedia } from './run-media';
import styles from './run-page.module.scss';

/** Signed split delta: "+2.41" / "−3.2" under a minute, "+1:03.2" above. */
function formatSplitDelta(ms: number, digits: 1 | 2): string {
    const sign = ms < 0 ? '−' : '+';
    const abs = Math.abs(ms);
    const scale = 10 ** digits;
    const rounded = Math.round((abs / 1000) * scale) / scale;
    if (rounded === 0) return (0).toFixed(digits);
    if (rounded < 60) return `${sign}${rounded.toFixed(digits)}`;
    const tenths = Math.round(abs / 100) / 10;
    const h = Math.floor(tenths / 3600);
    const m = Math.floor((tenths % 3600) / 60);
    const s = (tenths % 60).toFixed(1).padStart(4, '0');
    return h > 0
        ? `${sign}${h}:${String(m).padStart(2, '0')}:${s}`
        : `${sign}${m}:${s}`;
}

export function SplitsTable({
    splits,
    comparison,
    splitsHref,
}: {
    splits: RunSplit[];
    comparison: RunComparison | null;
    /** The runner's splits & attempt stats page; null when it doesn't apply. */
    splitsHref: string | null;
}) {
    const { seekToSplit } = useRunMedia();
    if (splits.length === 0) return null;

    // Everything here is real time: golds are real-time segments.
    const segments = splits.map(
        (s, i) => s.splitTimeMs - (i > 0 ? splits[i - 1].splitTimeMs : 0),
    );
    const longest = Math.max(...segments, 1);
    const hasGold = splits.some((s) => s.bestSegmentMs != null);
    const allGolds = splits.every((s) => s.bestSegmentMs != null);
    const sumOfBest = allGolds
        ? splits.reduce((sum, s) => sum + (s.bestSegmentMs ?? 0), 0)
        : null;
    const runTime = splits[splits.length - 1].splitTimeMs;
    const vs =
        comparison && comparison.splits.length === splits.length
            ? comparison
            : null;
    const columns = 3 + (hasGold ? 2 : 0) + (vs ? 1 : 0);

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Splits</h2>
                {splitsHref && (
                    <Link href={splitsHref} className={styles.panelHeadLink}>
                        Splits & attempt stats
                    </Link>
                )}
            </div>
            <div className={styles.splitsScroll}>
                <table className={styles.splits}>
                    <thead>
                        <tr>
                            <th>Segment</th>
                            <th>Time</th>
                            <th>Split</th>
                            {hasGold && (
                                <>
                                    <th className={styles.colGold}>Gold</th>
                                    <th>± gold</th>
                                </>
                            )}
                            {vs && (
                                <th>
                                    vs #{vs.rank} {vs.runnerName}
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {splits.map((s, i) => {
                            const seg = segments[i];
                            const gold = s.bestSegmentMs ?? null;
                            const toGold = gold != null ? seg - gold : null;
                            const vsDiff = vs
                                ? s.splitTimeMs - vs.splits[i].splitTimeMs
                                : null;
                            return (
                                <tr key={s.index}>
                                    <td>
                                        {seekToSplit ? (
                                            <button
                                                type="button"
                                                className={styles.linkButton}
                                                onClick={() =>
                                                    seekToSplit(s.index)
                                                }
                                            >
                                                {s.name}
                                            </button>
                                        ) : (
                                            s.name
                                        )}
                                    </td>
                                    <td className={styles.segCell}>
                                        <span
                                            className={styles.segBar}
                                            style={{
                                                width: `${Math.max(0, (seg / longest) * 100)}%`,
                                            }}
                                            aria-hidden
                                        />
                                        {formatTimeMs(seg)}
                                    </td>
                                    <td>{formatTimeMs(s.splitTimeMs)}</td>
                                    {hasGold && (
                                        <>
                                            <td
                                                className={`${styles.colGold} ${styles.muted}`}
                                            >
                                                {gold != null
                                                    ? formatTimeMs(gold)
                                                    : ''}
                                            </td>
                                            <td className={styles.muted}>
                                                {toGold == null ? (
                                                    ''
                                                ) : toGold <= 0 ? (
                                                    <span
                                                        className={
                                                            styles.goldMark
                                                        }
                                                    >
                                                        Gold
                                                    </span>
                                                ) : (
                                                    formatSplitDelta(toGold, 2)
                                                )}
                                            </td>
                                        </>
                                    )}
                                    {vsDiff != null && (
                                        <td
                                            className={
                                                vsDiff < 0
                                                    ? styles.ahead
                                                    : styles.muted
                                            }
                                        >
                                            {formatSplitDelta(vsDiff, 1)}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    {sumOfBest != null && (
                        <tfoot>
                            <tr>
                                <td colSpan={columns}>
                                    <span className={styles.splitsFoot}>
                                        <span>
                                            Sum of best{' '}
                                            <strong>
                                                {formatTimeMs(sumOfBest)}
                                            </strong>
                                        </span>
                                        {runTime > sumOfBest && (
                                            <span>
                                                Possible timesave{' '}
                                                <strong>
                                                    {formatDelta(
                                                        runTime - sumOfBest,
                                                    )}
                                                </strong>
                                            </span>
                                        )}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </section>
    );
}
