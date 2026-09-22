'use client';

import {
    type RefObject,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
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
import { FrameStrip } from './frame-strip';
import { MarkerTimeline } from './marker-timeline';
import type { PlayerFactory } from './player/create-player';
import type { PlayheadStore } from './playhead-store';
import {
    formatMs,
    MAX_FPS,
    removeMarkerAt,
    retimeMs,
    setMarker,
} from './retime';
import { expectedEndFrame, RetimeResult, RetimeSteps } from './retime-steps';
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
 * What the step cards drive on the workbench, whether they sit inside it or
 * in a host's column beside it (the moderate panel's Retime form). Every one
 * hands the keyboard back to the workbench, so clicking a card never leaves
 * the frame keys dead.
 */
export interface VodReviewControls {
    seekToFrame: (frame: number) => void;
    mark: (kind: VodMarker['kind']) => void;
    /** Move a marker by some frames and show the frame it lands on. */
    nudgeMarker: (kind: 'start' | 'end', delta: number) => void;
    clearMarker: (kind: 'start' | 'end') => void;
    /** Seek to start + the submitted time. */
    jumpToExpectedEnd: () => void;
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
    /** The host renders the result and the step cards itself (the moderate
     *  panel's Retime form) and confirms the retime; hides them here, along
     *  with Save markers / Apply retime. */
    hideActions?: boolean;
    /** Filled with the player controls, for a host that renders the step cards. */
    controlsRef?: RefObject<VodReviewControls | null>;
    /** Fed the player's position, for a host that renders the step cards. */
    playheadStore?: PlayheadStore;
    /** Take the keyboard once the player is ready. */
    autoFocus?: boolean;
    playerFactory?: PlayerFactory;
}

/** An end at or before the start measures nothing, so it carries no time. */
function toPatch(fps: number, markers: VodMarker[]): VodReviewPatch {
    const r = retimeMs(markers, fps);
    return r === null || r <= 0
        ? { fps, markers }
        : { fps, markers, retimedMs: r };
}

const NO_KEYS = new Set(['INPUT', 'TEXTAREA', 'IFRAME']);

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
    playheadStore,
    autoFocus = false,
    playerFactory,
}: VodReviewWorkbenchProps) {
    const isMod = mode === 'mod';
    const [fps, setFps] = useState(initial.fps);
    const [fpsChoice, setFpsChoice] = useState<FpsChoice>(
        initial.fps === 60 ? '60' : initial.fps === 30 ? '30' : 'other',
    );
    // No start is assumed: a VOD almost never begins on the run's first frame.
    const [markers, setMarkers] = useState<VodMarker[]>(initial.markers);
    // Tracked for a future "unsaved changes" affordance; Save is gated on
    // having markers at all (see the controller ruling in the B5 brief),
    // not on this flag.
    const [_dirty, setDirty] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const player = useVodPlayer({ url, fps, factory: playerFactory });
    const ready = player.status === 'ready';
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        playheadStore?.set({ frame: player.cursorFrame, fps, ready });
    }, [playheadStore, player.cursorFrame, fps, ready]);
    // A host keeps its store across openings; a closed workbench is not ready.
    useEffect(
        () => () => playheadStore?.set({ frame: 0, fps: 60, ready: false }),
        [playheadStore],
    );

    // Whether the keys below reach us. Focus moves into the player's iframe on
    // any click inside the video, and the window only reports that as a blur.
    const [keysOn, setKeysOn] = useState(false);
    useEffect(() => {
        const check = () => {
            const root = rootRef.current;
            const el = document.activeElement;
            setKeysOn(
                !!root &&
                    !!el &&
                    document.hasFocus() &&
                    root.contains(el) &&
                    !NO_KEYS.has(el.tagName),
            );
        };
        // focusout fires before the next element has focus.
        const later = () => window.setTimeout(check, 0);
        check();
        document.addEventListener('focusin', check);
        document.addEventListener('focusout', later);
        window.addEventListener('blur', check);
        window.addEventListener('focus', check);
        return () => {
            document.removeEventListener('focusin', check);
            document.removeEventListener('focusout', later);
            window.removeEventListener('blur', check);
            window.removeEventListener('focus', check);
        };
    }, []);
    const takeKeys = useCallback(() => {
        rootRef.current?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        if (autoFocus && ready) takeKeys();
    }, [autoFocus, ready, takeKeys]);

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
            const frame = player.playheadFrame();
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
    const expectedEnd = expectedEndFrame(markers, fps, finishMs);
    const jumpToExpectedEnd = useCallback(() => {
        if (expectedEnd != null) player.seekToFrame(expectedEnd);
    }, [expectedEnd, player]);

    const controls = useMemo<VodReviewControls>(
        () => ({
            seekToFrame: (frame) => {
                player.seekToFrame(frame);
                takeKeys();
            },
            mark: (kind) => {
                mark(kind);
                takeKeys();
            },
            nudgeMarker: (kind, delta) => {
                const m = markers.find((x) => x.kind === kind);
                if (!m) return;
                const frame = Math.max(0, m.frame + delta);
                update(setMarker(markers, { ...m, frame }));
                player.seekToFrame(frame);
                takeKeys();
            },
            clearMarker: (kind) => {
                update(markers.filter((m) => m.kind !== kind));
                takeKeys();
            },
            jumpToExpectedEnd: () => {
                jumpToExpectedEnd();
                takeKeys();
            },
        }),
        [player, mark, markers, update, jumpToExpectedEnd, takeKeys],
    );
    useImperativeHandle(controlsRef, () => controls, [controls]);

    const retimed = useMemo(() => retimeMs(markers, fps), [markers, fps]);
    const canApply =
        isMod &&
        retimed != null &&
        retimed > 0 &&
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
            e: () => jumpToExpectedEnd(),
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
            ref={rootRef}
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
                    keysOn={keysOn}
                    onResumeKeys={takeKeys}
                />
                <FrameStrip
                    cursorFrame={player.cursorFrame}
                    fps={fps}
                    markers={markers}
                    expectedEndFrame={expectedEnd}
                    onSeek={player.seekToFrame}
                />
                <MarkerTimeline
                    markers={markers}
                    ghostMarkers={isMod ? initial.runnerMarkers : undefined}
                    fps={fps}
                    durationFrames={durationFrames}
                    cursorFrame={player.cursorFrame}
                    expectedEndFrame={expectedEnd}
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
                {isMod && (
                    <div className={styles.nav}>
                        {splits.length > 0 ? (
                            <>
                                <span className={styles.navLabel}>Splits</span>
                                <button
                                    type="button"
                                    className={styles.navStep}
                                    disabled={!canJumpSplits}
                                    onClick={jumpPrevSplit}
                                    aria-label="Previous split"
                                    title="Previous split (p)"
                                >
                                    &lsaquo;
                                </button>
                                <select
                                    className={styles.navSelect}
                                    aria-label="Jump to split"
                                    disabled={!canJumpSplits}
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value !== '')
                                            jumpToSplitPos(
                                                Number(e.target.value),
                                            );
                                    }}
                                >
                                    <option value="">
                                        {startFrame == null
                                            ? 'Mark the start to jump to splits'
                                            : 'Jump to split…'}
                                    </option>
                                    {splits.map((s, i) => (
                                        <option key={s.index} value={i}>
                                            {i + 1}. {s.name} ·{' '}
                                            {formatMs(splitStartMs(splits, i))}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className={styles.navStep}
                                    disabled={!canJumpSplits}
                                    onClick={jumpNextSplit}
                                    aria-label="Next split"
                                    title="Next split (n)"
                                >
                                    &rsaquo;
                                </button>
                            </>
                        ) : (
                            <span className={styles.note}>
                                No splits for this run.
                            </span>
                        )}
                        <span className={styles.grow} />
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
                        <button
                            type="button"
                            className={styles.quiet}
                            disabled={!ready}
                            onClick={() => controls.mark('note')}
                        >
                            Add note <kbd className={styles.cardKey}>m</kbd>
                        </button>
                        <button
                            type="button"
                            className={styles.quiet}
                            disabled={!ready}
                            onClick={() => controls.mark('split')}
                        >
                            Add split
                        </button>
                    </div>
                )}
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

            {hideActions ? null : (
                <div className={styles.stepsArea}>
                    <RetimeResult
                        markers={markers}
                        fps={fps}
                        playhead={{ frame: player.cursorFrame, fps, ready }}
                        submittedMs={finishMs}
                    />
                    <RetimeSteps
                        markers={markers}
                        fps={fps}
                        playhead={{ frame: player.cursorFrame, fps, ready }}
                        submittedMs={finishMs}
                        controls={() => controls}
                        busy={isPending}
                        layout="row"
                    />
                </div>
            )}

            {isMod && error && (
                <p className="text-danger small mb-0">{error}</p>
            )}
            {isMod && !hideActions && (
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
        </div>
    );
}
