'use client';

import { type RefObject, useEffect, useRef } from 'react';
import type { VodMarker } from '../../../../../../../types/leaderboards.types';
import {
    formatDeltaMs,
    formatFrameTime,
    formatMs,
} from '../../../leaderboard/vod-review/retime';
import type { VodReviewControls } from '../../../leaderboard/vod-review/vod-review-workbench';
import styles from './moderate-panel.module.scss';
import { VERB_EFFECT, VERB_LABEL } from './verbs';

export interface RetimeFormProps {
    /** The submitted real time the review compares against. */
    submittedMs: number | null;
    /** The time the start and end markers measure; null until both are set. */
    retimedMs: number | null;
    timing: 'realtime' | 'gametime';
    /** False until the review has loaded. */
    loaded: boolean;
    /** Where the run sits now, and where the retimed time would land. */
    fromRank: number | null;
    toRank: number | null;
    boardName: string;
    markers: VodMarker[];
    fps: number;
    /** The workbench's player, for seeking to a marker and setting start/end. */
    controlsRef: RefObject<VodReviewControls | null>;
    note: string;
    onNoteChange: (v: string) => void;
    minNote: number;
    busy: boolean;
}

function kindOf(markers: VodMarker[], kind: 'start' | 'end') {
    const index = markers.findIndex((m) => m.kind === kind);
    return index === -1 ? null : { index, marker: markers[index] };
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.retimeArrow} aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

function CrossIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.retimeX} aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
        </svg>
    );
}

/**
 * A marker as a row you can act on: its time, where it is in the video, and a
 * click that seeks the player there. The moderator's own work was invisible
 * before this — the panel showed a sentence about the result and nothing about
 * what produced it.
 */
function MarkerRow({
    label,
    marker,
    index,
    fps,
    controlsRef,
    busy,
    removable,
    children,
}: {
    label: string;
    marker: VodMarker | null;
    index: number | null;
    fps: number;
    controlsRef: RefObject<VodReviewControls | null>;
    busy: boolean;
    removable: boolean;
    /** The empty state's own affordance, when there is no marker yet. */
    children?: React.ReactNode;
}) {
    if (!marker)
        return (
            <div className={`${styles.markerRow} ${styles.markerRowEmpty}`}>
                <span className={styles.markerKind}>{label}</span>
                <span className={styles.markerMissing}>not set</span>
                {children}
            </div>
        );
    const text = marker.kind === 'note' ? marker.note : marker.label;
    return (
        <div className={styles.markerRow}>
            <button
                type="button"
                className={styles.markerSeek}
                disabled={busy}
                onClick={() => controlsRef.current?.seekToFrame(marker.frame)}
                title="Jump the video here"
            >
                <span className={styles.markerKind}>{label}</span>
                <span className={styles.markerTime}>
                    {formatFrameTime(marker.frame, fps)}
                </span>
                <span className={styles.markerFrame}>frame {marker.frame}</span>
                {text ? (
                    <span className={styles.markerText}>{text}</span>
                ) : null}
            </button>
            {removable && index != null ? (
                <button
                    type="button"
                    className={styles.markerRemove}
                    disabled={busy}
                    onClick={() => controlsRef.current?.removeMarker(index)}
                    aria-label={`Remove ${label.toLowerCase()}`}
                >
                    <CrossIcon />
                </button>
            ) : null}
        </div>
    );
}

/**
 * The Retime form's right column. Unlike the other verbs, retime is not a
 * sentence to confirm — it is a measurement, so the panel leads with the
 * number it produced, then the markers that produced it, and keeps the note
 * (which no runner is ever shown) to one line.
 */
export function RetimeFormBody({
    submittedMs,
    retimedMs,
    timing,
    loaded,
    fromRank,
    toRank,
    boardName,
    markers,
    fps,
    controlsRef,
    note,
    onNoteChange,
    minNote,
    busy,
}: RetimeFormProps) {
    const noteRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        noteRef.current?.focus();
    }, []);

    const start = kindOf(markers, 'start');
    const end = kindOf(markers, 'end');
    const rest = markers
        .map((marker, index) => ({ marker, index }))
        .filter(
            ({ marker }) => marker.kind === 'split' || marker.kind === 'note',
        );

    const delta =
        retimedMs != null && submittedMs != null
            ? retimedMs - submittedMs
            : null;
    const gameTime = timing === 'gametime';
    const shortfall = minNote - note.trim().length;

    return (
        <div className={styles.form}>
            <div className={styles.formTitle}>
                <h4>{VERB_LABEL.retime}</h4>
                <span>{VERB_EFFECT.retime}</span>
            </div>
            <div className={styles.formBody}>
                <section className={styles.part}>
                    <span className={styles.partLabel}>Result</span>
                    <div className={styles.retimeResult}>
                        <div className={styles.retimeFrom}>
                            <span className={styles.retimeLabel}>
                                Submitted
                            </span>
                            <span className={styles.retimeTime}>
                                {submittedMs != null
                                    ? formatMs(submittedMs)
                                    : '—'}
                            </span>
                        </div>
                        <ArrowIcon />
                        <div className={styles.retimeTo}>
                            <span className={styles.retimeLabel}>Retimed</span>
                            <span
                                className={`${styles.retimeTime} ${styles.retimeTimeBig}`}
                                aria-live="polite"
                            >
                                {retimedMs != null ? formatMs(retimedMs) : '—'}
                            </span>
                        </div>
                        {delta != null && (
                            <span
                                className={`${styles.retimeDelta} ${
                                    delta > 0
                                        ? styles.retimeSlower
                                        : delta < 0
                                          ? styles.retimeFaster
                                          : ''
                                }`}
                            >
                                {formatDeltaMs(delta)}
                            </span>
                        )}
                    </div>
                    <p className={styles.retimeWhere}>
                        {!loaded
                            ? 'Loading the video review.'
                            : gameTime
                              ? "This entry is game time. A retime from the video is real time and can't replace it."
                              : retimedMs == null
                                ? 'Set the start and end on the video to measure the run.'
                                : delta === 0
                                  ? `The video gives the same time. ${boardName} does not change.`
                                  : toRank != null && fromRank != null
                                    ? toRank === fromRank
                                        ? `Stays #${fromRank} on ${boardName}.`
                                        : `#${fromRank} → #${toRank} on ${boardName}.`
                                    : `Replaces the time on ${boardName}.`}
                    </p>
                </section>

                <section className={styles.part}>
                    <span className={styles.partLabel}>Markers</span>
                    <div className={styles.markerList}>
                        <MarkerRow
                            label="Start"
                            marker={start?.marker ?? null}
                            index={start?.index ?? null}
                            fps={fps}
                            controlsRef={controlsRef}
                            busy={busy}
                            removable={false}
                        >
                            <button
                                type="button"
                                className={styles.markerSet}
                                disabled={busy}
                                onClick={() =>
                                    controlsRef.current?.mark('start')
                                }
                            >
                                Set here <kbd className={styles.key}>[</kbd>
                            </button>
                        </MarkerRow>
                        <MarkerRow
                            label="End"
                            marker={end?.marker ?? null}
                            index={end?.index ?? null}
                            fps={fps}
                            controlsRef={controlsRef}
                            busy={busy}
                            removable={false}
                        >
                            <button
                                type="button"
                                className={styles.markerSet}
                                disabled={busy}
                                onClick={() => controlsRef.current?.mark('end')}
                            >
                                Set here <kbd className={styles.key}>]</kbd>
                            </button>
                        </MarkerRow>
                        {rest.map(({ marker, index }) => (
                            <MarkerRow
                                key={`${marker.kind}-${marker.frame}-${index}`}
                                label={
                                    marker.kind === 'split' ? 'Split' : 'Note'
                                }
                                marker={marker}
                                index={index}
                                fps={fps}
                                controlsRef={controlsRef}
                                busy={busy}
                                removable
                            />
                        ))}
                    </div>
                </section>

                <section className={styles.part}>
                    <span className={styles.partLabel}>Note</span>
                    <input
                        ref={noteRef}
                        type="text"
                        className={styles.retimeNote}
                        value={note}
                        onChange={(e) => onNoteChange(e.target.value)}
                        disabled={busy}
                        placeholder="Why this run was retimed"
                        aria-label="Why this run was retimed"
                    />
                    <p className={styles.retimeQuiet}>
                        {shortfall > 0 && note.length > 0
                            ? `${shortfall} more character${shortfall === 1 ? '' : 's'}.`
                            : 'Kept in history for other moderators. The runner is not told.'}
                    </p>
                </section>
            </div>
        </div>
    );
}
