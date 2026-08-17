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
