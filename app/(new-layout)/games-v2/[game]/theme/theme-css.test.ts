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
    it('sets panel text (--board-ink) from the panel color', () => {
        // dark panel → light ink
        const dark = deriveThemeVars(base, 'dark');
        expect(dark['--board-ink']).toBe('#e8eaed');
        expect(dark['--board-ink-emphasis']).toBe('#ffffff');
        // light panel → dark ink
        const lightPanel = deriveThemeVars(
            { ...base, panelColor: '#f2f2f2' },
            'dark',
        );
        expect(lightPanel['--board-ink']).toBe('#1a1d1a');
        expect(lightPanel['--board-ink-emphasis']).toBe('#000000');
    });
    it('sets canvas text (global --bs-*) from the background, not the panel', () => {
        // dark background → light canvas text
        expect(deriveThemeVars(base, 'dark')['--bs-body-color']).toBe(
            '#e8eaed',
        );
        // light background + dark panel (the masthead bug): canvas text must go
        // dark to contrast the page, while panel ink stays light for the panels.
        const lightBg = deriveThemeVars(
            { ...base, backgroundColor: '#4aa72e' },
            'dark',
        );
        expect(lightBg['--bs-body-color']).toBe('#1a1d1a');
        expect(lightBg['--bs-emphasis-color']).toBe('#000000');
        expect(lightBg['--board-ink']).toBe('#e8eaed'); // panel #161c18 still light
    });
    it('picks the higher-contrast text on a mid-gray surface (best-of-two)', () => {
        expect(
            deriveThemeVars({ ...base, panelColor: '#a0a0a0' }, 'dark')[
                '--board-ink'
            ],
        ).toBe('#1a1d1a');
        expect(
            deriveThemeVars({ ...base, backgroundColor: '#a0a0a0' }, 'dark')[
                '--bs-body-color'
            ],
        ).toBe('#1a1d1a');
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
    it('scopes theme vars: canvas-bg global, board/text under .main-container', () => {
        const css = buildThemeCss(base);
        expect(css).toContain("[data-bs-theme='dark'] {");
        expect(css).toContain("[data-bs-theme='light'] {");
        expect(css).toContain('.main-container {');
        expect(css).not.toContain('url(');

        const scopeIdx = css.indexOf('.main-container {');
        const globalPart = css.slice(0, scopeIdx);
        const scopedPart = css.slice(scopeIdx);

        // Canvas background stays global — the root .background gradient reads it.
        expect(globalPart).toContain('--site-canvas-bg: #0d0f0d;');
        // Panel + text vars are scoped so they never reach the site topbar.
        expect(scopedPart).toContain('--board-surface-bg: #161c18;');
        expect(scopedPart).toContain('--bs-body-color:');
        expect(scopedPart).toContain('--board-ink:');
        expect(globalPart).not.toContain('--bs-body-color');
        expect(globalPart).not.toContain('--board-surface-bg');
    });
});
