// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTwitchPlayer } from './twitch';

describe('createTwitchPlayer', () => {
    let originalTwitch: (typeof window)['Twitch'];

    beforeEach(() => {
        originalTwitch = window.Twitch;
    });
    afterEach(() => {
        window.Twitch = originalTwitch;
    });

    it('does not build an orphan player when destroyed before the embed loads', async () => {
        // React StrictMode mounts → cleans up → mounts. Player construction is
        // async (the embed script loads first), so the first mount's destroy()
        // ran while `player` was still null and destroyed nothing. Without a
        // guard, its late `.then` still built a Twitch.Player into the live
        // container — an orphan iframe nobody controlled, sitting on top of the
        // real one. Seeks went to the hidden player; the visible video never
        // moved.
        const constructed: HTMLElement[] = [];
        const Player = vi.fn(function (this: unknown, el: HTMLElement) {
            constructed.push(el);
            return {
                seek: vi.fn(),
                play: vi.fn(),
                pause: vi.fn(),
                getCurrentTime: () => 0,
                getDuration: () => 100,
                addEventListener: vi.fn(),
                destroy: vi.fn(),
            };
        }) as unknown as { (): unknown; READY: string };
        Player.READY = 'ready';
        // biome-ignore lint/suspicious/noExplicitAny: minimal mock of the Twitch namespace
        window.Twitch = { Player } as any;

        const el = document.createElement('div');
        // Mount 1, then StrictMode cleanup before the async construction runs.
        const first = createTwitchPlayer(el, '1');
        first.destroy();
        // Mount 2.
        createTwitchPlayer(el, '1');
        // Let both async constructions get their turn.
        await new Promise((r) => setTimeout(r, 0));

        expect(constructed).toHaveLength(1);
    });

    it('pins the source quality so frame steps match the broadcast', async () => {
        // Twitch's auto quality can drop to a 30 fps transcode; stepping a 60 fps
        // grid then shows every picture twice. Qualities only fill in once the
        // video loads, so the pin is (re)applied on READY and on PLAYING.
        const listeners: Record<string, () => void> = {};
        let qualities: { name: string; group: string }[] = [];
        const setQuality = vi.fn();
        const Player = vi.fn(function (this: unknown) {
            return {
                seek: vi.fn(),
                play: vi.fn(),
                pause: vi.fn(),
                getCurrentTime: () => 0,
                getDuration: () => 100,
                getQualities: () => qualities,
                setQuality,
                addEventListener: (event: string, cb: () => void) => {
                    listeners[event] = cb;
                },
                destroy: vi.fn(),
            };
        }) as unknown as { (): unknown; READY: string; PLAYING: string };
        Player.READY = 'ready';
        Player.PLAYING = 'playing';
        // biome-ignore lint/suspicious/noExplicitAny: minimal mock of the Twitch namespace
        window.Twitch = { Player } as any;

        const player = createTwitchPlayer(document.createElement('div'), '1');
        await new Promise((r) => setTimeout(r, 0));
        // No qualities yet: nothing to pin.
        listeners.ready();
        await player.ready;
        expect(setQuality).not.toHaveBeenCalled();

        qualities = [
            { name: 'Auto', group: 'auto' },
            { name: '1080p60 (source)', group: 'chunked' },
            { name: '720p30', group: '720p30' },
        ];
        listeners.playing();
        expect(setQuality).toHaveBeenCalledWith('chunked');
    });
});
