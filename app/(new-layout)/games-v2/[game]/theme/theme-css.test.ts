import { describe, expect, it } from 'vitest';
import { buildThemeCss, deriveThemeVars } from './theme-css';

const base = {
    panelColor: '#161c18',
    accentColor: '#4aa06a',
    backgroundColor: '#0d0f0d',
    backgroundUrl: null,
    panelOpacity: 1,
};

describe('deriveThemeVars', () => {
    it('maps the picked colors onto the board surface, accent and canvas', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--board-surface-bg']).toBe('#161c18');
        expect(v['--board-accent']).toBe('#4aa06a');
        expect(v['--site-canvas-bg']).toBe('#0d0f0d');
        expect(v['--bs-primary']).toBe('#4aa06a');
        expect(v['--bs-primary-rgb']).toBe('74, 160, 106');
    });
    it('chooses light text on a dark panel', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--bs-emphasis-color']).toBe('#ffffff');
        expect(v['--bs-body-color']).toBe('#e8eaed');
    });
    it('chooses dark text on a light panel', () => {
        const v = deriveThemeVars({ ...base, panelColor: '#f2f2f2' }, 'dark');
        expect(v['--bs-emphasis-color']).toBe('#000000');
        expect(v['--bs-body-color']).toBe('#1a1d1a');
    });
    it('derives recesses darker than the panel', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--board-recess-bg']).toBe('#121714'); // panel mixed 18% toward black
        expect(v['--board-recess-bg']).toMatch(/^#[0-9a-f]{6}$/);
        expect(v['--board-recess-strong-bg']).toMatch(/^#[0-9a-f]{6}$/);
    });
    it('applies panelOpacity to the surface only when an image is set', () => {
        const themed = {
            ...base,
            backgroundUrl: 'https://x/i.webp',
            panelOpacity: 0.9,
        };
        expect(deriveThemeVars(themed, 'dark')['--board-surface-bg']).toBe(
            'rgba(22, 28, 24, 0.9)',
        );
        // no image → opacity ignored, surface stays opaque hex
        expect(
            deriveThemeVars({ ...base, panelOpacity: 0.9 }, 'dark')[
                '--board-surface-bg'
            ],
        ).toBe('#161c18');
    });
    it('is identical across schemes (board owns its colors)', () => {
        expect(deriveThemeVars(base, 'dark')).toEqual(
            deriveThemeVars(base, 'light'),
        );
    });
});

describe('buildThemeCss', () => {
    it('emits one block per scheme and never leaks a url()', () => {
        const css = buildThemeCss(base);
        expect(css).toContain("[data-bs-theme='dark'] {");
        expect(css).toContain("[data-bs-theme='light'] {");
        expect(css).toContain('--board-surface-bg: #161c18;');
        expect(css).not.toContain('url(');
    });
});
