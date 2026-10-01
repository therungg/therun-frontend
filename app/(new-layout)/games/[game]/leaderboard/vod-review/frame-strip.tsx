'use client';

import { useRef, useState } from 'react';
import type { VodMarker } from '../../../../../../types/leaderboards.types';
import { formatFrameTime } from './retime';
import { useScrubSeek } from './use-scrub-seek';
import styles from './vod-review.module.scss';

/** Seconds shown either side of the playhead. */
const HALF_WINDOW_SECONDS = 2;

/** How far the pointer moves before a press on the strip is a drag. */
const DRAG_SLOP_PX = 4;

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
    // The strip is a film strip under the playhead: dragging pulls it along,
    // so moving left brings later frames under the playhead. While dragging
    // it shows the frame being pulled to, not the player's lagging clock.
    const [dragFrame, setDragFrame] = useState<number | null>(null);
    const drag = useRef<{
        startX: number;
        startFrame: number;
        frameWidthPx: number;
        clickFrame: number;
        moved: boolean;
    } | null>(null);
    const scrub = useScrubSeek(onSeek);
    const shownFrame = dragFrame ?? cursorFrame;

    const half = Math.max(1, Math.round(HALF_WINDOW_SECONDS * fps));
    const lo = shownFrame - half;
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

    const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width <= 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = {
            startX: e.clientX,
            startFrame: cursorFrame,
            frameWidthPx: rect.width / width,
            clickFrame:
                lo + Math.floor(((e.clientX - rect.left) / rect.width) * width),
            moved: false,
        };
    };

    const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        if (!d.moved && Math.abs(dx) < DRAG_SLOP_PX) return;
        d.moved = true;
        const frame = Math.max(
            0,
            d.startFrame - Math.round(dx / d.frameWidthPx),
        );
        setDragFrame(frame);
        scrub.push(frame);
    };

    const stopDrag = () => {
        drag.current = null;
        setDragFrame(null);
        scrub.cancel();
    };

    // A press that never moved is a click: seek to the frame under it.
    const onPointerUp = () => {
        const d = drag.current;
        if (!d) return;
        const frame = d.moved ? (dragFrame ?? d.startFrame) : d.clickFrame;
        stopDrag();
        scrub.settle(frame);
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
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={stopDrag}
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
                    style={{ left: `${pct(shownFrame)}%`, width: frameWidth }}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
