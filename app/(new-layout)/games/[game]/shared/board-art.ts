'use client';

import { useEffect, useState } from 'react';

/**
 * The background art the page under a dialog is showing right now, or null.
 *
 * Read off the page rather than passed down: the board's backdrop and the
 * console's art band are both server-rendered beside the tree, not above it,
 * and on a public page the viewer's theme pick decides which backdrop shows.
 * Each carries `data-board-art`; the first one on screen is the one the page
 * wears. Read once on mount — a dialog is opened over a page, not across a
 * theme change.
 */
export function useBoardArt(): string | null {
    const [art, setArt] = useState<string | null>(null);
    useEffect(() => {
        for (const el of document.querySelectorAll<HTMLElement>(
            '[data-board-art]',
        )) {
            const url = el.dataset.boardArt;
            if (url && getComputedStyle(el).display !== 'none') {
                setArt(url);
                return;
            }
        }
    }, []);
    return art;
}
