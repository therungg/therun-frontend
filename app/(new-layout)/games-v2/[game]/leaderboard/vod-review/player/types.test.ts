import { describe, expect, it } from 'vitest';
import { detectVod } from './types';

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
        expect(detectVod('https://clips.twitch.tv/SomeClip')).toBeNull();
        expect(detectVod('https://twitch.tv/somechannel')).toBeNull();
    });
    it('returns null for everything else', () => {
        expect(detectVod('https://drive.google.com/file/d/abc')).toBeNull();
    });
});
