'use client';

import { useLayoutEffect } from 'react';
import { publishThemeOptions } from '~src/components/theme-options-store';
import type { ThemePick } from '~src/lib/theme-settings';
import { allowedPicks, rememberedPick } from './theme-memory';
import { applyThemeScheme, holdThemeScheme } from './theme-scheme';

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
    context,
}: {
    kind: 'profile' | 'game';
    pick: ThemePick;
    page: { label: string } | null;
    mine: boolean;
    /** The runner or game this page belongs to (themeContext). */
    context: string;
}) {
    const label = page?.label ?? null;
    useLayoutEffect(() => {
        const html = document.documentElement;
        const current =
            rememberedPick(context, allowedPicks(label !== null, mine)) ?? pick;
        html.dataset.themePage = kind;
        html.dataset.themeDefault = pick;
        html.dataset.themePick = current;
        applyThemeScheme(current);
        const release = holdThemeScheme();
        publishThemeOptions({
            page: label === null ? null : { label },
            mine,
            defaultPick: current,
            context,
        });
        return () => {
            release();
            delete html.dataset.themePage;
            delete html.dataset.themeDefault;
            delete html.dataset.themePick;
            applyThemeScheme('none');
            publishThemeOptions(null);
        };
    }, [kind, pick, label, mine, context]);
    return null;
}
