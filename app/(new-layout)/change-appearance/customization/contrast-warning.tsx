'use client';
import { resolveFill } from '~src/components/patreon/patron-style';
import type { PatronPreferences } from '../../../../types/patreon.types';
import styles from './customization.module.scss';

const DARK_BG = '#0d0e12';
const LIGHT_BG = '#ffffff';

function parseHex(hex: string): [number, number, number] | null {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3)
        h = h
            .split('')
            .map((c) => c + c)
            .join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
    const [r, g, b] = rgb.map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(hexA: string, hexB: string): number | null {
    const a = parseHex(hexA);
    const b = parseHex(hexB);
    if (!a || !b) return null;
    const la = luminance(a);
    const lb = luminance(b);
    const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
    return (lighter + 0.05) / (darker + 0.05);
}

function colorsToCheck(
    prefs: PatronPreferences,
    tier: number,
    theme: 'dark' | 'light',
): string[] {
    const fill = resolveFill(prefs, tier, theme);
    if (fill.kind === 'solid') return [fill.value];
    return [fill.value[0], fill.value[fill.value.length - 1]];
}

interface ContrastWarningProps {
    prefs: PatronPreferences;
    tier: number;
}

export function ContrastWarning({ prefs, tier }: ContrastWarningProps) {
    const messages: string[] = [];
    for (const theme of ['dark', 'light'] as const) {
        const bg = theme === 'dark' ? DARK_BG : LIGHT_BG;
        const colors = colorsToCheck(prefs, tier, theme);
        const failing = colors.some((c) => {
            const ratio = contrast(c, bg);
            return ratio !== null && ratio < 4.5;
        });
        if (failing) {
            messages.push(
                theme === 'dark'
                    ? 'Your name may be hard to read in dark mode.'
                    : 'Your name may be hard to read in light mode.',
            );
        }
    }
    if (messages.length === 0) return null;
    return (
        <div className={styles.contrastWarning}>
            {messages.map((m, i) => (
                <div key={i}>⚠ {m}</div>
            ))}
        </div>
    );
}
