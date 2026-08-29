import { describe, expect, it } from 'vitest';
import { parseGameTheme } from './game-theme';

const valid = {
    hue: 280,
    saturation: 55,
    backgroundUrl: 'https://media.therun.gg/backgrounds/12-1.webp',
    panelOpacity: 0.9,
};

describe('parseGameTheme', () => {
    it('round-trips a valid theme', () => {
        expect(parseGameTheme(valid)).toEqual(valid);
    });
    it('accepts a color-only theme', () => {
        const t = { ...valid, backgroundUrl: null, panelOpacity: 1 };
        expect(parseGameTheme(t)).toEqual(t);
    });
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['non-object', 7],
        ['hue out of range', { ...valid, hue: 360 }],
        ['fractional hue', { ...valid, hue: 1.5 }],
        ['saturation out of range', { ...valid, saturation: 71 }],
        ['opacity out of range', { ...valid, panelOpacity: 0.5 }],
        ['non-https url', { ...valid, backgroundUrl: 'javascript:x' }],
    ])('returns null for %s', (_l, raw) => {
        expect(parseGameTheme(raw)).toBeNull();
    });
});
