'use client';

import { useLayoutEffect } from 'react';
import { publishThemeOptions } from '~src/components/theme-options-store';
import type { ThemePick } from '~src/lib/theme-settings';

/**
 * Re-applies the pick attributes on client-side navigation (the inline script
 * only runs on the first HTML load), clears them when the page unmounts so an
 * unthemed page carries no pick, and publishes the options for the header menu.
 */
export function ThemePickSync({
    kind,
    pick,
    page,
    mine,
}: {
    kind: 'profile' | 'game';
    pick: ThemePick;
    page: { label: string } | null;
    mine: boolean;
}) {
    const label = page?.label ?? null;
    useLayoutEffect(() => {
        const html = document.documentElement;
        html.dataset.themePage = kind;
        html.dataset.themeDefault = pick;
        html.dataset.themePick = pick;
        publishThemeOptions({
            page: label === null ? null : { label },
            mine,
            defaultPick: pick,
        });
        return () => {
            delete html.dataset.themePage;
            delete html.dataset.themeDefault;
            delete html.dataset.themePick;
            publishThemeOptions(null);
        };
    }, [kind, pick, label, mine]);
    return null;
}
