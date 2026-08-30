import type { GameTheme } from '~src/lib/game-theme';

type Scheme = 'dark' | 'light';

interface Rgb {
    r: number;
    g: number;
    b: number;
}

function hexToRgb(hex: string): Rgb {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}

function toHex({ r, g, b }: Rgb): string {
    const h = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, '0');
    return `#${h(r)}${h(g)}${h(b)}`;
}

/** Linear mix of a color toward a target by `amount` (0–1). */
function mix(color: Rgb, target: Rgb, amount: number): Rgb {
    return {
        r: color.r + (target.r - color.r) * amount,
        g: color.g + (target.g - color.g) * amount,
        b: color.b + (target.b - color.b) * amount,
    };
}

/** WCAG relative luminance, 0 (black) – 1 (white). */
function luminance({ r, g, b }: Rgb): number {
    const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Every themed custom property, derived from the three picked colors. Panel
 * luminance chooses a light or dark text set so contrast survives any input;
 * recesses mix the panel toward black; the accent drives both --board-accent
 * and --bs-primary. Rank-metal, verify-state, and live colors stay un-themed.
 * The board owns its colors, so the result does not depend on `scheme`.
 */
export function deriveThemeVars(
    theme: GameTheme,
    _scheme: Scheme,
): Record<string, string> {
    const panel = hexToRgb(theme.panelColor);
    const accent = hexToRgb(theme.accentColor);
    const useLightText = luminance(panel) < 0.4;

    // Panels go translucent only over a background image.
    const surfaceBg =
        theme.backgroundUrl && theme.panelOpacity < 1
            ? `rgba(${panel.r}, ${panel.g}, ${panel.b}, ${theme.panelOpacity})`
            : theme.panelColor;

    const text = useLightText
        ? {
              body: '#e8eaed',
              emphasis: '#ffffff',
              secondary: 'rgba(232, 234, 237, 0.75)',
              tertiary: 'rgba(232, 234, 237, 0.5)',
          }
        : {
              body: '#1a1d1a',
              emphasis: '#000000',
              secondary: 'rgba(26, 29, 26, 0.7)',
              tertiary: 'rgba(26, 29, 26, 0.5)',
          };

    return {
        '--board-surface-bg': surfaceBg,
        '--board-surface-border': useLightText
            ? 'rgba(255, 255, 255, 0.09)'
            : 'rgba(0, 0, 0, 0.1)',
        '--board-recess-bg': toHex(mix(panel, BLACK, 0.18)),
        '--board-recess-strong-bg': toHex(mix(panel, BLACK, 0.3)),
        '--board-accent': theme.accentColor,
        '--board-accent-soft': `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.08)`,
        '--site-canvas-bg': theme.backgroundColor,
        '--site-canvas-primary': theme.accentColor,
        '--bs-primary': theme.accentColor,
        '--bs-primary-rgb': `${accent.r}, ${accent.g}, ${accent.b}`,
        '--bs-body-color': text.body,
        '--bs-emphasis-color': text.emphasis,
        '--bs-secondary-color': text.secondary,
        '--bs-tertiary-color': text.tertiary,
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
