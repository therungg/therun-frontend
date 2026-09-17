'use client';

import Link from '~src/components/link';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    RunComparison,
    RunSplit,
} from '../../../../../types/leaderboards.types';
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

/** How far a segment sits off its gold, relative to the gold itself. */
function toGoldClass(toGold: number, gold: number): string {
    const ratio = gold > 0 ? toGold / gold : 1;
    if (toGold <= 1000 || ratio <= 0.005) return styles.goldNear;
    if (ratio <= 0.03) return styles.goldMid;
    return styles.goldFar;
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
    const vs =
        comparison && comparison.splits.length === splits.length
            ? comparison
            : null;
    const last = splits.length - 1;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Splits</h2>
                {splitsHref && (
                    <Link href={splitsHref} className={styles.panelHeadLink}>
                        Splits & attempt stats →
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
                            // Segments without a PB split are dropped upstream,
                            // so a jump in index means this row spans several
                            // segments and no single gold applies.
                            const single =
                                s.index ===
                                (i > 0 ? splits[i - 1].index : -1) + 1;
                            const gold = single
                                ? (s.bestSegmentMs ?? null)
                                : null;
                            const toGold = gold != null ? seg - gold : null;
                            const isGold = toGold != null && toGold <= 0;
                            const vsDiff = vs
                                ? s.splitTimeMs - vs.splits[i].splitTimeMs
                                : null;
                            const vsText =
                                vsDiff != null
                                    ? formatSplitDelta(vsDiff, 1)
                                    : null;
                            const barWidth = Math.max(0, (seg / longest) * 100);
                            // The share of the bar the gold covers; the rest
                            // is time left on the table.
                            const goldShare =
                                gold != null && seg > 0
                                    ? Math.min(100, (gold / seg) * 100)
                                    : null;
                            const rowClass = [
                                i === last ? styles.splitFinal : '',
                                isGold ? styles.splitGoldRow : '',
                            ]
                                .filter(Boolean)
                                .join(' ');
                            return (
                                <tr key={s.index} className={rowClass}>
                                    <td className={styles.splitName}>
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
                                    <td
                                        className={`${styles.segCell} ${isGold ? styles.segGold : ''}`}
                                    >
                                        <span className={styles.segInner}>
                                            <span
                                                className={styles.segTrack}
                                                aria-hidden
                                            >
                                                <span
                                                    className={styles.segBar}
                                                    style={{
                                                        width: `${barWidth}%`,
                                                    }}
                                                >
                                                    {goldShare != null &&
                                                        !isGold && (
                                                            <span
                                                                className={
                                                                    styles.segBarGold
                                                                }
                                                                style={{
                                                                    width: `${goldShare}%`,
                                                                }}
                                                            />
                                                        )}
                                                </span>
                                            </span>
                                            <span className={styles.segTime}>
                                                {formatTimeMs(seg)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className={styles.splitTime}>
                                        {formatTimeMs(s.splitTimeMs)}
                                    </td>
                                    {hasGold && (
                                        <>
                                            <td
                                                className={`${styles.colGold} ${styles.goldTime}`}
                                            >
                                                {gold != null
                                                    ? formatTimeMs(gold)
                                                    : ''}
                                            </td>
                                            <td className={styles.deltaCell}>
                                                {toGold == null ||
                                                gold == null ? (
                                                    ''
                                                ) : isGold ? (
                                                    <span
                                                        className={
                                                            styles.goldChip
                                                        }
                                                    >
                                                        Gold
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={toGoldClass(
                                                            toGold,
                                                            gold,
                                                        )}
                                                    >
                                                        {formatSplitDelta(
                                                            toGold,
                                                            2,
                                                        )}
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    {vsText != null && vsDiff != null && (
                                        <td className={styles.deltaCell}>
                                            <span
                                                className={
                                                    vsText.startsWith('−')
                                                        ? styles.ahead
                                                        : vsText.startsWith('+')
                                                          ? styles.behind
                                                          : styles.even
                                                }
                                            >
                                                {vsText}
                                            </span>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
