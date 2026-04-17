import type { PatronPreferences } from '../../../../types/patreon.types';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export interface ValidationResult {
    ok: boolean;
    errors: string[];
}

export function validatePrefs(p: PatronPreferences): ValidationResult {
    const errors: string[] = [];

    if (p.customColor) {
        if (!HEX.test(p.customColor.dark))
            errors.push('Dark solid color is not a valid hex.');
        if (!HEX.test(p.customColor.light))
            errors.push('Light solid color is not a valid hex.');
    }

    if (p.customGradient) {
        for (const mode of ['dark', 'light'] as const) {
            const stops = p.customGradient[mode];
            if (!Array.isArray(stops) || stops.length < 2 || stops.length > 6) {
                errors.push(`${mode} gradient must have 2–6 stops.`);
            } else if (stops.some((s) => !HEX.test(s))) {
                errors.push(`${mode} gradient has an invalid hex stop.`);
            }
        }
    }

    if (p.gradientAngle) {
        for (const mode of ['dark', 'light'] as const) {
            const a = p.gradientAngle[mode];
            if (!Number.isFinite(a) || a < 0 || a > 360) {
                errors.push(`${mode} gradient angle must be 0–360.`);
            }
        }
    }

    return { ok: errors.length === 0, errors };
}
