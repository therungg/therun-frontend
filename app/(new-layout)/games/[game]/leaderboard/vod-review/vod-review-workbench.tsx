'use client';

import {
    type RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
    useTransition,
} from 'react';
import { toast } from 'react-toastify';
import type {
    RunSplit,
    VodMarker,
    VodReviewPatch,
} from '../../../../../../types/leaderboards.types';
import {
    saveVodReviewAction,
    type VodReviewTarget,
} from '../actions/vod-review.action';
import { MarkerTimeline } from './marker-timeline';
import type { PlayerFactory } from './player/create-player';
import {
    formatMs,
    MAX_FPS,
    removeMarkerAt,
    retimeMs,
    setMarker,
} from './retime';
import { RetimeReadout } from './retime-readout';
import {
    nextSplitPos,
    prevSplitPos,
    splitStartFrame,
    splitStartMs,
    startFrameOf,
} from './split-nav';
import { type FpsChoice, TransportBar } from './transport-bar';
import { useVodPlayer } from './use-vod-player';
import styles from './vod-review.module.scss';

/**
 * What a host rendered beside the workbench can drive on it. The moderate
 * panel's Retime form lists the markers and needs to seek to one, drop one,
 * or set start/end from its own buttons.
 */
export interface VodReviewControls {
    seekToFrame: (frame: number) => void;
    removeMarker: (index: number) => void;
    mark: (kind: VodMarker['kind']) => void;
}

export interface VodReviewWorkbenchProps {
    mode: 'mod' | 'runner';
    url: string;
    target?: VodReviewTarget;
    gameSlug?: string;
    initial: {
        fps: number;
        markers: VodMarker[];
        runnerMarkers?: VodMarker[];
        realTimeMs: number | null;
        timing: 'realtime' | 'gametime';
        /** PB split times for split-jumps; empty unless this run is the PB. */
        splits?: RunSplit[];
    };
    onChange?: (patch: VodReviewPatch | null) => void;
    onSaved?: (patch: VodReviewPatch | null, appliedMs?: number) => void;
    /** Hides Save markers / Apply retime: the host confirms the retime itself. */
    hideActions?: boolean;
    /** Filled with the player controls, for a host that renders its own marker list. */
    controlsRef?: RefObject<VodReviewControls | null>;
    playerFactory?: PlayerFactory;
}

function toPatch(fps: number, markers: VodMarker[]): VodReviewPatch {
    const r = retimeMs(markers, fps);
    return r === null ? { fps, markers } : { fps, markers, retimedMs: r };
}

/**
 * The start marker defaults to frame 0 — most VODs begin at the run's start,
 * so the common case needs only an `end` to retime, and split jumps (which
 * anchor on `start`) work straight away. Loaded markers that already carry a
 * start are left alone; Set start moves it like any other.
 */
export function withDefaultStart(markers: VodMarker[]): VodMarker[] {
    return markers.some((m) => m.kind === 'start')
        ? markers
        : setMarker(markers, { kind: 'start', frame: 0 });
}

export function VodReviewWorkbench({
    mode,
    url,
    target,
    gameSlug,
    initial,
    onChange,
    onSaved,
    hideActions = false,
    controlsRef,
    playerFactory,
}: VodReviewWorkbenchProps) {
    const isMod = mode === 'mod';
    const [fps, setFps] = useState(initial.fps);
    const [fpsChoice, setFpsChoice] = useState<FpsChoice>(
        initial.fps === 60 ? '60' : initial.fps === 30 ? '30' : 'other',
    );
    const [markers, setMarkers] = useState<VodMarker[]>(() =>
        withDefaultStart(initial.markers),
    );
    // Tracked for a future "unsaved changes" affordance; Save is gated on
    // having markers at all (see the controller ruling in the B5 brief),
    // not on this flag.
    const [_dirty, setDirty] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const player = useVodPlayer({ url, fps, factory: playerFactory });
    const ready = player.status === 'ready';

    // Streams every change up: the runner's set-time form (runner mode) and
    // the moderate panel's Retime form (mod mode).
    useEffect(() => {
        if (!onChange) return;
        onChange(markers.length ? toPatch(fps, markers) : null);
    }, [fps, markers, onChange]);

    const update = useCallback((next: VodMarker[]) => {
        setMarkers(next);
        setDirty(true);
    }, []);

    const mark = useCallback(
        (kind: VodMarker['kind']) => {
            const frame = player.currentFrameFromPlayer();
            const m: VodMarker =
                kind === 'note'
                    ? { kind, frame, note: '' }
                    : kind === 'split'
                      ? { kind, frame, label: '' }
                      : { kind, frame };
            update(setMarker(markers, m));
        },
        [markers, player, update],
    );

    // Split jumps: anchor the run's known split times onto the VOD's frame
    // timeline, using the `start` marker as frame 0 of the run. A jump lands
    // where the segment BEGINS, so the named segment is what plays next.
    const splits = useMemo(() => initial.splits ?? [], [initial.splits]);
    const startFrame = useMemo(() => startFrameOf(markers), [markers]);
    const finishMs = initial.realTimeMs;
    const canJumpSplits = ready && startFrame != null;

    const jumpToSplitPos = useCallback(
        (pos: number) => {
            if (startFrame == null) return;
            player.seekToFrame(splitStartFrame(splits, pos, startFrame, fps));
        },
        [startFrame, splits, fps, player],
    );
    const jumpNextSplit = useCallback(() => {
        if (startFrame == null) return;
        const pos = nextSplitPos(splits, startFrame, fps, player.cursorFrame);
        if (pos != null) jumpToSplitPos(pos);
    }, [startFrame, splits, fps, player.cursorFrame, jumpToSplitPos]);
    const jumpPrevSplit = useCallback(() => {
        if (startFrame == null) return;
        const pos = prevSplitPos(splits, startFrame, fps, player.cursorFrame);
        if (pos != null) jumpToSplitPos(pos);
    }, [startFrame, splits, fps, player.cursorFrame, jumpToSplitPos]);
    const jumpToFinish = useCallback(() => {
        if (startFrame == null || finishMs == null) return;
        player.seekToFrame(startFrame + Math.round((finishMs / 1000) * fps));
    }, [startFrame, finishMs, fps, player]);

    useImperativeHandle(
        controlsRef,
        () => ({
            seekToFrame: player.seekToFrame,
            removeMarker: (i: number) => update(removeMarkerAt(markers, i)),
            mark,
        }),
        [player.seekToFrame, markers, update, mark],
    );

    const retimed = useMemo(() => retimeMs(markers, fps), [markers, fps]);
    const canApply =
        isMod &&
        retimed != null &&
        initial.timing === 'realtime' &&
        retimed !== initial.realTimeMs;

    // Keyboard, only while focus is inside the workbench but not the iframe.
    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!ready) return;
        const t = e.target as HTMLElement;
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
        const map: Record<string, () => void> = {
            ',': () => player.stepFrames(-1),
            '.': () => player.stepFrames(1),
            '<': () => player.stepFrames(-10),
            '>': () => player.stepFrames(10),
            ' ': () => player.togglePlay(),
            '[': () => mark('start'),
            ']': () => mark('end'),
            m: () => isMod && mark('note'),
            n: () => isMod && jumpNextSplit(),
            p: () => isMod && jumpPrevSplit(),
            e: () => isMod && jumpToFinish(),
        };
        const fn = map[e.key];
        if (fn) {
            e.preventDefault();
            fn();
        }
    };

    const save = (applyRetimeMs?: number) => {
        if (!isMod || !target || !gameSlug) return;
        setError(null);
        const patch = toPatch(fps, markers);
        startTransition(async () => {
            const res = await saveVodReviewAction(
                gameSlug,
                target,
                patch,
                applyRetimeMs != null ? { applyRetimeMs } : {},
            );
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setDirty(false);
            toast.success(
                applyRetimeMs != null ? 'Retime applied.' : 'Markers saved.',
            );
            onSaved?.(patch, applyRetimeMs);
        });
    };

    const changeFps = (choice: FpsChoice, value?: number) => {
        setFpsChoice(choice);
        const next = choice === 'other' ? (value ?? fps) : Number(choice);
        if (next > 0 && next <= MAX_FPS) {
            setFps(next);
            if (markers.length) setDirty(true);
        }
    };

    const durationFrames =
        player.durationSeconds != null
            ? Math.floor(player.durationSeconds * fps)
            : null;

    return (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the workbench is a keyboard surface
        <div
            className={styles.workbench}
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-label="VOD review"
        >
            <div className={styles.stage}>
                <div ref={player.containerRef} className={styles.player} />
                <TransportBar
                    ready={ready}
                    playing={player.playing}
                    onTogglePlay={player.togglePlay}
                    onStepFrames={player.stepFrames}
                    onStepSeconds={player.stepSeconds}
                    cursorFrame={player.cursorFrame}
                    fps={fps}
                    fpsChoice={fpsChoice}
                    onFpsChange={changeFps}
                    rate={player.rate}
                    onRateChange={player.setRate}
                    supportsRate={player.supportsRate}
                    isMod={isMod}
                />
            </div>

            {player.status === 'unavailable' && (
                <p className={styles.note}>
                    This link can't be frame-stepped here (only YouTube and
                    Twitch VODs can).
                </p>
            )}
            {player.status === 'error' && (
                <p className={styles.note}>{player.error}</p>
            )}

            <MarkerTimeline
                markers={markers}
                ghostMarkers={isMod ? initial.runnerMarkers : undefined}
                fps={fps}
                durationFrames={durationFrames}
                cursorFrame={player.cursorFrame}
                onSeek={player.seekToFrame}
                onRemove={(i) => update(removeMarkerAt(markers, i))}
                onEditText={(i, text) =>
                    update(
                        markers.map((m, j) =>
                            j === i
                                ? m.kind === 'split'
                                    ? { ...m, label: text }
                                    : { ...m, note: text }
                                : m,
                        ),
                    )
                }
                readOnly={!isMod}
            />

            <div className={styles.actions}>
                <button
                    type="button"
                    className={`${styles.mark} ${styles.markStart}`}
                    disabled={!ready}
                    onClick={() => mark('start')}
                >
                    Set start <kbd>[</kbd>
                </button>
                <button
                    type="button"
                    className={`${styles.mark} ${styles.markEnd}`}
                    disabled={!ready}
                    onClick={() => mark('end')}
                >
                    Set end <kbd>]</kbd>
                </button>
                {isMod && (
                    <>
                        <span className={styles.divider} />
                        <button
                            type="button"
                            className={styles.quiet}
                            disabled={!ready}
                            onClick={() => mark('split')}
                        >
                            Add split
                        </button>
                        <button
                            type="button"
                            className={styles.quiet}
                            disabled={!ready}
                            onClick={() => mark('note')}
                        >
                            Add note
                        </button>
                        {initial.runnerMarkers?.length ? (
                            <button
                                type="button"
                                className={styles.quiet}
                                onClick={() =>
                                    update(
                                        initial.runnerMarkers!.reduce(
                                            (acc, m) => setMarker(acc, m),
                                            markers,
                                        ),
                                    )
                                }
                            >
                                Use runner's markers
                            </button>
                        ) : null}
                    </>
                )}
            </div>

            {isMod && (
                <div className={styles.splitNav}>
                    {splits.length > 0 ? (
                        <>
                            <button
                                type="button"
                                className={styles.quiet}
                                disabled={!canJumpSplits}
                                onClick={jumpPrevSplit}
                                title="Previous split (p)"
                            >
                                &lsaquo; Split
                            </button>
                            <button
                                type="button"
                                className={styles.quiet}
                                disabled={!canJumpSplits}
                                onClick={jumpNextSplit}
                                title="Next split (n)"
                            >
                                Split &rsaquo;
                            </button>
                            <select
                                aria-label="Jump to split"
                                disabled={!canJumpSplits}
                                value=""
                                onChange={(e) => {
                                    if (e.target.value !== '')
                                        jumpToSplitPos(Number(e.target.value));
                                }}
                            >
                                <option value="">Jump to split…</option>
                                {splits.map((s, i) => (
                                    <option key={s.index} value={i}>
                                        {i + 1}. {s.name} ·{' '}
                                        {formatMs(splitStartMs(splits, i))}
                                    </option>
                                ))}
                            </select>
                        </>
                    ) : (
                        <span className={styles.note}>
                            Splits not available for this run.
                        </span>
                    )}
                    {finishMs != null && (
                        <button
                            type="button"
                            className={styles.quiet}
                            disabled={!canJumpSplits}
                            onClick={jumpToFinish}
                            title="Skip to finish (e)"
                        >
                            Skip to finish
                        </button>
                    )}
                    {startFrame == null &&
                        (splits.length > 0 || finishMs != null) && (
                            <span className={styles.note}>
                                Set the start marker to enable jumps.
                            </span>
                        )}
                </div>
            )}

            {isMod && (
                <>
                    {hideActions ? null : (
                        <RetimeReadout
                            submittedMs={initial.realTimeMs}
                            retimedMs={retimed}
                            timing={initial.timing}
                        />
                    )}
                    {error && <p className="text-danger small mb-0">{error}</p>}
                    {hideActions ? null : (
                        <div className={styles.footer}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isPending || markers.length === 0}
                                onClick={() => save()}
                            >
                                {isPending ? 'Saving…' : 'Save markers'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                disabled={isPending || !canApply}
                                onClick={() => retimed != null && save(retimed)}
                            >
                                Apply retime
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
