import { describe, expect, test } from 'vitest';
import { youtubeParser } from '~src/components/run/dashboard/vod';

describe('youtubeParser', () => {
    test('watch url', () => {
        expect(
            youtubeParser('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        ).toContain('dQw4w9WgXcQ');
    });
    test('short url', () => {
        expect(youtubeParser('https://youtu.be/dQw4w9WgXcQ')).toContain(
            'dQw4w9WgXcQ',
        );
    });
    test('non-youtube returns falsy', () => {
        expect(youtubeParser('https://example.com/video')).toBeFalsy();
    });
});
