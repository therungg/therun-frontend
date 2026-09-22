'use client';

import type { ReactNode, RefObject } from 'react';
import type { VodMarker } from '../../../../../../../types/leaderboards.types';
import {
    type PlayheadStore,
    usePlayhead,
} from '../../../leaderboard/vod-review/playhead-store';
import {
    RetimeResult,
    RetimeSteps,
} from '../../../leaderboard/vod-review/retime-steps';
import type { VodReviewControls } from '../../../leaderboard/vod-review/vod-review-workbench';
import styles from './moderate-panel.module.scss';
import { VERB_EFFECT, VERB_LABEL } from './verbs';

export interface RetimeFormProps {
    /** The submitted real time the review compares against. */
    submittedMs: number | null;
    /** The time the start and end markers measure; null until both are set
     *  (or while the end sits before the start). */
    retimedMs: number | null;
    timing: 'realtime' | 'gametime';
    /** False until the review has loaded. */
    loaded: boolean;
    /** Where the run sits now, and where the retimed time would land. */
    fromRank: number | null;
    toRank: number | null;
    boardName: string;
    markers: VodMarker[];
    /** The workbench's player, driven by the step cards. */
    controlsRef: RefObject<VodReviewControls | null>;
    /** The workbench's playhead, for the running clock and the mark buttons. */
    playheadStore: PlayheadStore;
    note: string;
    onNoteChange: (v: string) => void;
    minNote: number;
    busy: boolean;
    /** The board's rules, inline at the foot of the column. Null when the
     *  board has none. */
    rules?: ReactNode;
}

/**
 * The Retime form's right column. Retime is a measurement, not a sentence to
 * confirm: the number leads, the two steps that produce it sit under it (the
 * one to do now lit), then the reason. The reason input does not take focus
 * on open — the workbench does, so the frame keys work straight away.
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
    controlsRef,
    playheadStore,
    note,
    onNoteChange,
    minNote,
    busy,
    rules,
}: RetimeFormProps) {
    const playhead = usePlayhead(playheadStore);
    const fps = playhead.fps;
    const hasStart = markers.some((m) => m.kind === 'start');
    const hasEnd = markers.some((m) => m.kind === 'end');
    const gameTime = timing === 'gametime';
    const typed = note.trim().length;

    const where = !loaded
        ? 'Loading the video review.'
        : gameTime
          ? "This entry is game time. A retime from the video is real time and can't replace it."
          : retimedMs == null
            ? !hasStart
                ? 'Mark the start to begin measuring.'
                : hasEnd
                  ? 'The end is before the start.'
                  : 'Counting from the start to the playhead.'
            : retimedMs === submittedMs
              ? `${boardName} does not change.`
              : toRank != null && fromRank != null
                ? toRank === fromRank
                    ? `Stays #${fromRank} on ${boardName}.`
                    : `#${fromRank} → #${toRank} on ${boardName}.`
                : `Replaces the time on ${boardName}.`;

    return (
        <div className={styles.form}>
            <div className={styles.formTitle}>
                <h4>{VERB_LABEL.retime}</h4>
                <span>{VERB_EFFECT.retime}</span>
            </div>
            <div className={styles.formBody}>
                <RetimeResult
                    markers={markers}
                    fps={fps}
                    playhead={playhead}
                    submittedMs={submittedMs}
                >
                    <span>{where}</span>
                </RetimeResult>

                <RetimeSteps
                    markers={markers}
                    fps={fps}
                    playhead={playhead}
                    submittedMs={gameTime ? null : submittedMs}
                    controls={() => controlsRef.current}
                    busy={busy}
                />

                <section className={styles.part}>
                    <label htmlFor="retime-reason" className={styles.partLabel}>
                        Reason
                    </label>
                    <input
                        id="retime-reason"
                        type="text"
                        className={styles.retimeNote}
                        value={note}
                        onChange={(e) => onNoteChange(e.target.value)}
                        disabled={busy}
                        placeholder="Why this run was retimed"
                    />
                    <p className={styles.retimeQuiet}>
                        <span>
                            Other moderators see this. The runner does not.
                        </span>
                        <span>
                            {typed === 0
                                ? `Required · at least ${minNote} characters`
                                : typed < minNote
                                  ? `${typed} / ${minNote}`
                                  : ''}
                        </span>
                    </p>
                </section>

                {rules}
            </div>
        </div>
    );
}
