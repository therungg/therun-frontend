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

/** WCAG contrast ratio between two relative luminances (1–21). */
function contrastRatio(a: number, b: number): number {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
}

interface TextSet {
    body: string;
    emphasis: string;
    secondary: string;
    tertiary: string;
    /** True when the light set was chosen (surface is dark). */
    light: boolean;
}

const LIGHT_TEXT: TextSet = {
    body: '#e8eaed',
    emphasis: '#ffffff',
    secondary: 'rgba(232, 234, 237, 0.75)',
    tertiary: 'rgba(232, 234, 237, 0.5)',
    light: true,
};
const DARK_TEXT: TextSet = {
    body: '#1a1d1a',
    emphasis: '#000000',
    secondary: 'rgba(26, 29, 26, 0.7)',
    tertiary: 'rgba(26, 29, 26, 0.5)',
    light: false,
};

/**
 * Best-of-two readable text for a surface: pick whichever of the light/dark
 * body colors has the higher WCAG contrast against the surface. A fixed
 * luminance threshold picks the worse color across mid-tones — this does not.
 */
function readableText(surface: Rgb): TextSet {
    const lum = luminance(surface);
    return contrastRatio(lum, luminance(hexToRgb(LIGHT_TEXT.body))) >=
        contrastRatio(lum, luminance(hexToRgb(DARK_TEXT.body)))
        ? LIGHT_TEXT
        : DARK_TEXT;
}

/**
 * Every themed custom property, derived from the three picked colors. Text is
 * chosen PER SURFACE: the canvas set (global --bs-* text vars) contrasts with
 * backgroundColor so the masthead/nav read against the page; the panel set
 * (--board-ink*) contrasts with panelColor and is re-asserted onto --bs-* by
 * the board-surface mixin, so text inside a panel reads against the panel.
 * Recesses mix the panel toward black; the accent drives --board-accent and
 * --bs-primary. Rank-metal, verify-state, and live colors stay un-themed.
 * The board owns its colors, so the result does not depend on `scheme`.
 */
export function deriveThemeVars(
    theme: GameTheme,
    _scheme: Scheme,
): Record<string, string> {
    const panel = hexToRgb(theme.panelColor);
    const accent = hexToRgb(theme.accentColor);
    const panelText = readableText(panel);
    const canvasText = readableText(hexToRgb(theme.backgroundColor));

    // Panels go translucent only over a background image.
    const surfaceBg =
        theme.backgroundUrl && theme.panelOpacity < 1
            ? `rgba(${panel.r}, ${panel.g}, ${panel.b}, ${theme.panelOpacity})`
            : theme.panelColor;

    return {
        '--board-surface-bg': surfaceBg,
        '--board-surface-border': panelText.light
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
        // Canvas text: global --bs-* vars, contrast against backgroundColor.
        '--bs-body-color': canvasText.body,
        '--bs-emphasis-color': canvasText.emphasis,
        '--bs-secondary-color': canvasText.secondary,
        '--bs-tertiary-color': canvasText.tertiary,
        // Panel text: --board-ink*, re-asserted onto --bs-* by board-surface.
        '--board-ink': panelText.body,
        '--board-ink-emphasis': panelText.emphasis,
        '--board-ink-secondary': panelText.secondary,
        '--board-ink-tertiary': panelText.tertiary,
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
