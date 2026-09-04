import type { GameTheme } from '~src/lib/game-theme';
import { ensureAccentContrast, toSurfaceTint } from './theme-normalize';

type Scheme = 'dark' | 'light';

/**
 * Lightness caps (HSL) for the tinted surfaces. Measured off speedrun.com's
 * dark-mode rendering of a `#00bfff` panel, which lands around l = 0.14–0.24.
 */
const PANEL_MAX_L = 0.22;
const CANVAS_MAX_L = 0.14;

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
    secondary: 'rgba(232, 234, 237, 0.78)',
    // Tertiary kept high enough to stay legible on mid-tone surfaces, where a
    // low alpha composites toward the background and contrast collapses.
    tertiary: 'rgba(232, 234, 237, 0.62)',
    light: true,
};
const DARK_TEXT: TextSet = {
    body: '#1a1d1a',
    emphasis: '#000000',
    secondary: 'rgba(26, 29, 26, 0.74)',
    tertiary: 'rgba(26, 29, 26, 0.62)',
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
 * Every themed custom property, derived from the three picked colors (panel
 * and background first reduced to dark tints, see below). Text is
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
    // Picked colors are TINTS of a dark board, not literal fills — the same
    // model speedrun.com uses, so an imported theme looks the same here as
    // there. A bright pick becomes a deep tint of its hue; dark picks pass
    // through unchanged. The canvas sits a step darker than the panel so the
    // panel still lifts off the page. The accent is re-checked against the
    // tinted panel, since the stored accent was normalized against the pick.
    const panelHex = toSurfaceTint(theme.panelColor, PANEL_MAX_L);
    const canvasHex = toSurfaceTint(theme.backgroundColor, CANVAS_MAX_L);
    const accentHex = ensureAccentContrast(theme.accentColor, panelHex);
    const panel = hexToRgb(panelHex);
    const accent = hexToRgb(accentHex);
    const panelText = readableText(panel);
    const canvasText = readableText(hexToRgb(canvasHex));
    // Text that sits ON an accent-filled surface (active pill, primary button).
    // Luminance-aware so a light accent (e.g. a white primaryColor imported
    // from speedrun.com) gets dark text instead of hardcoded white-on-white.
    const accentText = readableText(accent);

    // Panels go translucent only over a background image. When they do, the
    // panel tint is composited over a darkening scrim so a bright patch of the
    // background image can't bleed through the translucent gap and wash out the
    // panel text — the panel keeps a hint of translucency for depth, but the
    // image contributes at most a few percent. Two stacked background layers:
    // the panel tint on top, a half-opacity black scrim beneath. Solid-color
    // themes (no image) keep a flat opaque panel.
    const panelTint = `rgba(${panel.r}, ${panel.g}, ${panel.b}, ${theme.panelOpacity})`;
    const surfaceBg =
        theme.backgroundUrl && theme.panelOpacity < 1
            ? `linear-gradient(0deg, ${panelTint}, ${panelTint}),` +
              ` linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))`
            : panelHex;

    const vars: Record<string, string> = {
        '--board-surface-bg': surfaceBg,
        '--board-surface-border': panelText.light
            ? 'rgba(255, 255, 255, 0.09)'
            : 'rgba(0, 0, 0, 0.1)',
        '--board-recess-bg': toHex(mix(panel, BLACK, 0.18)),
        '--board-recess-strong-bg': toHex(mix(panel, BLACK, 0.3)),
        '--board-accent': accentHex,
        '--board-accent-soft': `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.08)`,
        '--board-on-accent': accentText.emphasis,
        '--site-canvas-bg': canvasHex,
        '--site-canvas-primary': accentHex,
        '--bs-primary': accentHex,
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

    // Optional topbar tint: paint the site topbar the accent or panel color
    // with readable text derived from it. 'default' leaves the topbar alone
    // (no vars emitted → the Topbar's own fallback background stands).
    if (theme.topbar === 'accent' || theme.topbar === 'panel') {
        const barHex = theme.topbar === 'accent' ? accentHex : panelHex;
        const barText = readableText(hexToRgb(barHex));
        vars['--site-topbar-bg'] = barHex;
        vars['--site-topbar-color'] = barText.body;
        vars['--site-topbar-emphasis'] = barText.emphasis;
        vars['--site-topbar-muted'] = barText.secondary;
    }

    return vars;
}

function block(selector: string, vars: Record<string, string>): string {
    const lines = Object.entries(vars)
        .map(([k, v]) => `    ${k}: ${v};`)
        .join('\n');
    return `${selector} {\n${lines}\n}`;
}

/**
 * Vars that must stay on the global color-mode node: the root `.background`
 * gradient (an ancestor of everything, including the site topbar) reads these,
 * so they can't be scoped down to the game content. The topbar's own surface
 * is hardcoded and doesn't read them, so leaving them global is harmless.
 */
const GLOBAL_KEYS = new Set([
    '--site-canvas-bg',
    '--site-canvas-primary',
    // The topbar lives outside .main-container, so its vars must stay global.
    '--site-topbar-bg',
    '--site-topbar-color',
    '--site-topbar-emphasis',
    '--site-topbar-muted',
]);

/**
 * The stylesheet injected by the game layout. Nothing user-typed is
 * interpolated (values are hex/rgba built from validated colors), and the
 * background URL never enters CSS (the backdrop div carries it inline).
 *
 * Scope split: canvas-background vars stay on `[data-bs-theme]` for the root
 * gradient; everything else (panel/accent/text, incl. the `--bs-*` overrides)
 * is scoped to `.main-container` — the wrapper around game content — so the
 * theme never bleeds into the site topbar, which lives outside it. The board
 * owns its colors, so the scoped block is scheme-independent (emitted once).
 */
export function buildThemeCss(theme: GameTheme): string {
    const vars = deriveThemeVars(theme, 'dark');
    const global: Record<string, string> = {};
    const scoped: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
        (GLOBAL_KEYS.has(k) ? global : scoped)[k] = v;
    }
    return [
        block("[data-bs-theme='dark']", global),
        block("[data-bs-theme='light']", global),
        block('.main-container', scoped),
    ].join('\n');
}
