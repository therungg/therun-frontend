'use client';
import { useEffect, useState } from 'react';
import { getColorMode } from '~src/utils/colormode';
import { resolveFill, type Theme } from './patron-style';
import { usePatreons } from './use-patreons';

export interface PatronCardStyles {
    hasPatron: boolean;
    patronTier: number;
    borderColor: string;
    patronPrimary: string;
    patronGradient: string;
    isGradient: boolean;
    isAnimated: boolean;
}

const EMPTY: PatronCardStyles = {
    hasPatron: false,
    patronTier: 0,
    borderColor: '',
    patronPrimary: '',
    patronGradient: '',
    isGradient: false,
    isAnimated: false,
};

export function usePatronCardStyles(username: string): PatronCardStyles {
    const { data: patreons, isLoading } = usePatreons();
    const [theme, setTheme] = useState<Theme>('dark');
    const [styles, setStyles] = useState<PatronCardStyles>(EMPTY);

    useEffect(() => {
        setTheme(getColorMode() === 'light' ? 'light' : 'dark');
    }, []);

    useEffect(() => {
        if (isLoading || !patreons) return;
        const patron = patreons[username];
        if (!patron || patron.preferences?.hide) {
            setStyles(EMPTY);
            return;
        }

        const fill = resolveFill(patron.preferences, patron.tier, theme);
        const patronTier = Math.min(patron.tier, 3);

        if (fill.kind === 'gradient') {
            const angle = patron.preferences?.gradientAngle?.[theme] ?? 90;
            setStyles({
                hasPatron: true,
                patronTier,
                borderColor: fill.value[0],
                patronPrimary: fill.value[0],
                patronGradient: `linear-gradient(${angle}deg, ${fill.value.join(', ')})`,
                isGradient: true,
                isAnimated: !!patron.preferences?.gradientAnimated,
            });
        } else {
            setStyles({
                hasPatron: true,
                patronTier,
                borderColor: fill.value,
                patronPrimary: fill.value,
                patronGradient: '',
                isGradient: false,
                isAnimated: false,
            });
        }
    }, [patreons, isLoading, username, theme]);

    return styles;
}
