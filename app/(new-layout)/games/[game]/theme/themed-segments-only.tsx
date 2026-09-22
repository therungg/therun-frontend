'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The game's public pages: the root route (board or category wall, segment
 * null) and its tabs, run and manual-time pages. The consoles under the same
 * [game] segment (/manage, /setup, /claim, /submit) never wear the board
 * theme, so the layout's theme renders only here.
 */
const THEMED = new Set<string | null>([
    null,
    'levels',
    'extensions',
    'standings',
    'stats',
    'races',
    'run',
    'manual',
]);

export function ThemedSegmentsOnly({ children }: { children: ReactNode }) {
    const segment = useSelectedLayoutSegment();
    return THEMED.has(segment) ? children : null;
}
