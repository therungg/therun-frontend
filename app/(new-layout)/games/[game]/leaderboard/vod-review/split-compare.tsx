'use client';

import type {
    RunSplit,
    VodMarker,
} from '../../../../../../types/leaderboards.types';
import { formatDeltaMs, formatMs } from './retime';
import { startFrameOf } from './split-nav';
import styles from './vod-review.module.scss';

/** The run split a split marker stands for: its index, else its name. */
export function pairedSplitIndex(
    marker: VodMarker,
    splits: RunSplit[],
): number | null {
    if (marker.splitIndex != null) {
        return splits.some((s) => s.index === marker.splitIndex)
            ? marker.splitIndex
            : null;
    }
    const label = marker.label?.trim().toLowerCase();
    if (!label) return null;
    return (
        splits.find((s) => s.name.trim().toLowerCase() === label)?.index ?? null
    );
}

/**
 * A split renamed by hand: it pairs with the run split of that name now, or
 * with none, rather than keeping the one it was placed as.
 */
export function withSplitLabel(
    marker: VodMarker,
    label: string,
    splits: RunSplit[],
): VodMarker {
    const { splitIndex: _old, ...rest } = marker;
    const match = splits.find(
        (s) => s.name.trim().toLowerCase() === label.trim().toLowerCase(),
    );
    return match
        ? { ...rest, label, splitIndex: match.index }
        : { ...rest, label };
}

type Row = {
    key: string;
    name: string;
    timerMs: number | null;
    marked: { frame: number; ms: number | null } | null;
};

/**
 * Every split marked on the video beside the run's own splits: where the
 * timer split, where it was marked from the start marker, and the gap.
 */
export function SplitCompare({
    markers,
    splits,
    fps,
    onSeek,
}: {
    markers: VodMarker[];
    splits: RunSplit[];
    fps: number;
    onSeek: (frame: number) => void;
}) {
    const splitMarkers = markers.filter((m) => m.kind === 'split');
    if (splitMarkers.length === 0) return null;

    const startFrame = startFrameOf(markers);
    const sinceStart = (frame: number) =>
        startFrame == null
            ? null
            : Math.round(((frame - startFrame) / fps) * 1000);

    // Each run split takes the first marker paired with it; the rest, and any
    // marker paired with nothing, are listed after the run's splits.
    const byIndex = new Map<number, VodMarker>();
    const unpaired: VodMarker[] = [];
    for (const m of splitMarkers) {
        const idx = pairedSplitIndex(m, splits);
        if (idx != null && !byIndex.has(idx)) byIndex.set(idx, m);
        else unpaired.push(m);
    }

    const rows: Row[] = [
        ...splits.map((s) => {
            const m = byIndex.get(s.index);
            return {
                key: `split-${s.index}`,
                name: s.name,
                timerMs: s.splitTimeMs,
                marked: m ? { frame: m.frame, ms: sinceStart(m.frame) } : null,
            };
        }),
        ...unpaired.map((m, i) => ({
            key: `marker-${m.frame}-${i}`,
            name: m.label?.trim() || 'Unnamed split',
            timerMs: null,
            marked: { frame: m.frame, ms: sinceStart(m.frame) },
        })),
    ];

    return (
        <div className={styles.splitCompare}>
            <table className={styles.splitCompareTable}>
                <thead>
                    <tr>
                        <th>Split</th>
                        <th className={styles.num}>Splits file</th>
                        <th className={styles.num}>Marked</th>
                        <th className={styles.num}>Difference</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => {
                        const marked = r.marked;
                        const diff =
                            marked?.ms != null && r.timerMs != null
                                ? marked.ms - r.timerMs
                                : null;
                        return (
                            <tr
                                key={r.key}
                                className={
                                    marked ? undefined : styles.splitUnmarked
                                }
                            >
                                <td className={styles.splitCompareName}>
                                    {r.name}
                                </td>
                                <td className={styles.num}>
                                    {r.timerMs != null
                                        ? formatMs(r.timerMs)
                                        : '—'}
                                </td>
                                <td className={styles.num}>
                                    {marked ? (
                                        <button
                                            type="button"
                                            className={styles.splitCompareSeek}
                                            title="Go to this frame"
                                            onClick={() => onSeek(marked.frame)}
                                        >
                                            {marked.ms != null
                                                ? formatMs(marked.ms)
                                                : 'Set a start'}
                                        </button>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td className={styles.num}>
                                    {diff != null ? formatDeltaMs(diff) : ''}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
