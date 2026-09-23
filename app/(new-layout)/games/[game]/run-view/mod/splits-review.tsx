'use client';

import { useState } from 'react';
import { formatDuration } from '~src/lib/duration';
import { formatGap } from '../run-format';
import { useRunMedia } from '../run-media';
import type { RunViewModel } from '../run-view';
import { SplitsTable } from '../splits-table';
import styles from './mod-layer.module.scss';
import { MOD_SPLITS_ID } from './why-here';

const MAX_BAR = 40;
const MAX_NOTABLE = 5;

type Seg = {
    /** The split's own segment ordinal (0-based). */
    index: number;
    name: string;
    startMs: number;
    segMs: number;
    goldMs: number;
    delta: number;
    isGold: boolean;
    outOfLine: boolean;
};

/** m:ss (h:mm:ss past an hour) of where a segment starts. */
function clock(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function segmentsOf(model: RunViewModel): Seg[] {
    const beat = model.autoVerifyResult?.checks['gold-beat'];
    const beatIndex =
        beat && !beat.pass && typeof beat.details.segment === 'number'
            ? beat.details.segment
            : null;
    const out: Seg[] = [];
    model.splits.forEach((s, i) => {
        const prev = i > 0 ? model.splits[i - 1] : null;
        // A gap in the ordinals means this row spans several segments, and
        // no single gold applies to it.
        const single = s.index === (prev ? prev.index : -1) + 1;
        const gold = single ? (s.bestSegmentMs ?? null) : null;
        // A split stored as 0 was skipped on the timer: no real segment.
        const timed =
            s.splitTimeMs > 0 && (prev == null || prev.splitTimeMs > 0);
        if (gold == null || !timed) return;
        const startMs = prev?.splitTimeMs ?? 0;
        const segMs = s.splitTimeMs - startMs;
        out.push({
            index: s.index,
            name: s.name,
            startMs,
            segMs,
            goldMs: gold,
            delta: segMs - gold,
            // The gold can be this very run's segment: equal means gold.
            isGold: segMs <= gold,
            outOfLine: s.index === beatIndex,
        });
    });
    return out;
}

function notableOf(segs: Seg[]): Seg[] {
    const out = segs.filter((s) => s.outOfLine);
    const golds = segs.filter((s) => s.isGold && !s.outOfLine);
    const slow = segs
        .filter((s) => !s.isGold && !s.outOfLine)
        .sort((a, b) => b.delta - a.delta);
    return [...out, ...golds, ...slow].slice(0, MAX_NOTABLE);
}

function barClass(s: Seg): string {
    if (s.outOfLine) return styles.barOut;
    return s.isGold ? styles.barGold : '';
}

/** Every segment against the runner's golds, and the few worth a look. */
export function SplitsReview({ model }: { model: RunViewModel }) {
    const { seekToSplit } = useRunMedia();
    const [showAll, setShowAll] = useState(false);
    if (model.splits.length === 0) return null;

    const segs = segmentsOf(model);
    const notable = notableOf(segs);
    // Scale to the typical deviation, not the largest: one wild segment
    // would flatten every other bar to nothing.
    const sorted = segs.map((s) => Math.abs(s.delta)).sort((a, b) => a - b);
    const typical = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
    const scale = typical > 0 ? MAX_BAR / typical : 0;
    const height = (s: Seg) =>
        Math.max(2, Math.min(MAX_BAR, Math.abs(s.delta) * scale));

    return (
        <div id={MOD_SPLITS_ID} className={styles.splitsWrap}>
            <section className={styles.panel}>
                <div className={styles.head}>
                    <span className={styles.eyebrow}>Splits</span>
                    <span className={styles.count}>
                        {model.splits.length} segments
                    </span>
                </div>
                {segs.length > 0 && (
                    <>
                        <div className={styles.strip}>
                            {segs.map((s) => {
                                const up = s.delta <= 0;
                                const fill = (
                                    <span
                                        className={`${styles.barFill} ${barClass(s)}`}
                                        style={{ height: `${height(s)}px` }}
                                    />
                                );
                                const inner = (
                                    <>
                                        <span className={styles.barUp}>
                                            {up && fill}
                                        </span>
                                        <span className={styles.barDown}>
                                            {!up && fill}
                                        </span>
                                    </>
                                );
                                const title = `${s.index + 1}. ${s.name} ${formatGap(s.delta)}`;
                                return seekToSplit ? (
                                    <button
                                        key={s.index}
                                        type="button"
                                        className={styles.bar}
                                        title={title}
                                        aria-label={title}
                                        onClick={() => seekToSplit(s.index)}
                                    >
                                        {inner}
                                    </button>
                                ) : (
                                    <span
                                        key={s.index}
                                        className={styles.bar}
                                        title={title}
                                    >
                                        {inner}
                                    </span>
                                );
                            })}
                        </div>
                        <div className={styles.legend}>
                            <span>
                                <span
                                    className={`${styles.swatch} ${styles.barGold}`}
                                />
                                gold
                            </span>
                            <span>
                                <span
                                    className={`${styles.swatch} ${styles.barFill}`}
                                />
                                slower than gold
                            </span>
                            {segs.some((s) => s.outOfLine) && (
                                <span>
                                    <span
                                        className={`${styles.swatch} ${styles.barOut}`}
                                    />
                                    out of line
                                </span>
                            )}
                        </div>
                    </>
                )}
                {notable.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Segment</th>
                                <th className={styles.right}>Time</th>
                                <th className={styles.right}>Gold</th>
                                <th className={styles.right}>Difference</th>
                                {seekToSplit && <th />}
                            </tr>
                        </thead>
                        <tbody>
                            {notable.map((s) => (
                                <tr key={s.index}>
                                    <td className={styles.mono}>
                                        {s.index + 1}
                                    </td>
                                    <td>
                                        {s.name}{' '}
                                        {s.outOfLine ? (
                                            <span className={styles.noteOut}>
                                                out of line
                                            </span>
                                        ) : s.isGold ? (
                                            <span className={styles.noteGold}>
                                                gold
                                            </span>
                                        ) : null}
                                    </td>
                                    <td
                                        className={`${styles.mono} ${styles.right}`}
                                    >
                                        {formatDuration(s.segMs)}
                                    </td>
                                    <td
                                        className={`${styles.mono} ${styles.right}`}
                                    >
                                        {formatDuration(s.goldMs)}
                                    </td>
                                    <td
                                        className={`${styles.mono} ${styles.right} ${
                                            s.outOfLine
                                                ? styles.checkFail
                                                : s.delta > 0
                                                  ? styles.slower
                                                  : ''
                                        }`}
                                    >
                                        {s.delta === 0
                                            ? '0.000'
                                            : formatGap(s.delta)}
                                    </td>
                                    {seekToSplit && (
                                        <td className={styles.right}>
                                            <button
                                                type="button"
                                                className={styles.linkButton}
                                                onClick={() =>
                                                    seekToSplit(s.index)
                                                }
                                            >
                                                Jump to {clock(s.startMs)}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <button
                    type="button"
                    className={styles.pill}
                    aria-expanded={showAll}
                    onClick={() => setShowAll((v) => !v)}
                >
                    {showAll
                        ? 'Hide the segments'
                        : `Show all ${model.splits.length} segments`}
                </button>
            </section>
            {showAll && (
                <SplitsTable
                    splits={model.splits}
                    comparison={null}
                    splitsHref={null}
                />
            )}
        </div>
    );
}
