'use client';

import type { ReactNode } from 'react';
import type { VodMarker } from '../../../../../../types/leaderboards.types';
import type { PlayheadSnapshot } from './playhead-store';
import {
    formatDeltaMs,
    formatFrameTime,
    formatMs,
    formatOffsetMs,
} from './retime';
import styles from './vod-review.module.scss';
import type { VodReviewControls } from './vod-review-workbench';

/** Start + the submitted time: where the run should end on the video. An
 *  offset is already taken out of the submitted time, so it goes back in. */
export function expectedEndFrame(
    markers: VodMarker[],
    fps: number,
    submittedMs: number | null,
    offsetMs = 0,
): number | null {
    const start = markers.find((m) => m.kind === 'start');
    if (!start || submittedMs == null) return null;
    return start.frame + Math.round(((submittedMs + offsetMs) / 1000) * fps);
}

/**
 * The number the whole surface exists to produce. Until the end is marked it
 * counts from the start to the playhead, so the measurement is never a dash
 * once there is something to measure from.
 */
export function RetimeResult({
    markers,
    markedMs: marked,
    fps,
    playhead,
    submittedMs,
    offsetMs = 0,
    children,
}: {
    markers: VodMarker[];
    /** What the markers measure, taken at the frame rate they were placed
     *  at: shown at a coarser fps they would round to its frames. */
    markedMs: number | null;
    fps: number;
    playhead: PlayheadSnapshot;
    submittedMs: number | null;
    /** Subtracted from what the markers measure (negative adds). */
    offsetMs?: number;
    /** One line under the numbers: where the run lands, or what to do next. */
    children?: ReactNode;
}) {
    const start = markers.find((m) => m.kind === 'start');
    const end = markers.find((m) => m.kind === 'end');
    const measured = marked != null && marked > 0 ? marked - offsetMs : null;
    const valid = measured != null && measured > 0;
    const running =
        start && !end && playhead.frame > start.frame
            ? Math.round(((playhead.frame - start.frame) / fps) * 1000) -
              offsetMs
            : null;
    const delta = valid && submittedMs != null ? measured - submittedMs : null;

    return (
        <section className={styles.result}>
            <span className={styles.eyebrow}>Retimed</span>
            <div className={styles.resultRow}>
                <span
                    className={`${styles.resultTime} ${
                        valid || running != null ? '' : styles.resultTimeEmpty
                    }`}
                    aria-live={running != null ? 'off' : 'polite'}
                >
                    {valid
                        ? formatMs(measured)
                        : running != null
                          ? formatMs(running)
                          : '—'}
                </span>
                {running != null && !valid && (
                    <span className={styles.runningPill}>Running</span>
                )}
                {delta != null && delta !== 0 && (
                    <span
                        className={`${styles.resultDelta} ${
                            delta < 0 ? styles.deltaFaster : styles.deltaSlower
                        }`}
                    >
                        {formatDeltaMs(delta)} s{' '}
                        {delta < 0 ? 'faster' : 'slower'}
                    </span>
                )}
                {delta === 0 && (
                    <span className={styles.resultDelta}>same time</span>
                )}
            </div>
            <div className={styles.resultSub}>
                {submittedMs != null && (
                    <span>
                        Submitted{' '}
                        <span className={styles.mono}>
                            {formatMs(submittedMs)}
                        </span>
                    </span>
                )}
                {offsetMs !== 0 && (
                    <span>
                        Includes an offset of{' '}
                        <span className={styles.mono}>
                            {formatOffsetMs(offsetMs)} s
                        </span>
                        {marked != null && marked > 0 && (
                            <>
                                {' '}
                                on{' '}
                                <span className={styles.mono}>
                                    {formatMs(marked)}
                                </span>{' '}
                                marked
                            </>
                        )}
                    </span>
                )}
                {children}
            </div>
        </section>
    );
}

type Controls = () => VodReviewControls | null;

function Kbd({ children }: { children: string }) {
    return <kbd className={styles.cardKey}>{children}</kbd>;
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" className={styles.cardCheck} aria-hidden>
            <path d="M5 12l5 5 9-10" />
        </svg>
    );
}

function StepCard({
    n,
    kind,
    state,
    marker,
    fps,
    children,
}: {
    n: number;
    kind: 'start' | 'end';
    state: 'active' | 'done' | 'locked';
    marker: VodMarker | undefined;
    fps: number;
    children: ReactNode;
}) {
    return (
        <div
            className={`${styles.card} ${styles[`card_${kind}`]} ${
                state === 'active'
                    ? styles.cardActive
                    : state === 'locked'
                      ? styles.cardLocked
                      : ''
            }`}
        >
            <div className={styles.cardHead}>
                <span className={styles.cardDot}>
                    {state === 'done' ? <CheckIcon /> : n}
                </span>
                <span className={styles.cardName}>
                    {kind === 'start' ? 'Start' : 'End'}
                </span>
                {marker && (
                    <span className={styles.cardWhen}>
                        <span className={styles.cardTime}>
                            {formatFrameTime(marker.frame, fps)}
                        </span>
                        <span className={styles.cardFrame}>
                            frame {marker.frame}
                        </span>
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}

/** Go to, nudge, mark again, clear: what you do to a marker once it exists. */
function MarkerTools({
    kind,
    marker,
    controls,
    disabled,
}: {
    kind: 'start' | 'end';
    marker: VodMarker;
    controls: Controls;
    disabled: boolean;
}) {
    const name = kind === 'start' ? 'start' : 'end';
    return (
        <div className={styles.cardActions}>
            <button
                type="button"
                className={styles.cardTool}
                disabled={disabled}
                onClick={() => controls()?.seekToFrame(marker.frame)}
            >
                Go to
            </button>
            <button
                type="button"
                className={styles.cardTool}
                disabled={disabled}
                aria-label={`Move the ${name} one frame earlier`}
                onClick={() => controls()?.nudgeMarker(kind, -1)}
            >
                −1f
            </button>
            <button
                type="button"
                className={styles.cardTool}
                disabled={disabled}
                aria-label={`Move the ${name} one frame later`}
                onClick={() => controls()?.nudgeMarker(kind, 1)}
            >
                +1f
            </button>
            <span className={styles.grow} />
            <button
                type="button"
                className={styles.cardQuiet}
                disabled={disabled}
                onClick={() => controls()?.mark(kind)}
            >
                Mark again <Kbd>{kind === 'start' ? '[' : ']'}</Kbd>
            </button>
            <button
                type="button"
                className={styles.cardQuiet}
                disabled={disabled}
                onClick={() => controls()?.clearMarker(kind)}
            >
                Clear
            </button>
        </div>
    );
}

/**
 * Retiming is two steps — find the first frame, find the last — so it is
 * drawn as two cards, the one to do now lit and the other waiting. Nothing
 * is assumed: the start is empty until someone marks it, since a VOD almost
 * never begins on the run's first frame.
 */
export function RetimeSteps({
    markers,
    fps,
    playhead,
    submittedMs,
    offsetMs = 0,
    controls,
    busy = false,
    layout = 'column',
}: {
    markers: VodMarker[];
    fps: number;
    playhead: PlayheadSnapshot;
    /** The time to jump ahead by from the start; null hides the jump. */
    submittedMs: number | null;
    offsetMs?: number;
    controls: Controls;
    busy?: boolean;
    layout?: 'column' | 'row';
}) {
    const start = markers.find((m) => m.kind === 'start');
    const end = markers.find((m) => m.kind === 'end');
    const off = busy || !playhead.ready;
    const here = formatFrameTime(playhead.frame, fps);
    const expected = expectedEndFrame(markers, fps, submittedMs, offsetMs);
    const backwards = start && end && end.frame <= start.frame;
    // Once the playhead is near the expected end (the frame strip's window),
    // the jump is done and marking is the next thing to do.
    const nearExpected =
        expected != null &&
        Math.abs(playhead.frame - expected) <= Math.round(2 * fps);

    return (
        <div
            className={`${styles.cards} ${
                layout === 'row' ? styles.cardsRow : ''
            }`}
        >
            <StepCard
                n={1}
                kind="start"
                state={start ? 'done' : 'active'}
                marker={start}
                fps={fps}
            >
                {start ? (
                    <MarkerTools
                        kind="start"
                        marker={start}
                        controls={controls}
                        disabled={off}
                    />
                ) : (
                    <>
                        <p className={styles.cardHint}>
                            Step to the first frame the timer should start on,
                            then mark it.
                        </p>
                        <div className={styles.cardActions}>
                            <button
                                type="button"
                                className={styles.cardPrimary}
                                disabled={off}
                                onClick={() => controls()?.mark('start')}
                            >
                                Mark start at {here} <Kbd>[</Kbd>
                            </button>
                        </div>
                    </>
                )}
            </StepCard>

            <StepCard
                n={2}
                kind="end"
                state={!start ? 'locked' : end ? 'done' : 'active'}
                marker={end}
                fps={fps}
            >
                {end ? (
                    <>
                        {backwards && (
                            <p className={styles.cardWarn}>
                                The end is before the start. Mark one of them
                                again.
                            </p>
                        )}
                        <MarkerTools
                            kind="end"
                            marker={end}
                            controls={controls}
                            disabled={off}
                        />
                    </>
                ) : !start ? (
                    <p className={styles.cardHint}>
                        Mark the start first.
                        {submittedMs != null
                            ? ' Then you can jump straight to where the submitted time says the run ends.'
                            : ''}
                    </p>
                ) : (
                    <>
                        <p className={styles.cardHint}>
                            {expected == null ? (
                                'Step to the last frame of the run, then mark it.'
                            ) : nearExpected ? (
                                'Step to the exact last frame, then mark it.'
                            ) : (
                                <>
                                    The start plus the submitted time puts the
                                    finish at{' '}
                                    <span className={styles.expectText}>
                                        {formatFrameTime(expected, fps)}
                                    </span>
                                    . Jump there, then step to the exact frame.
                                </>
                            )}
                        </p>
                        <div className={styles.cardActions}>
                            {expected != null && !nearExpected && (
                                <button
                                    type="button"
                                    className={`${styles.cardPrimary} ${styles.cardExpect}`}
                                    disabled={off}
                                    onClick={() =>
                                        controls()?.jumpToExpectedEnd()
                                    }
                                >
                                    Jump to expected end <Kbd>e</Kbd>
                                </button>
                            )}
                            <button
                                type="button"
                                className={
                                    expected != null && !nearExpected
                                        ? styles.cardSecondary
                                        : styles.cardPrimary
                                }
                                disabled={off}
                                onClick={() => controls()?.mark('end')}
                            >
                                Mark end at {here} <Kbd>]</Kbd>
                            </button>
                            {nearExpected && (
                                <button
                                    type="button"
                                    className={styles.cardQuiet}
                                    disabled={off}
                                    onClick={() =>
                                        controls()?.jumpToExpectedEnd()
                                    }
                                >
                                    Back to expected end <Kbd>e</Kbd>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </StepCard>
        </div>
    );
}
