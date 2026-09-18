'use client';

import { useRef, useState } from 'react';
import type { VodMarker } from '../../../../../../types/leaderboards.types';
import { PopoverLayer } from '../../shared/popover-layer';
import { formatFrameTime } from './retime';
import styles from './vod-review.module.scss';

const KIND_LABEL: Record<VodMarker['kind'], string> = {
    start: 'Start',
    end: 'End',
    split: 'Split',
    note: 'Note',
};

/** Where a frame sits on the track, as a percentage of the video's length. */
export function trackPercent(frame: number, span: number): number {
    if (span <= 0) return 0;
    return Math.min(100, Math.max(0, (frame / span) * 100));
}

/**
 * How many frames the track spans. The player's duration when it knows one;
 * otherwise the furthest thing we have to show, so the markers stay spread
 * across the track instead of collapsing onto its left edge.
 */
export function trackSpan(
    durationFrames: number | null,
    frames: number[],
): number {
    if (durationFrames != null && durationFrames > 0) return durationFrames;
    return Math.max(1, ...frames) * 1.05;
}

interface MarkerTimelineProps {
    markers: VodMarker[];
    /** The other author's markers, drawn hollow and not editable. */
    ghostMarkers?: VodMarker[];
    fps: number;
    durationFrames: number | null;
    cursorFrame: number;
    onSeek: (frame: number) => void;
    onRemove: (index: number) => void;
    onEditText: (index: number, text: string) => void;
    readOnly?: boolean;
}

/**
 * The run drawn as what it is — a stretch of time. Start and end are flags on
 * a track, splits and notes are ticks between them, and the measured span is
 * shaded. Replaces the vertical list of marker rows, which said nothing about
 * where in the video anything sat.
 */
export function MarkerTimeline({
    markers,
    ghostMarkers,
    fps,
    durationFrames,
    cursorFrame,
    onSeek,
    onRemove,
    onEditText,
    readOnly = false,
}: MarkerTimelineProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const pinRef = useRef<HTMLElement | null>(null);
    const trackRef = useRef<HTMLButtonElement>(null);

    const span = trackSpan(durationFrames, [
        cursorFrame,
        ...markers.map((m) => m.frame),
        ...(ghostMarkers ?? []).map((m) => m.frame),
    ]);
    const start = markers.find((m) => m.kind === 'start');
    const end = markers.find((m) => m.kind === 'end');
    const open = openIndex != null ? markers[openIndex] : null;

    const seekFromPointer = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width <= 0) return;
        onSeek(Math.round(((e.clientX - rect.left) / rect.width) * span));
    };

    return (
        <div className={styles.timeline}>
            <button
                ref={trackRef}
                type="button"
                className={styles.track}
                aria-label="Seek in the video"
                onClick={seekFromPointer}
            />

            {start && end && end.frame > start.frame && (
                <div
                    className={styles.span}
                    style={{
                        left: `${trackPercent(start.frame, span)}%`,
                        width: `${
                            trackPercent(end.frame, span) -
                            trackPercent(start.frame, span)
                        }%`,
                    }}
                />
            )}

            {ghostMarkers?.map((m, i) => (
                <span
                    key={`ghost-${m.kind}-${m.frame}-${i}`}
                    className={`${styles.tick} ${styles.ghostTick}`}
                    style={{ left: `${trackPercent(m.frame, span)}%` }}
                    title={`${KIND_LABEL[m.kind]} ${formatFrameTime(m.frame, fps)} · runner`}
                />
            ))}

            {markers.map((m, i) =>
                m.kind === 'start' || m.kind === 'end' ? (
                    <span
                        key={`${m.kind}-${m.frame}`}
                        className={`${styles.flag} ${styles[`flag_${m.kind}`]}`}
                        style={{ left: `${trackPercent(m.frame, span)}%` }}
                    >
                        <button
                            type="button"
                            className={styles.flagTime}
                            title={`Seek to ${KIND_LABEL[m.kind]}`}
                            onClick={() => onSeek(m.frame)}
                        >
                            {formatFrameTime(m.frame, fps)}
                        </button>
                        {!readOnly && (
                            <button
                                type="button"
                                className={styles.flagRemove}
                                aria-label={`Remove ${KIND_LABEL[m.kind]} marker`}
                                onClick={() => onRemove(i)}
                            >
                                ×
                            </button>
                        )}
                    </span>
                ) : (
                    <button
                        key={`${m.kind}-${m.frame}-${i}`}
                        type="button"
                        className={`${styles.tick} ${styles[`tick_${m.kind}`]} ${
                            openIndex === i ? styles.tickOpen : ''
                        }`}
                        style={{ left: `${trackPercent(m.frame, span)}%` }}
                        aria-label={`${KIND_LABEL[m.kind]} at ${formatFrameTime(m.frame, fps)}`}
                        onClick={(e) => {
                            pinRef.current = e.currentTarget;
                            setOpenIndex(openIndex === i ? null : i);
                        }}
                    />
                ),
            )}

            <div
                className={styles.playhead}
                style={{ left: `${trackPercent(cursorFrame, span)}%` }}
                aria-hidden="true"
            />

            <PopoverLayer
                open={open != null}
                anchorRef={pinRef}
                onClose={() => setOpenIndex(null)}
                align="start"
                side="top"
                themed
            >
                {open && openIndex != null && (
                    <div
                        className={styles.pinPop}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.stopPropagation();
                                setOpenIndex(null);
                            }
                        }}
                    >
                        <div className={styles.pinPopHead}>
                            <span
                                className={`${styles.kind} ${styles[`kind_${open.kind}`]}`}
                            >
                                {KIND_LABEL[open.kind]}
                            </span>
                            <button
                                type="button"
                                className={styles.flagTime}
                                onClick={() => onSeek(open.frame)}
                            >
                                {formatFrameTime(open.frame, fps)}
                            </button>
                        </div>
                        <input
                            className={styles.markerText}
                            value={
                                open.kind === 'split'
                                    ? (open.label ?? '')
                                    : open.kind === 'note'
                                      ? (open.note ?? '')
                                      : ''
                            }
                            placeholder={
                                open.kind === 'split' ? 'Split name' : 'Note'
                            }
                            maxLength={open.kind === 'split' ? 80 : 500}
                            readOnly={readOnly}
                            onChange={(e) =>
                                onEditText(openIndex, e.target.value)
                            }
                        />
                        {!readOnly && (
                            <button
                                type="button"
                                className={styles.pinPopRemove}
                                onClick={() => {
                                    onRemove(openIndex);
                                    setOpenIndex(null);
                                }}
                            >
                                Remove {KIND_LABEL[open.kind].toLowerCase()}
                            </button>
                        )}
                    </div>
                )}
            </PopoverLayer>
        </div>
    );
}
