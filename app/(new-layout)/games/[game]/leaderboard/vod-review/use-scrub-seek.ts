'use client';

import { useEffect, useRef } from 'react';

/** Gap between seeks sent to the player while scrubbing. */
const SCRUB_SEEK_MS = 120;

/**
 * Seeks for a drag. Embedded players take each seek as a message to an
 * iframe and fall behind if sent one per pointer move, so seeks are spaced
 * out and the last one waiting always goes. `settle` sends the final frame
 * straight away when the drag ends; `cancel` drops whatever is waiting.
 */
export function useScrubSeek(onSeek: (frame: number) => void) {
    const state = useRef({
        frame: 0,
        lastAt: 0,
        timer: undefined as number | undefined,
    });
    useEffect(() => () => window.clearTimeout(state.current.timer), []);

    const cancel = () => {
        window.clearTimeout(state.current.timer);
        state.current.timer = undefined;
    };

    const push = (frame: number) => {
        const s = state.current;
        s.frame = frame;
        if (s.timer !== undefined) return;
        const seek = () => {
            s.timer = undefined;
            s.lastAt = performance.now();
            onSeek(s.frame);
        };
        const wait = s.lastAt + SCRUB_SEEK_MS - performance.now();
        if (wait <= 0) seek();
        else s.timer = window.setTimeout(seek, wait);
    };

    const settle = (frame: number) => {
        cancel();
        state.current.lastAt = 0;
        onSeek(frame);
    };

    return { push, settle, cancel };
}
