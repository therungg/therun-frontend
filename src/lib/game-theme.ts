/**
 * Per-game board theme, mirrored by hand from the backend
 * (therun/src/types/game-theme.ts) per the no-shared-types contract.
 * Three picked colors; theme-css.ts derives borders, recesses, accents and
 * readable text from them, so a stored theme is legible by construction.
 * See docs/plans/2026-08-30-per-element-game-theme-design.md.
 */
export interface GameTheme {
    panelColor: string; // lowercase #rrggbb — board/table surface
    accentColor: string; // lowercase #rrggbb — links, highlights, active
    backgroundColor: string; // lowercase #rrggbb — page canvas
    backgroundUrl: string | null;
    panelOpacity: number; // 0.85–1.0
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
    return {
        panelColor,
        accentColor,
        backgroundColor,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
    };
}
