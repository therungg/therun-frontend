import { describe, expect, it } from 'vitest';
import { isEmbeddableVod, normalizeVodUrl } from '../vod-url';

describe('isEmbeddableVod', () => {
    it('accepts the two hosts the player speaks', () => {
        expect(
            isEmbeddableVod('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        ).toBe(true);
        expect(isEmbeddableVod('https://www.twitch.tv/videos/40861387')).toBe(
            true,
        );
    });

    it('rejects a host the player would render as an empty well', () => {
        expect(isEmbeddableVod('https://drive.google.com/file/d/abc')).toBe(
            false,
        );
    });
});

describe('normalizeVodUrl', () => {
    it('rejects an empty paste', () => {
        expect(normalizeVodUrl('   ').ok).toBe(false);
    });

    it('keeps a well-formed link, trimmed', () => {
        const res = normalizeVodUrl('  https://www.twitch.tv/videos/1  ');
        expect(res).toEqual({
            ok: true,
            url: 'https://www.twitch.tv/videos/1',
        });
    });

    it('assumes https for a scheme-less paste', () => {
        const res = normalizeVodUrl('twitch.tv/videos/1');
        expect(res.ok && res.url).toBe('https://twitch.tv/videos/1');
    });

    it('rejects a non-http scheme', () => {
        const res = normalizeVodUrl('javascript:alert(1)');
        expect(res.ok).toBe(false);
    });

    it('rejects something that is plainly not a link', () => {
        expect(normalizeVodUrl('no video sorry').ok).toBe(false);
    });

    it('allows any host — mods paste more than two video sites', () => {
        expect(normalizeVodUrl('https://drive.google.com/file/d/abc').ok).toBe(
            true,
        );
    });
});
