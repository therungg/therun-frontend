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

/** Slow horizontal pan of the background (speedrun.com's "scrolling"). */
export type BackgroundScroll = 'none' | 'slow' | 'medium' | 'fast';

export const BACKGROUND_SCROLLS: readonly BackgroundScroll[] = [
    'none',
    'slow',
    'medium',
    'fast',
];

export type BackgroundRepeat = 'none' | 'x' | 'y' | 'both';

export const BACKGROUND_REPEATS: readonly BackgroundRepeat[] = [
    'both',
    'x',
    'y',
    'none',
];

export type BackgroundPosition =
    | 'top-left'
    | 'top'
    | 'top-right'
    | 'left'
    | 'center'
    | 'right'
    | 'bottom-left'
    | 'bottom'
    | 'bottom-right';

/** Row-major, so it lays out as the 3x3 picker grid. */
export const BACKGROUND_POSITIONS: readonly BackgroundPosition[] = [
    'top-left',
    'top',
    'top-right',
    'left',
    'center',
    'right',
    'bottom-left',
    'bottom',
    'bottom-right',
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
    // Same story as backgroundFit: absent reads as 'none' / 'both' / 'center'.
    backgroundScroll?: BackgroundScroll;
    backgroundRepeat?: BackgroundRepeat;
    backgroundPosition?: BackgroundPosition;
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
    const backgroundScroll = (t.backgroundScroll as BackgroundScroll) ?? 'none';
    if (!BACKGROUND_SCROLLS.includes(backgroundScroll)) return null;
    const backgroundRepeat = (t.backgroundRepeat as BackgroundRepeat) ?? 'both';
    if (!BACKGROUND_REPEATS.includes(backgroundRepeat)) return null;
    const backgroundPosition =
        (t.backgroundPosition as BackgroundPosition) ?? 'center';
    if (!BACKGROUND_POSITIONS.includes(backgroundPosition)) return null;
    return {
        panelColor,
        accentColor,
        backgroundColor,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
        topbar,
        backgroundFit,
        backgroundScroll,
        backgroundRepeat,
        backgroundPosition,
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

const REPEAT_CSS: Record<BackgroundRepeat, string> = {
    both: 'repeat',
    x: 'repeat-x',
    y: 'repeat-y',
    none: 'no-repeat',
};

/**
 * The CSS custom properties a backdrop paints its position and repeat from.
 * Static, so they render on the server with the page; the scroll vars that
 * need the image measured are added client-side (FittedBackdrop).
 */
export function backdropLayoutVars(
    theme: Pick<GameTheme, 'backgroundRepeat' | 'backgroundPosition'>,
): Record<string, string> {
    const position = theme.backgroundPosition ?? 'center';
    const x = position.endsWith('left')
        ? '0%'
        : position.endsWith('right')
          ? '100%'
          : '50%';
    const y = position.startsWith('top')
        ? '0%'
        : position.startsWith('bottom')
          ? '100%'
          : '50%';
    return {
        '--bg-x': x,
        '--bg-y': y,
        '--bg-repeat': REPEAT_CSS[theme.backgroundRepeat ?? 'both'],
    };
}

/**
 * Pan speed in px/s. speedrun.com moves the art 2000px per 180s / 120s / 60s
 * loop; we keep its speeds but loop on one tile width instead, so the pattern
 * wraps seamlessly where theirs jumps (2000px is rarely a whole number of
 * tiles).
 */
const SCROLL_PX_PER_SEC: Record<Exclude<BackgroundScroll, 'none'>, number> = {
    slow: 2000 / 180,
    medium: 2000 / 120,
    fast: 2000 / 60,
};

/**
 * The scroll loop for a background: how far one seamless cycle pans (the
 * width one copy of the image is drawn at) and how long it takes. Null when
 * the background doesn't scroll or the sizes aren't known.
 */
export function backdropScrollLoop(
    scroll: BackgroundScroll | undefined,
    fit: 'cover' | 'tile',
    image: { width: number; height: number },
    box: { width: number; height: number },
): { tileWidth: number; seconds: number } | null {
    if (!scroll || scroll === 'none') return null;
    if (image.width <= 0 || image.height <= 0) return null;
    const scale =
        fit === 'tile'
            ? 1
            : Math.max(box.width / image.width, box.height / image.height);
    const tileWidth = image.width * scale;
    if (!Number.isFinite(tileWidth) || tileWidth <= 0) return null;
    return { tileWidth, seconds: tileWidth / SCROLL_PX_PER_SEC[scroll] };
}
