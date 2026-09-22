'use client';

import type { ReactNode } from 'react';
import styles from './board-nav-region.module.scss';
import { BoardNavProvider, useBoardNavState } from './use-board-nav';

interface Props {
    /** The class the region would have carried anyway — this stands in for
     * the element it replaces, so no wrapper is added to the layout. */
    className?: string;
    children: ReactNode;
}

/**
 * The board column's nav state for a page that isn't the board page.
 *
 * GamePage owns one `useBoardNavState` and dims its `.colMain` off it, so
 * every control under it can push a URL and have the whole region say it is
 * waiting. The overview, levels and standings pages carry board controls of
 * their own (the slice picker, the standings toggles) but never had a
 * provider, so those controls navigated bare — nothing dimmed, nothing said
 * the press had landed.
 *
 * This is that same arrangement, as one component: it holds the state,
 * publishes it, and wears the stale look itself.
 */
export function BoardNavRegion({ className, children }: Props) {
    const nav = useBoardNavState();
    return (
        <BoardNavProvider value={nav}>
            {/* Not `inert`, which the board column can afford because its
                controls live outside it: here the control that started the
                navigation is inside this region, and taking the region out
                of the AT tree would take its own busy state with it. */}
            <div
                className={`${className ?? ''} ${nav.isPending ? styles.pending : ''}`}
            >
                {children}
            </div>
        </BoardNavProvider>
    );
}
