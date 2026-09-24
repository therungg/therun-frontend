'use client';

import { createContext, type ReactNode, useContext } from 'react';
import { OWN_THEME_ATTR, THEME_PORTAL_CLASS } from '../theme/theme-css';

/**
 * Themed dialogs and popovers portal to <body> and pick the board theme up
 * from the page's theme stylesheet. The console doesn't wear the board theme,
 * so there they'd come out in the site's default look. The console layout
 * ships a stylesheet that themes such portals on their own
 * (`buildOwnPortalThemeCss`) and says so here; a surface that should always
 * wear the theme (the run review modal) opts its portals into it.
 */
const OwnThemeReady = createContext(false);
const WearsOwnTheme = createContext(false);

/** Set by a layout whose stylesheet carries the own-portal theme. */
export function OwnPortalThemeReady({
    ready,
    children,
}: {
    ready: boolean;
    children: ReactNode;
}) {
    return <OwnThemeReady value={ready}>{children}</OwnThemeReady>;
}

/**
 * Every themed portal opened from inside `children` (the surface itself and
 * any dialog or menu it opens) wears the board theme even where the page
 * doesn't. On a themed public page this changes nothing.
 */
export function WearOwnPortalTheme({ children }: { children: ReactNode }) {
    const ready = useContext(OwnThemeReady);
    return <WearsOwnTheme value={ready}>{children}</WearsOwnTheme>;
}

/** Class and attributes for a portal's root, given its `themed` prop. */
export function usePortalTheme(themed: boolean): {
    className: string;
    attrs: Record<string, string>;
} {
    const own = useContext(WearsOwnTheme);
    if (!themed) return { className: '', attrs: {} };
    return {
        className: ` ${THEME_PORTAL_CLASS}`,
        attrs: own ? { [OWN_THEME_ATTR]: '', 'data-bs-theme': 'dark' } : {},
    };
}
