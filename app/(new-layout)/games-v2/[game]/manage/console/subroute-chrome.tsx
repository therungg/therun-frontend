'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { ConsoleChrome } from './console-chrome';
import { buildNav, type NavFlags, type NavItemId } from './nav-model';

interface Props {
    game: ResolvedGame;
    categories: Array<{ id: number; display: string }>;
    flags: NavFlags;
    attentionCount: number;
    /** Which sidebar item (if any) represents the current sub-route page. */
    activeItem?: NavItemId | null;
    children: ReactNode;
}

/**
 * Wraps a moderation sub-route PAGE (runner / roster / run) in the persistent
 * console chrome so the sidebar stays put. Navigation is link-driven: the
 * roster item goes to its route; every console pane navigates back to the
 * console focused on that pane via `?pane=`.
 */
export function SubrouteChrome({
    game,
    categories,
    flags,
    attentionCount,
    activeItem = null,
    children,
}: Props) {
    const router = useRouter();
    const groups = useMemo(() => buildNav(flags), [flags]);
    const base = `/games-v2/${game.name}/manage`;

    const navigate = (id: NavItemId) => {
        if (id === 'roster') {
            router.push(`${base}/moderation/roster`);
            return;
        }
        // `history` and every content pane resolve back to the main console.
        router.push(id === 'history' ? base : `${base}?pane=${id}`);
    };

    return (
        <ConsoleChrome
            game={game}
            groups={groups}
            activeItem={activeItem}
            onNavigate={navigate}
            attentionCount={attentionCount}
            categories={categories}
            selectedCategoryId={null}
            onSelectCategory={() => {}}
        >
            {children}
        </ConsoleChrome>
    );
}
