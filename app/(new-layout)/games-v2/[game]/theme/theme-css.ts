import type { GameTheme } from '~src/lib/game-theme';

type Scheme = 'dark' | 'light';

/**
 * Every themed custom property, derived from (hue, saturation) at the same
 * lightness steps as the reviewed defaults in styles/_overrides.scss
 * (#161c18 ≈ L11%, #0d0f0d ≈ L5.5%) — a theme changes the tint, never the
 * value structure, so contrast survives any input in the validated range.
 * Text, rank-metal, verify-state, and live colors are deliberately absent.
 */
export function deriveThemeVars(
    theme: GameTheme,
    scheme: Scheme,
): Record<string, string> {
    const { hue: h, saturation: s } = theme;
    // Panels go translucent only over a background image; opacity elsewhere
    // would show the canvas gradient through every panel for no reason.
    const alpha =
        theme.backgroundUrl && theme.panelOpacity < 1
            ? ` / ${theme.panelOpacity}`
            : '';
    if (scheme === 'dark') {
        const surfS = Math.round(s * 0.25);
        const deepS = Math.round(s * 0.3);
        return {
            '--board-surface-bg': `hsl(${h} ${surfS}% 11%${alpha})`,
            '--board-surface-border': `hsl(${h} ${s}% 80% / 0.09)`,
            '--board-recess-bg': `hsl(${h} ${deepS}% 5.5%)`,
            '--board-recess-strong-bg': `hsl(${h} ${deepS}% 3.5%)`,
            '--board-accent': `hsl(${h} ${s}% 45%)`,
            '--board-accent-soft': `hsl(${h} ${s}% 45% / 0.05)`,
            '--site-canvas-bg': `hsl(${h} ${deepS}% 5%)`,
            '--site-canvas-primary': `hsl(${h} ${s}% 40%)`,
        };
    }
    return {
        '--board-surface-bg': `hsl(0 0% 100%${alpha})`,
        '--board-surface-border': `hsl(${h} 40% 25% / 0.1)`,
        '--board-recess-bg': `hsl(${h} 20% 91%)`,
        '--board-recess-strong-bg': `hsl(${h} 20% 88%)`,
        '--board-accent': `hsl(${h} ${s}% 40%)`,
        '--board-accent-soft': `hsl(${h} ${s}% 40% / 0.05)`,
        '--site-canvas-bg': `hsl(${h} 30% 98%)`,
        '--site-canvas-primary': `hsl(${h} ${s}% 40%)`,
    };
}

function block(selector: string, vars: Record<string, string>): string {
    const lines = Object.entries(vars)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n');
    return `${selector} {\n${lines}\n}`;
}

/**
 * The stylesheet injected by the game layout. Values are built exclusively
 * from validated integers — nothing user-typed is interpolated, and the
 * background URL never enters CSS (the backdrop div carries it inline).
 */
export function buildThemeCss(theme: GameTheme): string {
    return [
        block("[data-bs-theme='dark']", deriveThemeVars(theme, 'dark')),
        block("[data-bs-theme='light']", deriveThemeVars(theme, 'light')),
    ].join('\n');
}
