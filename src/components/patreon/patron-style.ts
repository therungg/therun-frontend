import type { CSSProperties } from 'react';
import { ensureTextContrast } from '~app/(new-layout)/games/[game]/theme/theme-normalize';
import type { PatronPreferences } from '../../../types/patreon.types';
import { legacyPresetMap } from './legacy-preset-map';

export type Theme = 'dark' | 'light';

type ResolvedFill =
    | { kind: 'solid'; value: string }
    | { kind: 'gradient'; value: string[] };

export function defaultTierColor(_tier: number, theme: Theme): string {
    // Tiers 1-3 all default to the existing tier-1 preset color.
    return theme === 'dark' ? '#27A11B' : '#007c00';
}

// What a name is checked against per mode: the site's dark panel (board
// themes are dark tints of about the same depth) and white.
const NAME_SURFACE: Record<Theme, string> = {
    dark: '#161c18',
    light: '#ffffff',
};
const NAME_MIN_CONTRAST = 4.5;
const HEX = /^#[0-9a-f]{6}$/i;

/**
 * A picked name color, lifted (or darkened) until it reads on its mode's
 * surface. Pure blue or a gradient passing through near-black was being
 * picked for dark mode, and the name vanished into the panel.
 */
function legible(color: string, theme: Theme): string {
    if (!HEX.test(color)) return color;
    return ensureTextContrast(
        color.toLowerCase(),
        NAME_SURFACE[theme],
        NAME_MIN_CONTRAST,
    );
}

export function resolveFill(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
): ResolvedFill {
    const fill = pickedFill(prefs, tier, theme);
    return fill.kind === 'gradient'
        ? { kind: 'gradient', value: fill.value.map((c) => legible(c, theme)) }
        : { kind: 'solid', value: legible(fill.value, theme) };
}

function pickedFill(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
): ResolvedFill {
    if (prefs?.customGradient) {
        return { kind: 'gradient', value: prefs.customGradient[theme] };
    }
    if (prefs?.customColor) {
        return { kind: 'solid', value: prefs.customColor[theme] };
    }
    const legacy = legacyPresetMap(prefs?.colorPreference);
    if (legacy) {
        return legacy.kind === 'gradient'
            ? { kind: 'gradient', value: legacy.value[theme] }
            : { kind: 'solid', value: legacy.value[theme] };
    }
    return { kind: 'solid', value: defaultTierColor(tier, theme) };
}

export function buildPatronStyle(
    prefs: PatronPreferences | null | undefined,
    tier: number,
    theme: Theme,
): CSSProperties {
    const fill = resolveFill(prefs, tier, theme);
    const isGradient = fill.kind === 'gradient';

    const animated = isGradient && !!prefs?.gradientAnimated;

    const angle = prefs?.gradientAngle?.[theme] ?? 90;
    const backgroundImage = isGradient
        ? animated
            ? `linear-gradient(var(--patron-grad-angle, ${angle}deg), ${(fill.value as string[]).join(',')})`
            : `linear-gradient(${angle}deg, ${(fill.value as string[]).join(',')})`
        : undefined;

    const style: CSSProperties = {
        backgroundImage,
        WebkitBackgroundClip: isGradient ? 'text' : undefined,
        backgroundClip: isGradient ? 'text' : undefined,
        color: isGradient ? 'transparent' : (fill.value as string),
        WebkitTextFillColor: isGradient ? 'transparent' : undefined,
        fontWeight: prefs?.bold ? 700 : 400,
        fontStyle: prefs?.italic ? 'italic' : 'normal',
    };

    if (animated) {
        style.animation = 'patron-gradient 6s linear infinite';
    }

    return style;
}
