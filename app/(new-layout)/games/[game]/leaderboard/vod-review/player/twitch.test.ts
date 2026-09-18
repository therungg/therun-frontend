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
});
