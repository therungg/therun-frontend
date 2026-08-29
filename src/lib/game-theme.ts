/**
 * Per-game board theme, mirrored by hand from the backend
 * (therun/src/types/game-theme.ts) per the no-shared-types contract.
 * Deliberately not free-form colors: every painted value is derived from
 * (hue, saturation), so a stored theme is legible by construction. See
 * docs/plans/2026-08-30-board-theme-design.md.
 */
export interface GameTheme {
    hue: number; // integer 0–359
    saturation: number; // integer 20–70
    backgroundUrl: string | null;
    panelOpacity: number; // 0.85–1.0
}

/** Lenient read-side parse: malformed themes render as unthemed, never 500. */
export function parseGameTheme(raw: unknown): GameTheme | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const t = raw as Record<string, unknown>;
    const { hue, saturation, backgroundUrl, panelOpacity } = t;
    if (!Number.isInteger(hue) || (hue as number) < 0 || (hue as number) > 359)
        return null;
    if (
        !Number.isInteger(saturation) ||
        (saturation as number) < 20 ||
        (saturation as number) > 70
    )
        return null;
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
        hue: hue as number,
        saturation: saturation as number,
        backgroundUrl: (backgroundUrl as string | null) ?? null,
        panelOpacity,
    };
}
