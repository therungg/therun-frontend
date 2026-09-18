// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectVod } from './types';
import { createYouTubePlayer } from './youtube';

describe('detectVod', () => {
    it('recognises YouTube watch, short and embed links', () => {
        expect(
            detectVod('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        ).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
        expect(detectVod('https://youtu.be/dQw4w9WgXcQ?t=10')).toEqual({
            kind: 'youtube',
            id: 'dQw4w9WgXcQ',
        });
    });
    it('recognises Twitch VODs but not clips or channels', () => {
        expect(
            detectVod('https://www.twitch.tv/videos/123456789?t=1h2m'),
        ).toEqual({ kind: 'twitch', id: '123456789' });
        // short id: without the youtu-guard, youtubeParser's regex matches `v/` in `tv/`
        // (capture 'ideos/12345' is 11 chars) and misclassifies this as YouTube.
        expect(detectVod('https://www.twitch.tv/videos/12345')).toEqual({
            kind: 'twitch',
            id: '12345',
        });
        expect(detectVod('https://clips.twitch.tv/SomeClip')).toBeNull();
        expect(detectVod('https://twitch.tv/somechannel')).toBeNull();
    });
    it('returns null for everything else', () => {
        expect(detectVod('https://drive.google.com/file/d/abc')).toBeNull();
    });
});

describe('createYouTubePlayer', () => {
    let originalYT: (typeof window)['YT'];

    beforeEach(() => {
        // Save original window.YT
        originalYT = typeof window !== 'undefined' ? window.YT : undefined;
    });

    afterEach(() => {
        // Restore original window.YT
        if (typeof window !== 'undefined') {
            window.YT = originalYT;
            // @ts-expect-error test cleanup of mock global
            // biome-ignore lint/suspicious/noExplicitAny: test needs to clean up mocked globals
            delete (window as any).onYouTubeIframeAPIReady;
        }
    });

    it('destroy() does not throw and leaves el clean when API replaces inner div', async () => {
        if (typeof window === 'undefined') {
            // Skip test if window is not available (shouldn't happen in jsdom)
            return;
        }

        // Mock the YouTube API: Player constructor simulates the real behavior
        // by replacing the element it's given with an iframe
        const mockYT = {
            Player: class MockPlayer {
                // @ts-expect-error mock constructor
                constructor(el: HTMLElement, opts) {
                    // Simulate YouTube's behavior: empty the element and add an iframe
                    el.replaceChildren(document.createElement('iframe'));
                    // Invoke onReady callback
                    opts.events.onReady();
                }

                seekTo() {
                    // mock stub
                }
                playVideo() {
                    // mock stub
                }
                pauseVideo() {
                    // mock stub
                }
                getCurrentTime() {
                    return 0;
                }
                getDuration() {
                    return 100;
                }
                setPlaybackRate() {
                    // mock stub
                }
                destroy() {
                    // mock stub
                }
            },
        };
        window.YT = mockYT;

        const container = document.createElement('div');
        const player = createYouTubePlayer(container, 'dQw4w9WgXcQ');

        // Wait for ready
        await player.ready;

        // Verify the inner div was created and has content
        expect(container.children.length).toBeGreaterThan(0);

        // Destroy should not throw
        expect(() => {
            player.destroy();
        }).not.toThrow();

        // After destroy, el should be clean (no children)
        expect(container.children.length).toBe(0);
    });
});
