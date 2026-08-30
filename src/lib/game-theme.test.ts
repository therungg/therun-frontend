import { describe, expect, it } from 'vitest';
import { parseGameTheme } from './game-theme';

const valid = {
    panelColor: '#161c18',
    accentColor: '#4aa06a',
    backgroundColor: '#0d0f0d',
    backgroundUrl: 'https://media.therun.gg/backgrounds/12-1.webp',
    panelOpacity: 0.9,
    topbar: 'accent' as const,
};

describe('parseGameTheme', () => {
    it('round-trips a valid theme', () => {
        expect(parseGameTheme(valid)).toEqual(valid);
    });
    it('accepts a color-only theme', () => {
        const t = { ...valid, backgroundUrl: null, panelOpacity: 1 };
        expect(parseGameTheme(t)).toEqual(t);
    });
    it('lowercase-normalizes hex colors', () => {
        expect(
            parseGameTheme({ ...valid, panelColor: '#161C18' })?.panelColor,
        ).toBe('#161c18');
    });
    it("defaults topbar to 'default' when absent", () => {
        const { topbar: _omit, ...noTopbar } = valid;
        expect(parseGameTheme(noTopbar)?.topbar).toBe('default');
    });
    it('returns null for an invalid topbar value', () => {
        expect(parseGameTheme({ ...valid, topbar: 'rainbow' })).toBeNull();
    });
    it.each([
        ['undefined', undefined],
        ['null', null],
        ['non-object', 7],
        ['panelColor without #', { ...valid, panelColor: '161c18' }],
        ['3-digit hex', { ...valid, panelColor: '#abc' }],
        ['non-hex char', { ...valid, accentColor: '#gggggg' }],
        ['opacity out of range', { ...valid, panelOpacity: 0.5 }],
        ['non-https url', { ...valid, backgroundUrl: 'javascript:x' }],
    ])('returns null for %s', (_l, raw) => {
        expect(parseGameTheme(raw)).toBeNull();
    });
});
