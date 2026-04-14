import type { CSSProperties } from 'react';
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

export function resolveFill(
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

    const backgroundValue = isGradient
        ? `linear-gradient(${prefs?.gradientAngle?.[theme] ?? 90}deg, ${fill.value.join(',')})`
        : undefined;

    const style: CSSProperties = {
        background: backgroundValue,
        WebkitBackgroundClip: isGradient ? 'text' : undefined,
        backgroundClip: isGradient ? 'text' : undefined,
        color: isGradient ? 'transparent' : (fill.value as string),
        WebkitTextFillColor: isGradient ? 'transparent' : undefined,
        fontWeight: prefs?.bold ? 700 : 400,
        fontStyle: prefs?.italic ? 'italic' : 'normal',
    };

    if (prefs?.textShadow) {
        const s = prefs.textShadow[theme];
        style.textShadow = `0 0 ${s.blur}px ${s.color}`;
    }

    if (prefs?.outline) {
        const o = prefs.outline[theme];
        style.WebkitTextStroke = `${o.width}px ${o.color}`;
    }

    if (isGradient && prefs?.gradientAnimated) {
        style.animation = 'patron-gradient 6s linear infinite';
        style.backgroundSize = '200% 100%';
    }

    return style;
}
