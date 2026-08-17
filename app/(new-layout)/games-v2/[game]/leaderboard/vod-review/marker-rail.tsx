'use client';

import type { VodMarker } from '../../../../../../types/leaderboards.types';
import { formatFrameTime } from './retime';
import styles from './vod-review.module.scss';

const KIND_LABEL: Record<VodMarker['kind'], string> = {
    start: 'Start',
    end: 'End',
    split: 'Split',
    note: 'Note',
};

export function MarkerRail({
    markers,
    ghostMarkers,
    fps,
    onSeek,
    onRemove,
    onEditText,
    readOnly = false,
}: {
    markers: VodMarker[];
    /** The other author's markers, shown dimmed and unremovable. */
    ghostMarkers?: VodMarker[];
    fps: number;
    onSeek: (frame: number) => void;
    onRemove: (index: number) => void;
    onEditText: (index: number, text: string) => void;
    readOnly?: boolean;
}) {
    if (markers.length === 0 && !ghostMarkers?.length) {
        return (
            <p className={styles.empty}>
                No markers yet. Step to the first frame of the run and press Set
                start.
            </p>
        );
    }
    return (
        <ol className={styles.rail} aria-label="Markers">
            {ghostMarkers?.map((m, i) => (
                <li
                    key={`ghost-${i}`}
                    className={`${styles.marker} ${styles.ghost}`}
                >
                    <span className={styles.kind}>{KIND_LABEL[m.kind]}</span>
                    <button
                        type="button"
                        className={styles.markerTime}
                        onClick={() => onSeek(m.frame)}
                    >
                        {formatFrameTime(m.frame, fps)}{' '}
                        <span className={styles.frameNo}>#{m.frame}</span>
                    </button>
                    <span className={styles.author}>runner</span>
                </li>
            ))}
            {markers.map((m, i) => (
                <li key={`${m.kind}-${m.frame}-${i}`} className={styles.marker}>
                    <span
                        className={`${styles.kind} ${styles[`kind_${m.kind}`]}`}
                    >
                        {KIND_LABEL[m.kind]}
                    </span>
                    <button
                        type="button"
                        className={styles.markerTime}
                        onClick={() => onSeek(m.frame)}
                    >
                        {formatFrameTime(m.frame, fps)}{' '}
                        <span className={styles.frameNo}>#{m.frame}</span>
                    </button>
                    {(m.kind === 'split' || m.kind === 'note') && (
                        <input
                            className={styles.markerText}
                            value={
                                m.kind === 'split'
                                    ? (m.label ?? '')
                                    : (m.note ?? '')
                            }
                            placeholder={
                                m.kind === 'split' ? 'Split name' : 'Note'
                            }
                            maxLength={m.kind === 'split' ? 80 : 500}
                            readOnly={readOnly}
                            onChange={(e) => onEditText(i, e.target.value)}
                        />
                    )}
                    {!readOnly && (
                        <button
                            type="button"
                            className={styles.remove}
                            aria-label={`Remove ${KIND_LABEL[m.kind]} marker`}
                            onClick={() => onRemove(i)}
                        >
                            ×
                        </button>
                    )}
                </li>
            ))}
        </ol>
    );
}
