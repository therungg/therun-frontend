import { describe, expect, it } from 'vitest';
import { buildThemeCss, deriveThemeVars } from './theme-css';

const base = { hue: 280, saturation: 55, backgroundUrl: null, panelOpacity: 1 };

describe('deriveThemeVars', () => {
    it('keeps dark surfaces at the reference lightness steps', () => {
        const dark = deriveThemeVars(base, 'dark');
        expect(dark['--board-surface-bg']).toBe('hsl(280 14% 11%)');
        expect(dark['--board-recess-bg']).toBe('hsl(280 17% 5.5%)');
        expect(dark['--board-accent']).toBe('hsl(280 55% 45%)');
        expect(dark['--site-canvas-bg']).toBe('hsl(280 17% 5%)');
        expect(dark['--site-canvas-primary']).toBe('hsl(280 55% 40%)');
    });
    it('keeps light surfaces white with a whisper canvas tint', () => {
        const light = deriveThemeVars(base, 'light');
        expect(light['--board-surface-bg']).toBe('hsl(0 0% 100%)');
        expect(light['--site-canvas-bg']).toBe('hsl(280 30% 98%)');
    });
    it('applies panelOpacity to surfaces only when an image is set', () => {
        const themed = {
            ...base,
            backgroundUrl: 'https://x/i.webp',
            panelOpacity: 0.9,
        };
        expect(deriveThemeVars(themed, 'dark')['--board-surface-bg']).toBe(
            'hsl(280 14% 11% / 0.9)',
        );
        expect(deriveThemeVars(themed, 'light')['--board-surface-bg']).toBe(
            'hsl(0 0% 100% / 0.9)',
        );
        // no image → opacity ignored, surfaces stay opaque
        expect(
            deriveThemeVars({ ...base, panelOpacity: 0.9 }, 'dark')[
                '--board-surface-bg'
            ],
        ).toBe('hsl(280 14% 11%)');
    });
    it('never emits text or rank colors', () => {
        const keys = Object.keys(deriveThemeVars(base, 'dark')).join(' ');
        expect(keys).not.toMatch(/color|gold|silver|bronze|emphasis/);
    });
});

describe('buildThemeCss', () => {
    it('emits one block per scheme with every var, and nothing user-typed', () => {
        const css = buildThemeCss(base);
        expect(css).toContain("[data-bs-theme='dark'] {");
        expect(css).toContain("[data-bs-theme='light'] {");
        expect(css).toContain('--board-surface-bg: hsl(280 14% 11%);');
        // only numbers we generated: no url() ever appears in the stylesheet
        expect(css).not.toContain('url(');
    });
});
