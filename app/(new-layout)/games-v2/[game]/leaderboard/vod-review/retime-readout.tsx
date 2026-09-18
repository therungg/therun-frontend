'use client';

import { formatDeltaMs, formatMs } from './retime';
import styles from './vod-review.module.scss';

/**
 * What the retime produced, as the surface's result block: the time that came
 * in, the time the markers measure, and the difference between them. The
 * measured time is the biggest thing on the page — it is what the tool exists
 * to produce, and it used to be a sentence of body text under the markers.
 */
export function RetimeReadout({
    submittedMs,
    retimedMs,
    timing,
}: {
    submittedMs: number | null;
    retimedMs: number | null;
    timing: 'realtime' | 'gametime';
}) {
    const delta =
        retimedMs != null && submittedMs != null ? retimedMs - submittedMs : 0;
    const deltaShown = retimedMs != null && submittedMs != null;
    return (
        <div className={styles.readout}>
            <div className={styles.readoutCells}>
                <div className={styles.cell}>
                    <span className={styles.cellLabel}>Submitted</span>
                    <span className={styles.cellValue}>
                        {submittedMs != null
                            ? formatMs(submittedMs)
                            : timing === 'gametime'
                              ? 'game time'
                              : 'unknown'}
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.cellLabel}>Retimed</span>
                    <span
                        className={`${styles.cellValue} ${styles.cellValueBig}`}
                        aria-live="polite"
                    >
                        {retimedMs != null ? formatMs(retimedMs) : '—'}
                    </span>
                </div>
                <div className={styles.cell}>
                    <span className={styles.cellLabel}>Difference</span>
                    <span
                        className={`${styles.cellValue} ${
                            !deltaShown
                                ? ''
                                : delta > 0
                                  ? styles.deltaSlower
                                  : delta < 0
                                    ? styles.deltaFaster
                                    : ''
                        }`}
                    >
                        {deltaShown ? formatDeltaMs(delta) : '—'}
                    </span>
                </div>
            </div>
            {timing === 'gametime' && (
                <p className={styles.readoutNote}>
                    This entry keeps game time. A retime measures real time and
                    can't replace it.
                </p>
            )}
        </div>
    );
}
