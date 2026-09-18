import { describe, expect, it } from 'vitest';
import { normalizeThemeColors } from './theme-normalize';

function lum(hex: string): number {
    const h = hex.replace(/^#/, '');
    const chan = (i: number) => {
        const s = parseInt(h.slice(i, i + 2), 16) / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
}
function contrast(a: string, b: string): number {
    const [la, lb] = [lum(a), lum(b)];
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function bestInk(surface: string): number {
    return Math.max(contrast(surface, '#e8eaed'), contrast(surface, '#1a1d1a'));
}
function hslL(hex: string): number {
    const h = hex.replace(/^#/, '');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}

function assertReadable(t: {
    panelColor: string;
    accentColor: string;
    backgroundColor: string;
}) {
    expect(bestInk(t.panelColor)).toBeGreaterThanOrEqual(4.5 - 1e-6);
    expect(bestInk(t.backgroundColor)).toBeGreaterThanOrEqual(4.5 - 1e-6);
    expect(contrast(t.accentColor, t.panelColor)).toBeGreaterThanOrEqual(
        3 - 1e-6,
    );
    expect(
        Math.abs(hslL(t.panelColor) - hslL(t.backgroundColor)),
    ).toBeGreaterThanOrEqual(0.04 - 1e-6);
}

describe('normalizeThemeColors (frontend mirror)', () => {
    it('leaves an already-readable theme unchanged', () => {
        const readable = {
            panelColor: '#161c18',
            accentColor: '#4aa06a',
            backgroundColor: '#0d0f0d',
        };
        expect(normalizeThemeColors(readable)).toEqual(readable);
    });

    it('holds every guarantee across hostile inputs', () => {
        const cases = [
            {
                panelColor: '#808080',
                accentColor: '#4aa06a',
                backgroundColor: '#0d0f0d',
            },
            {
                panelColor: '#777777',
                accentColor: '#787878',
                backgroundColor: '#767676',
            },
            {
                panelColor: '#101010',
                accentColor: '#4aa06a',
                backgroundColor: '#101010',
            },
            {
                panelColor: '#000000',
                accentColor: '#000000',
                backgroundColor: '#010101',
            },
            {
                panelColor: '#ffffff',
                accentColor: '#ffffff',
                backgroundColor: '#fefefe',
            },
            {
                panelColor: '#262c3b',
                accentColor: '#ffffff',
                backgroundColor: '#101010',
            },
        ];
        for (const c of cases) assertReadable(normalizeThemeColors(c));
    });
});
