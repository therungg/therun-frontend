/**
 * Per-game board theme, mirrored by hand from the backend
 * (therun/src/types/game-theme.ts) per the no-shared-types contract.
 * Three picked colors; theme-css.ts derives borders, recesses, accents and
 * readable text from them, so a stored theme is legible by construction.
 * See docs/plans/2026-08-30-per-element-game-theme-design.md.
 */
/** Site-topbar treatment on this game's board. */
export type TopbarStyle = 'default' | 'accent' | 'panel';

export const TOPBAR_STYLES: readonly TopbarStyle[] = [
    'default',
    'accent',
    'panel',
];

/**
 * How the background image fills the page. 'tile' repeats it at natural size
 * (small patterns, as speedrun.com draws them); 'cover' scales it to fill;
 * 'auto' picks from the image's size (see autoBackgroundFit).
 */
export type BackgroundFit = 'auto' | 'cover' | 'tile';

export const BACKGROUND_FITS: readonly BackgroundFit[] = [
    'auto',
    'cover',
    'tile',
];

export interface GameTheme {
    panelColor: string; // lowercase #rrggbb — board/table surface
    accentColor: string; // lowercase #rrggbb — links, highlights, active
    backgroundColor: string; // lowercase #rrggbb — page canvas
    backgroundUrl: string | null;
    panelOpacity: number; // 0.85–1.0
    topbar: TopbarStyle; // topbar treatment; 'default' leaves it untouched
    // Optional here, unlike the backend type: themes stored before the field
    // existed come back without it, and not every path runs parseGameTheme.
    // Absent reads as 'auto'.
    backgroundFit?: BackgroundFit;
}

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

function normHex(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const lower = value.toLowerCase();
    return HEX_COLOR_PATTERN.test(lower) ? lower : null;
}

/** Lenient read-side parse: malformed themes render as unthemed, never 500. */
export function parseGameTheme(raw: unknown): GameTheme | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const t = raw as Record<string, unknown>;
    const panelColor = normHex(t.panelColor);
    const accentColor = normHex(t.accentColor);
    const backgroundColor = normHex(t.backgroundColor);
    if (panelColor === null || accentColor === null || backgroundColor === null)
        return null;
    const { backgroundUrl, panelOpacity } = t;
    if (
        backgroundUrl !== null &&
        (typeof backgroundUrl !== 'string' ||
            !backgroundUrl.startsWith('https://') ||
            backgroundUrl.length > 2048)
    )
        return null;
    if (
        typeof panelOpacity !== 'number' ||
        !Number.isFinite(panelOpacity) ||
        panelOpacity < 0.85 ||
        panelOpacity > 1
    )
        return null;
    const topbar = (t.topbar as TopbarStyle) ?? 'default';
    if (!TOPBAR_STYLES.includes(topbar)) return null;
    const backgroundFit = (t.backgroundFit as BackgroundFit) ?? 'auto';
    if (!BACKGROUND_FITS.includes(backgroundFit)) return null;
    return {
        panelColor,
        accentColor,
        backgroundColor,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
        topbar,
        backgroundFit,
    };
}

/**
 * A size under this on both axes is a pattern meant to repeat: speedrun.com's
 * tiled backgrounds are small (Wii Sports 900x375, SM64 200x200), its
 * cover-scaled ones are wallpaper-sized (1920x1080 and up).
 */
const TILE_MAX_PX = 1000;

/** The fit an 'auto' background resolves to, from the image's natural size. */
export function autoBackgroundFit(
    width: number,
    height: number,
): 'cover' | 'tile' {
    return width < TILE_MAX_PX && height < TILE_MAX_PX ? 'tile' : 'cover';
}
