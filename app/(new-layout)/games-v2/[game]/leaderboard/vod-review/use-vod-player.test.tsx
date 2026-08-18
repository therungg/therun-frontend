// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerFactory } from './player/create-player';
import type { VodPlayer } from './player/types';
import { useVodPlayer } from './use-vod-player';

function fakePlayer(): VodPlayer & { time: number } {
    const p = {
        time: 0,
        ready: Promise.resolve(),
        supportsRate: true,
        seek: vi.fn((s: number) => {
            p.time = s;
        }),
        play: vi.fn(),
        pause: vi.fn(),
        getTime: () => p.time,
        setRate: vi.fn(),
        duration: () => 100,
        destroy: vi.fn(),
    };
    return p;
}

describe('useVodPlayer', () => {
    it('steps frames by seeking to the middle of the target frame', async () => {
        const player = fakePlayer();
        const factory: PlayerFactory = () => player;
        const { result } = renderHook(() =>
            useVodPlayer({
                url: 'https://youtu.be/dQw4w9WgXcQ',
                fps: 60,
                factory,
            }),
        );
        await act(async () => {
            await player.ready;
        });
        act(() => result.current.stepFrames(1));
        expect(player.seek).toHaveBeenLastCalledWith(1.5 / 60);
        expect(result.current.cursorFrame).toBe(1);
        act(() => result.current.stepFrames(-5));
        expect(result.current.cursorFrame).toBe(0);
    });
    it('keeps stepping forward when the player clock lags a seek behind (Twitch)', async () => {
        // Twitch's getCurrentTime() keeps reporting the PRE-seek time after a
        // paused seek. If stepFrames trusts that stale clock it re-computes the
        // same target every click and the video appears to skip randomly.
        const player = fakePlayer();
        let reported = 0;
        const seek = vi.fn((s: number) => {
            // The clock only catches up to the previous seek on the next call.
            reported = player.time;
            player.time = s;
        });
        player.seek = seek;
        player.getTime = () => reported;
        const { result } = renderHook(() =>
            useVodPlayer({
                url: 'https://twitch.tv/videos/1',
                fps: 60,
                factory: () => player,
            }),
        );
        await act(async () => {
            await player.ready;
        });
        // A BURST: three clicks before React re-renders, so every call sees
        // the same closed-over cursorFrame. That's what "3 quick clicks only
        // moved 1 step" is in the browser.
        act(() => {
            result.current.stepFrames(1);
            result.current.stepFrames(1);
            result.current.stepFrames(1);
        });
        // Three clicks must request three distinct, increasing frames — not
        // the same frame re-requested because the stale clock disagreed.
        const targetFrames = seek.mock.calls.map((c) => Math.floor(c[0] * 60));
        expect(targetFrames).toEqual([1, 2, 3]);
        expect(result.current.cursorFrame).toBe(3);
    });
    it('a burst of +1s clicks moves the full distance even with a live clock', async () => {
        // Same burst on a player whose clock updates instantly (YouTube).
        // Every click must still advance from the previous click's target.
        const player = fakePlayer();
        const { result } = renderHook(() =>
            useVodPlayer({
                url: 'https://youtu.be/dQw4w9WgXcQ',
                fps: 60,
                factory: () => player,
            }),
        );
        await act(async () => {
            await player.ready;
        });
        act(() => {
            result.current.stepSeconds(1);
            result.current.stepSeconds(1);
            result.current.stepSeconds(1);
        });
        expect(result.current.cursorFrame).toBe(180);
        expect(player.seek).toHaveBeenLastCalledWith(180.5 / 60);
    });
    it('still follows a scrub the user made inside the iframe', async () => {
        // The stale-clock guard must not make us ignore a real clock move: if
        // the user drags the player's own scrubber, the next step goes from
        // THERE, not from our (now outdated) cursor.
        const player = fakePlayer();
        const { result } = renderHook(() =>
            useVodPlayer({
                url: 'https://youtu.be/dQw4w9WgXcQ',
                fps: 60,
                factory: () => player,
            }),
        );
        await act(async () => {
            await player.ready;
        });
        act(() => result.current.stepFrames(1)); // cursor 1
        player.time = 10; // user scrubbed to 10s (frame 600) in the iframe
        act(() => result.current.stepFrames(1));
        expect(result.current.cursorFrame).toBe(601);
    });
    it('reads the frame from the player clock at the current fps', async () => {
        const player = fakePlayer();
        const { result, rerender } = renderHook(
            ({ fps }) =>
                useVodPlayer({
                    url: 'https://youtu.be/dQw4w9WgXcQ',
                    fps,
                    factory: () => player,
                }),
            { initialProps: { fps: 60 } },
        );
        await act(async () => {
            await player.ready;
        });
        player.time = 1.0;
        expect(result.current.currentFrameFromPlayer()).toBe(60);
        rerender({ fps: 30 });
        expect(result.current.currentFrameFromPlayer()).toBe(30);
    });
    it('reports unavailable for a non-embeddable url', () => {
        const { result } = renderHook(() =>
            useVodPlayer({
                url: 'https://example.com/x.mp4',
                fps: 60,
                factory: () => null,
            }),
        );
        expect(result.current.status).toBe('unavailable');
    });
});
