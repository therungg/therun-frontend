'use client';

import {
    useCallback,
    useEffect,
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
import { MarkerRail } from './marker-rail';
import type { PlayerFactory } from './player/create-player';
import { PLAYBACK_RATES, type PlaybackRate } from './player/types';
import {
    FPS_PRESETS,
    formatDeltaMs,
    formatFrameTime,
    formatMs,
    MAX_FPS,
    removeMarkerAt,
    retimeMs,
    setMarker,
} from './retime';
import {
    nextSplitPos,
    prevSplitPos,
    splitTargetFrame,
    startFrameOf,
} from './split-nav';
import { useVodPlayer } from './use-vod-player';
import styles from './vod-review.module.scss';

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
    playerFactory?: PlayerFactory;
}

function toPatch(fps: number, markers: VodMarker[]): VodReviewPatch {
    const r = retimeMs(markers, fps);
    return r === null ? { fps, markers } : { fps, markers, retimedMs: r };
}

export function VodReviewWorkbench({
    mode,
    url,
    target,
    gameSlug,
    initial,
    onChange,
    onSaved,
    playerFactory,
}: VodReviewWorkbenchProps) {
    const isMod = mode === 'mod';
    const [fps, setFps] = useState(initial.fps);
    const [fpsChoice, setFpsChoice] = useState<'60' | '30' | 'other'>(
        initial.fps === 60 ? '60' : initial.fps === 30 ? '30' : 'other',
    );
    const [markers, setMarkers] = useState<VodMarker[]>(initial.markers);
    // Tracked for a future "unsaved changes" affordance; Save is gated on
    // having markers at all (see the controller ruling in the B5 brief),
    // not on this flag.
    const [_dirty, setDirty] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const player = useVodPlayer({ url, fps, factory: playerFactory });
    const ready = player.status === 'ready';

    // Runner mode streams every change up to the form.
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

    // Split jumps: anchor the run's known cumulative split times onto the
    // VOD's frame timeline, using the `start` marker as frame 0 of the run.
    const splits = useMemo(() => initial.splits ?? [], [initial.splits]);
    const startFrame = useMemo(() => startFrameOf(markers), [markers]);
    const finishMs = initial.realTimeMs;
    const canJumpSplits = ready && startFrame != null;

    const jumpToSplitPos = useCallback(
        (pos: number) => {
            if (startFrame == null) return;
            player.seekToFrame(
                splitTargetFrame(startFrame, splits[pos].splitTimeMs, fps),
            );
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

    const retimed = useMemo(() => retimeMs(markers, fps), [markers, fps]);
    const delta =
        retimed != null && initial.realTimeMs != null
            ? retimed - initial.realTimeMs
            : null;
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

    const changeFps = (choice: '60' | '30' | 'other', value?: number) => {
        setFpsChoice(choice);
        const next = choice === 'other' ? (value ?? fps) : Number(choice);
        if (next > 0 && next <= MAX_FPS) {
            setFps(next);
            if (markers.length) setDirty(true);
        }
    };

    return (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the workbench is a keyboard surface
        <div
            className={styles.workbench}
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-label="VOD review"
        >
            <div className={styles.playerBox}>
                <div ref={player.containerRef} className={styles.player} />
                {player.status === 'unavailable' && (
                    <p className={styles.note}>
                        This link can't be frame-stepped here (only YouTube and
                        Twitch VODs can).
                    </p>
                )}
                {player.status === 'error' && (
                    <p className={styles.note}>{player.error}</p>
                )}
            </div>

            <div className={styles.transport}>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => player.stepSeconds(-1)}
                    title="Back 1 second"
                >
                    −1s
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => player.stepFrames(-10)}
                    title="Back 10 frames (<)"
                >
                    −10f
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => player.stepFrames(-1)}
                    title="Back 1 frame (,)"
                >
                    −1f
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={player.togglePlay}
                    aria-label={player.playing ? 'Pause' : 'Play'}
                >
                    {player.playing ? '⏸' : '▶'}
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => player.stepFrames(1)}
                    title="Forward 1 frame (.)"
                >
                    +1f
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => player.stepFrames(10)}
                    title="Forward 10 frames (>)"
                >
                    +10f
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => player.stepSeconds(1)}
                    title="Forward 1 second"
                >
                    +1s
                </button>
                {player.supportsRate && (
                    <select
                        aria-label="Playback speed"
                        value={player.rate}
                        disabled={!ready}
                        onChange={(e) =>
                            player.setRate(
                                Number(e.target.value) as PlaybackRate,
                            )
                        }
                    >
                        {PLAYBACK_RATES.map((r) => (
                            <option key={r} value={r}>
                                {r}×
                            </option>
                        ))}
                    </select>
                )}
                <span className={styles.fps}>
                    <span className={styles.fpsLabel}>fps</span>
                    {FPS_PRESETS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            className={fpsChoice === String(p) ? styles.on : ''}
                            onClick={() => changeFps(String(p) as '60' | '30')}
                        >
                            {p}
                        </button>
                    ))}
                    <button
                        type="button"
                        className={fpsChoice === 'other' ? styles.on : ''}
                        onClick={() => changeFps('other', fps)}
                    >
                        Other
                    </button>
                    {fpsChoice === 'other' && (
                        <input
                            type="number"
                            aria-label="Frames per second"
                            min={1}
                            max={MAX_FPS}
                            step="any"
                            value={fps}
                            onChange={(e) =>
                                changeFps('other', Number(e.target.value))
                            }
                        />
                    )}
                </span>
                <span className={styles.cursor} aria-live="polite">
                    frame {player.cursorFrame} ·{' '}
                    {formatFrameTime(player.cursorFrame, fps)}
                </span>
            </div>

            {isMod && (
                <div className={styles.splitNav}>
                    <span className={styles.splitNavLabel}>Splits</span>
                    {splits.length > 0 ? (
                        <>
                            <button
                                type="button"
                                disabled={!canJumpSplits}
                                onClick={jumpPrevSplit}
                                title="Previous split (p)"
                            >
                                ‹ Split
                            </button>
                            <button
                                type="button"
                                disabled={!canJumpSplits}
                                onClick={jumpNextSplit}
                                title="Next split (n)"
                            >
                                Split ›
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
                                        {formatMs(s.splitTimeMs)}
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

            <div className={styles.markButtons}>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => mark('start')}
                >
                    Set start <kbd>[</kbd>
                </button>
                <button
                    type="button"
                    disabled={!ready}
                    onClick={() => mark('end')}
                >
                    Set end <kbd>]</kbd>
                </button>
                {isMod && (
                    <button
                        type="button"
                        disabled={!ready}
                        onClick={() => mark('split')}
                    >
                        Add split
                    </button>
                )}
                {isMod && (
                    <button
                        type="button"
                        disabled={!ready}
                        onClick={() => mark('note')}
                    >
                        Add note <kbd>m</kbd>
                    </button>
                )}
                {isMod && initial.runnerMarkers?.length ? (
                    <button
                        type="button"
                        className={styles.secondary}
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
            </div>

            <MarkerRail
                markers={markers}
                ghostMarkers={isMod ? initial.runnerMarkers : undefined}
                fps={fps}
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
                <>
                    <p className={styles.retimeLine}>
                        {initial.realTimeMs != null ? (
                            <>submitted {formatMs(initial.realTimeMs)} · </>
                        ) : (
                            <>
                                submitted time is{' '}
                                {initial.timing === 'gametime'
                                    ? 'game time'
                                    : 'unknown'}{' '}
                                ·{' '}
                            </>
                        )}
                        {retimed != null ? (
                            <>
                                retimed {formatMs(retimed)}
                                {delta != null && (
                                    <> ({formatDeltaMs(delta)})</>
                                )}
                            </>
                        ) : (
                            <>retimed —</>
                        )}
                        {initial.timing === 'gametime' && (
                            <span className={styles.note}>
                                {' '}
                                Retime is real time; it can't replace a
                                game-time entry.
                            </span>
                        )}
                    </p>
                    <p className={styles.hint}>
                        Frames keep their numbers when fps changes. Inside the
                        video, YouTube's own , and . also step a frame — Set
                        start/end read the player's clock either way.
                    </p>
                    {error && <p className="text-danger small mb-0">{error}</p>}
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
                </>
            )}
        </div>
    );
}
