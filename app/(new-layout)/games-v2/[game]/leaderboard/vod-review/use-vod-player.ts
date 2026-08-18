'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createVodPlayer, type PlayerFactory } from './player/create-player';
import type { PlaybackRate, VodPlayer } from './player/types';
import { frameFromSeconds, secondsFromFrame } from './retime';

export type VodPlayerStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export function useVodPlayer({
    url,
    fps,
    factory = createVodPlayer,
}: {
    url: string;
    fps: number;
    factory?: PlayerFactory;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<VodPlayer | null>(null);
    const [status, setStatus] = useState<VodPlayerStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [supportsRate, setSupportsRate] = useState(true);
    const [cursorFrame, setCursorFrame] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [rate, setRateState] = useState<PlaybackRate>(1);
    // fps in a ref so the poll reads the current value without re-arming.
    const fpsRef = useRef(fps);
    fpsRef.current = fps;
    // factory in a ref: callers often pass an inline function, and depending on
    // its identity would remount the player (and re-trigger the effect) on every render.
    const factoryRef = useRef(factory);
    factoryRef.current = factory;
    // Frames we've recently seeked to (plus the pre-seek clock). Twitch keeps
    // reporting an OLD position for a while after a paused seek — it walks one
    // or more steps behind us. If stepFrames trusted that stale clock, a burst
    // of clicks would re-request already-visited frames and "3 clicks moves 2".
    // A clock reading that matches something in this history is lag: step from
    // cursorFrame. A reading that matches nothing here is a real move (playback,
    // an in-iframe scrub) and is trusted. Cleared when playback starts.
    const recentSeeksRef = useRef<Set<number>>(new Set());
    // The frame we most recently sent the player to. cursorFrame (state) is
    // what's on screen, but it's stale inside a burst of clicks that all land
    // before React re-renders — every click would step from the same value and
    // three clicks would move one step. This ref updates synchronously.
    const lastTargetRef = useRef<number | null>(null);

    // Mount / remount the player when the url changes.
    useEffect(() => {
        const el = containerRef.current ?? document.createElement('div');
        const player = factoryRef.current(el, url);
        if (!player) {
            setStatus('unavailable');
            return;
        }
        playerRef.current = player;
        setSupportsRate(player.supportsRate);
        setStatus('loading');
        let cancelled = false;
        player.ready
            .then(() => {
                if (!cancelled) setStatus('ready');
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setStatus('error');
                setError(
                    e instanceof Error
                        ? e.message
                        : 'The player failed to load.',
                );
            });
        return () => {
            cancelled = true;
            player.destroy();
            playerRef.current = null;
        };
    }, [url]);

    const currentFrameFromPlayer = useCallback(
        () =>
            frameFromSeconds(playerRef.current?.getTime() ?? 0, fpsRef.current),
        [],
    );

    // Re-derive the cursor when fps changes (frames don't scale, the clock does).
    useEffect(() => {
        if (status === 'ready') setCursorFrame(currentFrameFromPlayer());
    }, [fps, status, currentFrameFromPlayer]);

    // While playing, follow the player clock so the readout stays honest.
    useEffect(() => {
        if (!playing || status !== 'ready') return;
        const id = window.setInterval(
            () => setCursorFrame(currentFrameFromPlayer()),
            250,
        );
        return () => window.clearInterval(id);
    }, [playing, status, currentFrameFromPlayer]);

    const seekToFrame = useCallback(
        (frame: number) => {
            const p = playerRef.current;
            if (!p) return;
            const dur = p.duration();
            const maxFrame =
                dur != null
                    ? Math.max(0, Math.floor(dur * fpsRef.current) - 1)
                    : Infinity;
            const target = Math.min(Math.max(0, Math.round(frame)), maxFrame);
            // Remember where the clock was and where we're sending it: a lagging
            // player will keep reporting one of these, and stepFrames must not
            // step from them. Bounded so an old scrub can't be mistaken for lag.
            const recent = recentSeeksRef.current;
            recent.add(currentFrameFromPlayer());
            recent.add(target);
            if (recent.size > 32) {
                const [oldest] = recent;
                recent.delete(oldest);
            }
            p.seek(secondsFromFrame(target, fpsRef.current));
            lastTargetRef.current = target;
            setPlaying(false);
            setCursorFrame(target);
            // One late sync: some players report the pre-seek time for a tick.
            window.setTimeout(() => setCursorFrame(target), 300);
        },
        [currentFrameFromPlayer],
    );

    const stepFrames = useCallback(
        (delta: number) => {
            const clock = currentFrameFromPlayer();
            // Where we last sent the player (synchronous, burst-safe); the
            // rendered cursor is only the fallback before any seek.
            const ours = lastTargetRef.current ?? cursorFrame;
            // Trust the clock only when it's on a frame we did NOT put it on
            // (playback ran, or the user scrubbed inside the iframe). A clock
            // sitting on `ours` or any recent seek position is just lagging.
            const clockIsReal =
                clock !== ours && !recentSeeksRef.current.has(clock);
            seekToFrame((clockIsReal ? clock : ours) + delta);
        },
        [cursorFrame, currentFrameFromPlayer, seekToFrame],
    );
    const stepSeconds = useCallback(
        (delta: number) => stepFrames(Math.round(delta * fpsRef.current)),
        [stepFrames],
    );

    const togglePlay = useCallback(() => {
        const p = playerRef.current;
        if (!p) return;
        if (playing) {
            p.pause();
            setPlaying(false);
            const here = currentFrameFromPlayer();
            setCursorFrame(here);
            lastTargetRef.current = here;
        } else {
            // Playback makes the clock live again.
            recentSeeksRef.current.clear();
            lastTargetRef.current = null;
            p.play();
            setPlaying(true);
        }
    }, [playing, currentFrameFromPlayer]);

    const setRate = useCallback((r: PlaybackRate) => {
        playerRef.current?.setRate(r);
        setRateState(r);
    }, []);

    return {
        containerRef,
        status,
        error,
        supportsRate,
        cursorFrame,
        stepFrames,
        stepSeconds,
        seekToFrame,
        togglePlay,
        playing,
        setRate,
        rate,
        currentFrameFromPlayer,
    };
}
