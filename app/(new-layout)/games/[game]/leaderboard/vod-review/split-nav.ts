import type {
    RunSplit,
    VodMarker,
} from '../../../../../../types/leaderboards.types';

/**
 * Anchor the run's known split times onto the VOD's frame timeline.
 *
 * A split's video frame = the run's start frame + its cumulative real time.
 * Real time only: the VOD is real footage, so game-time (load-removed) splits
 * do not map to frames. Everything here needs a `start` marker — without it
 * there is no anchor and the split-jump controls stay disabled.
 */

/** The `start` marker's frame, or null when the run start isn't pinned yet. */
export function startFrameOf(markers: VodMarker[]): number | null {
    const s = markers.find((m) => m.kind === 'start');
    return s ? s.frame : null;
}

/** Video frame where a cumulative split time lands. */
export function splitTargetFrame(
    startFrame: number,
    splitTimeMs: number,
    fps: number,
): number {
    return startFrame + Math.round((splitTimeMs / 1000) * fps);
}

/**
 * Array position of the first split whose frame is strictly after the cursor,
 * or null when the cursor is at/after the last split.
 */
export function nextSplitPos(
    splits: RunSplit[],
    startFrame: number,
    fps: number,
    cursorFrame: number,
): number | null {
    for (let i = 0; i < splits.length; i++) {
        if (
            splitTargetFrame(startFrame, splits[i].splitTimeMs, fps) >
            cursorFrame
        )
            return i;
    }
    return null;
}

/**
 * Array position of the last split whose frame is strictly before the cursor,
 * or null when the cursor is at/before the first split.
 */
export function prevSplitPos(
    splits: RunSplit[],
    startFrame: number,
    fps: number,
    cursorFrame: number,
): number | null {
    for (let i = splits.length - 1; i >= 0; i--) {
        if (
            splitTargetFrame(startFrame, splits[i].splitTimeMs, fps) <
            cursorFrame
        )
            return i;
    }
    return null;
}
