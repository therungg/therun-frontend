import { describe, expect, it } from 'vitest';
import {
    autoBackgroundFit,
    backdropLayoutVars,
    backdropScrollLoop,
    parseGameTheme,
} from './game-theme';

const valid = {
    panelColor: '#161c18',
    accentColor: '#4aa06a',
    backgroundColor: '#0d0f0d',
    backgroundUrl: 'https://media.therun.gg/backgrounds/12-1.webp',
    panelOpacity: 0.9,
    topbar: 'accent' as const,
    backgroundFit: 'tile' as const,
    backgroundScroll: 'slow' as const,
    backgroundRepeat: 'x' as const,
    backgroundPosition: 'bottom-left' as const,
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
    it("defaults backgroundFit to 'auto' when absent", () => {
        const { backgroundFit: _omit, ...noFit } = valid;
        expect(parseGameTheme(noFit)?.backgroundFit).toBe('auto');
    });
    it('defaults scroll/repeat/position when absent', () => {
        const {
            backgroundScroll: _s,
            backgroundRepeat: _r,
            backgroundPosition: _p,
            ...rest
        } = valid;
        const t = parseGameTheme(rest);
        expect([
            t?.backgroundScroll,
            t?.backgroundRepeat,
            t?.backgroundPosition,
        ]).toEqual(['none', 'both', 'center']);
    });
    it.each([
        ['backgroundScroll', 'warp'],
        ['backgroundRepeat', 'diagonal'],
        ['backgroundPosition', 'middle'],
    ])('returns null for an invalid %s', (key, value) => {
        expect(parseGameTheme({ ...valid, [key]: value })).toBeNull();
    });
    it('returns null for an invalid backgroundFit value', () => {
        expect(
            parseGameTheme({ ...valid, backgroundFit: 'stretch' }),
        ).toBeNull();
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

describe('autoBackgroundFit', () => {
    it.each([
        [200, 200, 'tile'], // SM64
        [900, 375, 'tile'], // Wii Sports
        [1920, 1080, 'cover'],
        [3840, 2160, 'cover'],
        [800, 1400, 'cover'], // tall art, not a pattern
    ])('%sx%s -> %s', (w, h, expected) => {
        expect(autoBackgroundFit(w, h)).toBe(expected);
    });
});

describe('backdropLayoutVars', () => {
    it('defaults to centered, repeating both ways', () => {
        expect(backdropLayoutVars({})).toEqual({
            '--bg-x': '50%',
            '--bg-y': '50%',
            '--bg-repeat': 'repeat',
        });
    });
    it.each([
        ['top-left', '0%', '0%'],
        ['top', '50%', '0%'],
        ['right', '100%', '50%'],
        ['bottom-right', '100%', '100%'],
    ] as const)('%s -> %s %s', (backgroundPosition, x, y) => {
        const v = backdropLayoutVars({ backgroundPosition });
        expect([v['--bg-x'], v['--bg-y']]).toEqual([x, y]);
    });
    it.each([
        ['x', 'repeat-x'],
        ['y', 'repeat-y'],
        ['none', 'no-repeat'],
    ] as const)('repeat %s -> %s', (backgroundRepeat, css) => {
        expect(backdropLayoutVars({ backgroundRepeat })['--bg-repeat']).toBe(
            css,
        );
    });
});

describe('backdropScrollLoop', () => {
    const wii = { width: 900, height: 375 };
    const box = { width: 1440, height: 900 };
    it('is null when not scrolling', () => {
        expect(backdropScrollLoop('none', 'tile', wii, box)).toBeNull();
        expect(backdropScrollLoop(undefined, 'tile', wii, box)).toBeNull();
    });
    it("loops a tile on its own width, at speedrun.com's slow speed", () => {
        const loop = backdropScrollLoop('slow', 'tile', wii, box);
        expect(loop?.tileWidth).toBe(900);
        expect(loop?.seconds).toBeCloseTo(81); // 900px at 2000px/180s
    });
    it('fast is three times slow', () => {
        const slow = backdropScrollLoop('slow', 'tile', wii, box);
        const fast = backdropScrollLoop('fast', 'tile', wii, box);
        expect((slow?.seconds ?? 0) / (fast?.seconds ?? 1)).toBeCloseTo(3);
    });
    it('loops a cover image on its scaled width', () => {
        // 1920x1080 into 1440x900 scales by max(0.75, 0.833) -> 1600 wide
        const loop = backdropScrollLoop(
            'slow',
            'cover',
            { width: 1920, height: 1080 },
            box,
        );
        expect(loop?.tileWidth).toBeCloseTo(1600);
    });
    it('is null for an unmeasured image', () => {
        expect(
            backdropScrollLoop('slow', 'tile', { width: 0, height: 0 }, box),
        ).toBeNull();
    });
});
