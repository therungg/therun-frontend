'use client';

import { useRef, useState } from 'react';
import { Gear, PauseFill, PlayFill } from 'react-bootstrap-icons';
import { PopoverLayer } from '../../shared/popover-layer';
import { PLAYBACK_RATES, type PlaybackRate } from './player/types';
import { FPS_PRESETS, formatFrameTime, MAX_FPS } from './retime';
import styles from './vod-review.module.scss';

export type FpsChoice = '60' | '30' | 'other';

interface TransportBarProps {
    ready: boolean;
    playing: boolean;
    onTogglePlay: () => void;
    onStepFrames: (delta: number) => void;
    onStepSeconds: (delta: number) => void;
    cursorFrame: number;
    fps: number;
    fpsChoice: FpsChoice;
    onFpsChange: (choice: FpsChoice, value?: number) => void;
    rate: PlaybackRate;
    onRateChange: (rate: PlaybackRate) => void;
    supportsRate: boolean;
    /** Splits, notes and the split jumps are moderator-only, and so are their keys. */
    isMod: boolean;
    /** Whether the workbench has the keyboard. A click into the video hands
     *  it to the player's iframe, where none of these keys reach us. */
    keysOn: boolean;
    onResumeKeys: () => void;
}

const STEPS = [
    { label: '−1s', title: 'Back 1 second', seconds: -1 },
    { label: '−10f', title: 'Back 10 frames (<)', frames: -10 },
    { label: '−1f', title: 'Back 1 frame (,)', frames: -1 },
] as const;

const STEPS_FORWARD = [
    { label: '+1f', title: 'Forward 1 frame (.)', frames: 1 },
    { label: '+10f', title: 'Forward 10 frames (>)', frames: 10 },
    { label: '+1s', title: 'Forward 1 second', seconds: 1 },
] as const;

const KEYS: [string, string][] = [
    ['space', 'Play or pause'],
    [', .', 'Step one frame'],
    ['< >', 'Step ten frames'],
    ['[', 'Mark start'],
    [']', 'Mark end'],
    ['e', 'Jump to expected end'],
];

const MOD_KEYS: [string, string][] = [
    ['m', 'Add note'],
    ['p n', 'Previous or next split'],
];

/**
 * The player's own controls, welded to the bottom edge of the video: one
 * segmented step group, the frame the player is parked on, and a settings
 * popover for the things you set once per video (frame rate, speed) plus the
 * key map. Frame rate and speed used to sit inline, where they read as
 * per-action controls with the same weight as stepping.
 */
export function TransportBar({
    ready,
    playing,
    onTogglePlay,
    onStepFrames,
    onStepSeconds,
    cursorFrame,
    fps,
    fpsChoice,
    onFpsChange,
    rate,
    onRateChange,
    supportsRate,
    isMod,
    keysOn,
    onResumeKeys,
}: TransportBarProps) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const gearRef = useRef<HTMLButtonElement>(null);

    return (
        <div className={styles.transport}>
            <div className={styles.steps} role="group" aria-label="Step">
                {STEPS.map((s) => (
                    <button
                        key={s.label}
                        type="button"
                        className={styles.step}
                        disabled={!ready}
                        title={s.title}
                        onClick={() =>
                            'frames' in s
                                ? onStepFrames(s.frames)
                                : onStepSeconds(s.seconds)
                        }
                    >
                        {s.label}
                    </button>
                ))}
                <button
                    type="button"
                    className={`${styles.step} ${styles.stepPlay}`}
                    disabled={!ready}
                    aria-label={playing ? 'Pause' : 'Play'}
                    onClick={onTogglePlay}
                >
                    {playing ? <PauseFill /> : <PlayFill />}
                </button>
                {STEPS_FORWARD.map((s) => (
                    <button
                        key={s.label}
                        type="button"
                        className={styles.step}
                        disabled={!ready}
                        title={s.title}
                        onClick={() =>
                            'frames' in s
                                ? onStepFrames(s.frames)
                                : onStepSeconds(s.seconds)
                        }
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            <span className={styles.clock}>
                <span className={styles.clockTime}>
                    {formatFrameTime(cursorFrame, fps)}
                </span>
                <span className={styles.clockFrame}>frame {cursorFrame}</span>
            </span>

            <span className={styles.grow} />

            {/* One button in both states: swapping elements would unmount it
                mid-click, since pressing it hands it focus and turns keys on. */}
            {ready && (
                <button
                    type="button"
                    className={keysOn ? styles.keysOn : styles.keysOff}
                    onClick={onResumeKeys}
                    title={
                        keysOn
                            ? 'The frame keys work while this panel has focus.'
                            : 'The video has the keyboard. Click to use the frame keys again.'
                    }
                >
                    {keysOn ? 'Keys on' : 'Keys paused'}
                </button>
            )}

            <button
                ref={gearRef}
                type="button"
                className={styles.gear}
                aria-label="Player settings"
                aria-expanded={settingsOpen}
                onClick={() => setSettingsOpen((o) => !o)}
            >
                <Gear />
                <span className={styles.gearFps}>{fps} fps</span>
            </button>

            <PopoverLayer
                open={settingsOpen}
                anchorRef={gearRef}
                onClose={() => setSettingsOpen(false)}
                align="end"
                side="top"
                themed
            >
                <div
                    className={styles.settings}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.stopPropagation();
                            setSettingsOpen(false);
                            gearRef.current?.focus();
                        }
                    }}
                >
                    <div className={styles.settingsGroup}>
                        <span className={styles.settingsLabel}>Frame rate</span>
                        <div className={styles.settingsRow}>
                            {FPS_PRESETS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    className={`${styles.choice} ${
                                        fpsChoice === String(p)
                                            ? styles.choiceOn
                                            : ''
                                    }`}
                                    onClick={() =>
                                        onFpsChange(String(p) as '60' | '30')
                                    }
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                type="button"
                                className={`${styles.choice} ${
                                    fpsChoice === 'other' ? styles.choiceOn : ''
                                }`}
                                onClick={() => onFpsChange('other', fps)}
                            >
                                Other
                            </button>
                            {fpsChoice === 'other' && (
                                <input
                                    type="number"
                                    className={styles.fpsInput}
                                    aria-label="Frames per second"
                                    min={1}
                                    max={MAX_FPS}
                                    step="any"
                                    value={fps}
                                    onChange={(e) =>
                                        onFpsChange(
                                            'other',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            )}
                        </div>
                    </div>

                    {supportsRate && (
                        <div className={styles.settingsGroup}>
                            <span className={styles.settingsLabel}>Speed</span>
                            <div className={styles.settingsRow}>
                                {PLAYBACK_RATES.map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        className={`${styles.choice} ${
                                            rate === r ? styles.choiceOn : ''
                                        }`}
                                        disabled={!ready}
                                        onClick={() => onRateChange(r)}
                                    >
                                        {r}×
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={styles.settingsGroup}>
                        <span className={styles.settingsLabel}>Keys</span>
                        <dl className={styles.keys}>
                            {(isMod ? [...KEYS, ...MOD_KEYS] : KEYS).map(
                                ([key, what]) => (
                                    <div key={key} className={styles.keyRow}>
                                        <dt>
                                            {key.split(' ').map((k) => (
                                                <kbd key={k}>{k}</kbd>
                                            ))}
                                        </dt>
                                        <dd>{what}</dd>
                                    </div>
                                ),
                            )}
                        </dl>
                        <p className={styles.settingsNote}>
                            Frames keep their numbers when the frame rate
                            changes. Inside the video, YouTube's own , and .
                            step a frame too. Marking reads the player's clock
                            either way, once it has caught up with a step.
                        </p>
                    </div>
                </div>
            </PopoverLayer>
        </div>
    );
}
