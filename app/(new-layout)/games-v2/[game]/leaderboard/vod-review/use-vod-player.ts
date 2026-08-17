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

    const seekToFrame = useCallback((frame: number) => {
        const p = playerRef.current;
        if (!p) return;
        const dur = p.duration();
        const maxFrame =
            dur != null
                ? Math.max(0, Math.floor(dur * fpsRef.current) - 1)
                : Infinity;
        const target = Math.min(Math.max(0, Math.round(frame)), maxFrame);
        p.seek(secondsFromFrame(target, fpsRef.current));
        setPlaying(false);
        setCursorFrame(target);
        // One late sync: some players report the pre-seek time for a tick.
        window.setTimeout(() => setCursorFrame(target), 300);
    }, []);

    const stepFrames = useCallback(
        (delta: number) =>
            seekToFrame(
                currentFrameFromPlayer() === cursorFrame
                    ? cursorFrame + delta
                    : currentFrameFromPlayer() + delta,
            ),
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
            setCursorFrame(currentFrameFromPlayer());
        } else {
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
