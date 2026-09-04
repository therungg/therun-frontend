/**
 * Readability normalization for board theme colors — a verbatim mirror of the
 * backend `src/types/theme-normalize.ts`. The board renders the STORED theme,
 * which the backend already normalized on save; this mirror exists so the theme
 * pane's live PREVIEW shows the same adjusted colors the backend will store
 * (what the mod sees == what gets saved). Keep the two in lockstep; the only
 * frontend-only additions are the render-time helpers at the bottom
 * (`toSurfaceTint`, `ensureAccentContrast`), used by theme-css.
 *
 * Themes never fail a contrast check — the three picked colors are nudged (hue
 * and saturation preserved, lightness moved minimally) until they clear:
 *   - panel & background each reach >= 4.5:1 with their best-of-two derived ink
 *   - accent reaches >= 3:1 against the panel
 *   - panel and background differ by >= 0.04 in HSL lightness
 */

interface Rgb {
    r: number;
    g: number;
    b: number;
}
interface Hsl {
    h: number;
    s: number;
    l: number;
}

const TEXT_MIN = 4.5;
const ACCENT_MIN = 3;
const MIN_L_SEP = 0.04;
const STEP = 0.01;

function hexToRgb(hex: string): Rgb {
    const h = hex.replace(/^#/, '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

function rgbToHex({ r, g, b }: Rgb): string {
    const to = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n)))
            .toString(16)
            .padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLinear(channel: number): number {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relLuminance({ r, g, b }: Rgb): number {
    return (
        0.2126 * srgbToLinear(r) +
        0.7152 * srgbToLinear(g) +
        0.0722 * srgbToLinear(b)
    );
}

function contrast(a: number, b: number): number {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    switch (max) {
        case rn:
            h = (gn - bn) / d + (gn < bn ? 6 : 0);
            break;
        case gn:
            h = (bn - rn) / d + 2;
            break;
        default:
            h = (rn - gn) / d + 4;
    }
    return { h: h / 6, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
    if (s === 0) {
        const v = l * 255;
        return { r: v, g: v, b: v };
    }
    const hue = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
        r: hue(p, q, h + 1 / 3) * 255,
        g: hue(p, q, h) * 255,
        b: hue(p, q, h - 1 / 3) * 255,
    };
}

function roundRgb({ r, g, b }: Rgb): Rgb {
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    return { r: c(r), g: c(g), b: c(b) };
}

const INK_LIGHT_L = relLuminance(hexToRgb('#e8eaed'));
const INK_DARK_L = relLuminance(hexToRgb('#1a1d1a'));

function bestInkContrast(rgb: Rgb): number {
    const lum = relLuminance(rgb);
    return Math.max(contrast(lum, INK_LIGHT_L), contrast(lum, INK_DARK_L));
}

function walkLightness(rgb: Rgb, dir: 1 | -1, ok: (c: Rgb) => boolean): Rgb {
    const { h, s } = rgbToHsl(rgb);
    let l = rgbToHsl(rgb).l;
    let cand = roundRgb(rgb);
    for (let i = 0; i < 200; i++) {
        if (ok(cand)) return cand;
        l += dir * STEP;
        if (l <= 0) return roundRgb(hslToRgb({ h, s, l: 0 }));
        if (l >= 1) return roundRgb(hslToRgb({ h, s, l: 1 }));
        cand = roundRgb(hslToRgb({ h, s, l }));
    }
    return cand;
}

function adjustSurface(rgb: Rgb): Rgb {
    if (bestInkContrast(rgb) >= TEXT_MIN) return rgb;
    const ok = (c: Rgb) => bestInkContrast(c) >= TEXT_MIN;
    const darker = walkLightness(rgb, -1, ok);
    const lighter = walkLightness(rgb, 1, ok);
    const l0 = rgbToHsl(rgb).l;
    const darkerOk = ok(darker);
    const lighterOk = ok(lighter);
    if (darkerOk && lighterOk) {
        return Math.abs(rgbToHsl(darker).l - l0) <=
            Math.abs(rgbToHsl(lighter).l - l0)
            ? darker
            : lighter;
    }
    if (darkerOk) return darker;
    if (lighterOk) return lighter;
    return darker;
}

function adjustAccent(accent: Rgb, panel: Rgb): Rgb {
    const lp = relLuminance(panel);
    const ok = (c: Rgb) => contrast(relLuminance(c), lp) >= ACCENT_MIN;
    if (ok(accent)) return accent;
    const down = walkLightness(accent, -1, ok);
    const up = walkLightness(accent, 1, ok);
    const l0 = rgbToHsl(accent).l;
    const downOk = ok(down);
    const upOk = ok(up);
    if (downOk && upOk) {
        return Math.abs(rgbToHsl(down).l - l0) <= Math.abs(rgbToHsl(up).l - l0)
            ? down
            : up;
    }
    if (downOk) return down;
    if (upOk) return up;
    return contrast(relLuminance(down), lp) >= contrast(relLuminance(up), lp)
        ? down
        : up;
}

function ensurePanelBgMargin(panel: Rgb, bg: Rgb): { panel: Rgb; bg: Rgb } {
    const lp = rgbToHsl(panel).l;
    if (Math.abs(rgbToHsl(bg).l - lp) >= MIN_L_SEP) return { panel, bg };
    const dir: 1 | -1 = rgbToHsl(bg).l <= lp ? -1 : 1;
    let nextBg = walkLightness(
        bg,
        dir,
        (c) => Math.abs(rgbToHsl(c).l - lp) >= MIN_L_SEP,
    );
    nextBg = adjustSurface(nextBg);
    if (Math.abs(rgbToHsl(nextBg).l - lp) >= MIN_L_SEP) {
        return { panel, bg: nextBg };
    }
    const lb = rgbToHsl(nextBg).l;
    const dir2: 1 | -1 = lb <= lp ? 1 : -1;
    let nextPanel = walkLightness(
        panel,
        dir2,
        (c) => Math.abs(rgbToHsl(c).l - lb) >= MIN_L_SEP,
    );
    nextPanel = adjustSurface(nextPanel);
    return { panel: nextPanel, bg: nextBg };
}

/**
 * The board is a dark surface tinted by the picked color, the way speedrun.com
 * renders its themes: a bright pick (e.g. `#00bfff`) becomes a deep tint of
 * that hue, never a bright slab. Hue and saturation are kept; lightness is
 * capped at `maxL`. Picks already at or below the cap come back unchanged, so
 * hand-picked dark themes render exactly as picked.
 */
export function toSurfaceTint(hex: string, maxL: number): string {
    const hsl = rgbToHsl(hexToRgb(hex));
    if (hsl.l <= maxL) return hex;
    return rgbToHex(roundRgb(hslToRgb({ ...hsl, l: maxL })));
}

/** The accent nudged in lightness until it clears 3:1 against `panelHex`. */
export function ensureAccentContrast(
    accentHex: string,
    panelHex: string,
): string {
    return rgbToHex(adjustAccent(hexToRgb(accentHex), hexToRgb(panelHex)));
}

export interface ThemeColors {
    panelColor: string;
    accentColor: string;
    backgroundColor: string;
}

/**
 * The three colors nudged to satisfy every legibility margin. Input must be
 * valid lowercase #rrggbb; output is lowercase #rrggbb. Colors that already
 * pass are returned unchanged. Mirrors the backend normalizer exactly.
 */
export function normalizeThemeColors(colors: ThemeColors): ThemeColors {
    let panel = adjustSurface(hexToRgb(colors.panelColor));
    let bg = adjustSurface(hexToRgb(colors.backgroundColor));
    ({ panel, bg } = ensurePanelBgMargin(panel, bg));
    const accent = adjustAccent(hexToRgb(colors.accentColor), panel);
    return {
        panelColor: rgbToHex(panel),
        accentColor: rgbToHex(accent),
        backgroundColor: rgbToHex(bg),
    };
}
