import { describe, expect, it } from 'vitest';
import { buildThemeCss, deriveThemeVars } from './theme-css';

const base = {
    panelColor: '#161c18',
    accentColor: '#4aa06a',
    backgroundColor: '#0d0f0d',
    backgroundUrl: null,
    panelOpacity: 1,
    topbar: 'default' as const,
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
    it('renders a bright panel pick as a dark tint of its hue (speedrun.com model)', () => {
        // The Super Mario Galaxy import: SRC's cyan panel must not become a
        // bright cyan slab. Hue kept, lightness capped, ink goes light.
        const v = deriveThemeVars(
            {
                ...base,
                panelColor: '#00bfff',
                backgroundColor: '#00ace5',
                accentColor: '#006385',
            },
            'dark',
        );
        expect(v['--board-surface-bg']).toBe('#005470');
        expect(v['--site-canvas-bg']).toBe('#003647');
        expect(v['--board-ink']).toBe('#e8eaed');
        expect(v['--board-ink-emphasis']).toBe('#ffffff');
        expect(v['--bs-body-color']).toBe('#e8eaed');
        // The stored accent cleared 3:1 against the bright pick, not the tint;
        // it is lifted so it still reads on the darkened panel.
        expect(v['--board-accent']).toBe('#00a7e1');
        expect(v['--bs-primary']).toBe('#00a7e1');
    });
    it('leaves dark picks untouched', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--board-surface-bg']).toBe('#161c18');
        expect(v['--site-canvas-bg']).toBe('#0d0f0d');
        expect(v['--board-ink']).toBe('#e8eaed');
        expect(v['--bs-body-color']).toBe('#e8eaed');
    });
    it('keeps the canvas a step darker than the panel when both picks are bright', () => {
        const v = deriveThemeVars(
            { ...base, panelColor: '#a0a0a0', backgroundColor: '#a0a0a0' },
            'dark',
        );
        expect(v['--board-surface-bg']).toBe('#383838');
        expect(v['--site-canvas-bg']).toBe('#242424');
    });
    it('derives recesses darker than the panel', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--board-recess-bg']).toBe('#121714'); // panel mixed 18% toward black
        expect(v['--board-recess-bg']).toMatch(/^#[0-9a-f]{6}$/);
        expect(v['--board-recess-strong-bg']).toMatch(/^#[0-9a-f]{6}$/);
    });
    it('composites the translucent panel over a scrim only when an image is set', () => {
        const themed = {
            ...base,
            backgroundUrl: 'https://x/i.webp',
            panelOpacity: 0.9,
        };
        // Panel tint on top, half-opacity black scrim beneath, so a bright
        // background region can't bleed through the translucent gap.
        expect(deriveThemeVars(themed, 'dark')['--board-surface-bg']).toBe(
            'linear-gradient(0deg, rgba(22, 28, 24, 0.9), rgba(22, 28, 24, 0.9)),' +
                ' linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))',
        );
        // no image → opacity ignored, surface stays opaque hex
        expect(
            deriveThemeVars({ ...base, panelOpacity: 0.9 }, 'dark')[
                '--board-surface-bg'
            ],
        ).toBe('#161c18');
    });
    it('derives readable on-accent text (dark text for a light accent)', () => {
        // dark accent → light label
        expect(
            deriveThemeVars({ ...base, accentColor: '#123024' }, 'dark')[
                '--board-on-accent'
            ],
        ).toBe('#ffffff');
        // white accent (e.g. an imported speedrun.com primaryColor) → dark label
        expect(
            deriveThemeVars({ ...base, accentColor: '#ffffff' }, 'dark')[
                '--board-on-accent'
            ],
        ).toBe('#000000');
    });
    it('is identical across schemes (board owns its colors)', () => {
        expect(deriveThemeVars(base, 'dark')).toEqual(
            deriveThemeVars(base, 'light'),
        );
    });
    it('emits no topbar vars when topbar is default', () => {
        const v = deriveThemeVars(base, 'dark');
        expect(v['--site-topbar-bg']).toBeUndefined();
        expect(v['--site-topbar-color']).toBeUndefined();
    });
    it('paints the topbar the accent color with readable text', () => {
        const v = deriveThemeVars({ ...base, topbar: 'accent' }, 'dark');
        expect(v['--site-topbar-bg']).toBe('#4aa06a');
        // accent #4aa06a is light-ish → dark topbar text
        expect(v['--site-topbar-color']).toBe('#1a1d1a');
    });
    it('paints the topbar the panel color with readable text', () => {
        const v = deriveThemeVars({ ...base, topbar: 'panel' }, 'dark');
        expect(v['--site-topbar-bg']).toBe('#161c18');
        // panel #161c18 is dark → light topbar text
        expect(v['--site-topbar-color']).toBe('#e8eaed');
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
    it('emits the topbar background globally (topbar is outside .main-container)', () => {
        const css = buildThemeCss({ ...base, topbar: 'accent' });
        const scopeIdx = css.indexOf('.main-container {');
        const globalPart = css.slice(0, scopeIdx);
        expect(globalPart).toContain('--site-topbar-bg: #4aa06a;');
    });
});
