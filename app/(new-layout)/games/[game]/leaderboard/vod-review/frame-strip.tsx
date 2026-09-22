'use client';

import type { VodMarker } from '../../../../../../types/leaderboards.types';
import { formatFrameTime } from './retime';
import styles from './vod-review.module.scss';

/** Seconds shown either side of the playhead. */
const HALF_WINDOW_SECONDS = 2;

interface FrameStripProps {
    cursorFrame: number;
    fps: number;
    markers: VodMarker[];
    /** Start + the submitted time, when both are known. */
    expectedEndFrame: number | null;
    onSeek: (frame: number) => void;
}

/**
 * The few seconds around the playhead, one tick per frame. The whole-video
 * track under it cannot show a frame (on a 20-minute VOD one is a hundredth of
 * a pixel), so this is where stepping visibly moves something and where a
 * marker's exact frame can be read against the one on screen.
 */
export function FrameStrip({
    cursorFrame,
    fps,
    markers,
    expectedEndFrame,
    onSeek,
}: FrameStripProps) {
    const half = Math.max(1, Math.round(HALF_WINDOW_SECONDS * fps));
    const lo = cursorFrame - half;
    const width = half * 2 + 1;
    const pct = (frame: number) => ((frame - lo) / width) * 100;
    const frameWidth = `${100 / width}%`;
    const inView = (frame: number) => frame >= lo && frame < lo + width;

    const major = Math.max(1, Math.round(fps / 2));
    const mid = Math.max(1, Math.round(fps / 10));
    // Above ~90 fps single-frame ticks run together; the tenths are enough.
    const drawEveryFrame = fps <= 90;

    const ticks: { frame: number; kind: 'major' | 'mid' | 'minor' }[] = [];
    for (let f = Math.max(0, lo); f < lo + width; f++) {
        const kind =
            f % major === 0 ? 'major' : f % mid === 0 ? 'mid' : 'minor';
        if (kind === 'minor' && !drawEveryFrame) continue;
        ticks.push({ frame: f, kind });
    }

    const start = markers.find((m) => m.kind === 'start');
    const end = markers.find((m) => m.kind === 'end');

    const seekFromPointer = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width <= 0) return;
        onSeek(lo + Math.floor(((e.clientX - rect.left) / rect.width) * width));
    };

    return (
        <div className={styles.strip}>
            <div className={styles.stripHead}>
                <span className={styles.stripTitle}>
                    Frames around the playhead
                </span>
                <span>one tick is one frame</span>
            </div>
            <div className={styles.stripTrack}>
                <button
                    type="button"
                    className={styles.stripSeek}
                    aria-label="Seek to a frame near the playhead"
                    onClick={seekFromPointer}
                />
                {ticks.map((t) => (
                    <span
                        key={t.frame}
                        className={`${styles.stripTick} ${
                            t.kind === 'major'
                                ? styles.stripTickMajor
                                : t.kind === 'mid'
                                  ? styles.stripTickMid
                                  : ''
                        }`}
                        style={{ left: `${pct(t.frame + 0.5)}%` }}
                    />
                ))}
                {ticks
                    // A label at the very edge would be cut in half.
                    .filter((t) => {
                        const at = pct(t.frame + 0.5);
                        return t.kind === 'major' && at > 4 && at < 96;
                    })
                    .map((t) => (
                        <span
                            key={`label-${t.frame}`}
                            className={styles.stripLabel}
                            style={{ left: `${pct(t.frame + 0.5)}%` }}
                        >
                            {formatFrameTime(t.frame, fps)}
                        </span>
                    ))}
                {expectedEndFrame != null && inView(expectedEndFrame) && (
                    <span
                        className={styles.stripExpect}
                        style={{ left: `${pct(expectedEndFrame + 0.5)}%` }}
                        title="Where the submitted time says the run ends"
                    >
                        <span>expected end</span>
                    </span>
                )}
                {start && inView(start.frame) && (
                    <span
                        className={`${styles.stripFrame} ${styles.stripStart}`}
                        style={{
                            left: `${pct(start.frame)}%`,
                            width: frameWidth,
                        }}
                        title="Start"
                    />
                )}
                {end && inView(end.frame) && (
                    <span
                        className={`${styles.stripFrame} ${styles.stripEnd}`}
                        style={{
                            left: `${pct(end.frame)}%`,
                            width: frameWidth,
                        }}
                        title="End"
                    />
                )}
                <span
                    className={`${styles.stripFrame} ${styles.stripPlayhead}`}
                    style={{ left: `${pct(cursorFrame)}%`, width: frameWidth }}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
