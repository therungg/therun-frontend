import type {
    RunSplit,
    VodMarker,
} from '../../../../../../types/leaderboards.types';

/**
 * Anchor the run's known split times onto the VOD's frame timeline.
 *
 * A segment's video frame = the run's start frame + the cumulative real time
 * it began at, which is the split before it (the run start, for the first).
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
 * When a segment *begins*, in cumulative run time. A split's own time is when
 * it ended, so a segment starts on the split before it — and the first one
 * starts with the run. Jumps go here: picking "Kamino" should open on Kamino,
 * not on the moment it was already over.
 */
export function splitStartMs(splits: RunSplit[], pos: number): number {
    return pos <= 0 ? 0 : (splits[pos - 1]?.splitTimeMs ?? 0);
}

/** Video frame where a segment begins. */
export function splitStartFrame(
    splits: RunSplit[],
    pos: number,
    startFrame: number,
    fps: number,
): number {
    return splitTargetFrame(startFrame, splitStartMs(splits, pos), fps);
}

/**
 * Array position of the first segment starting strictly after the cursor, or
 * null when the cursor is inside the last one.
 */
export function nextSplitPos(
    splits: RunSplit[],
    startFrame: number,
    fps: number,
    cursorFrame: number,
): number | null {
    for (let i = 0; i < splits.length; i++) {
        if (splitStartFrame(splits, i, startFrame, fps) > cursorFrame) return i;
    }
    return null;
}

/**
 * Array position of the last segment starting strictly before the cursor, or
 * null when the cursor is at/before the run start.
 */
export function prevSplitPos(
    splits: RunSplit[],
    startFrame: number,
    fps: number,
    cursorFrame: number,
): number | null {
    for (let i = splits.length - 1; i >= 0; i--) {
        if (splitStartFrame(splits, i, startFrame, fps) < cursorFrame) return i;
    }
    return null;
}
