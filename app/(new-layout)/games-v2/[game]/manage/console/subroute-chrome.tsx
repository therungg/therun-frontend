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
    /** True when one or more attention sources failed to load — the badge
     * count may be an undercount, not a confirmed total. */
    badgeDegraded?: boolean;
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
    badgeDegraded = false,
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
        if (id === 'reports') {
            router.push(`${base}?pane=attention&kind=report`);
            return;
        }
        // `history` carries `?pane=history` too, so the console opens the
        // drawer on arrival instead of just landing on the default pane.
        router.push(`${base}?pane=${id}`);
    };

    return (
        <ConsoleChrome
            game={game}
            groups={groups}
            activeItem={activeItem}
            onNavigate={navigate}
            attentionCount={attentionCount}
            badgeDegraded={badgeDegraded}
            categories={categories}
            selectedCategoryId={null}
            onSelectCategory={() => {}}
        >
            {children}
        </ConsoleChrome>
    );
}
