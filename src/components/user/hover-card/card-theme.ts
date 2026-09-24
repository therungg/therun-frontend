import type { CSSProperties } from 'react';
import { deriveThemeVars } from '~app/(new-layout)/games/[game]/theme/theme-css';
import type { GameTheme } from '~src/lib/game-theme';

/**
 * The board vars a card needs to wear a theme. Only what a panel reads: the
 * canvas text set (`--bs-*-color`) is left out, because the card is a panel
 * and `board-surface` points those at the panel ink; the canvas and topbar
 * vars are left out because they belong to the page, not to a popover.
 */
const CARD_KEYS = [
    '--board-surface-bg',
    '--board-surface-border',
    '--board-recess-bg',
    '--board-recess-strong-bg',
    '--board-accent',
    '--board-accent-soft',
    '--board-on-accent',
    '--bs-primary',
    '--bs-primary-rgb',
    '--board-ink',
    '--board-ink-emphasis',
    '--board-ink-secondary',
    '--board-ink-tertiary',
] as const;

/**
 * A runner's theme as inline custom properties on the card root, so it stays
 * on the card and never reaches the page under it. Same derivation as the
 * boards. The background art is dropped: a floating surface gets a solid
 * panel (as a dialog does), and without art the panel is the flat,
 * full-strength colour.
 */
export function cardThemeStyle(theme: GameTheme): CSSProperties {
    const vars = deriveThemeVars({ ...theme, backgroundUrl: null }, 'dark');
    const style: Record<string, string> = {};
    for (const key of CARD_KEYS) style[key] = vars[key];
    // Text that sets no colour of its own inherits from the page, which may
    // be in light mode.
    style.color = vars['--board-ink'];
    return style as CSSProperties;
}
