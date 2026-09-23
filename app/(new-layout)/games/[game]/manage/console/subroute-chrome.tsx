'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { QUEUE_BADGE_COPY } from '~src/components/console-chrome/attention-badge-content';
import styles from '~src/components/console-chrome/console.module.scss';
import { ConsoleChrome } from '~src/components/console-chrome/console-chrome';
import { NAV_ICON } from '~src/components/console-chrome/nav-icons';
import Link from '~src/components/link';
import { gameBackLink } from '~src/lib/board-url';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import { BackLink } from '../../shared/back-link';
import {
    buildFooterNav,
    buildNav,
    type NavFlags,
    type NavItemId,
} from './nav-model';

interface Props {
    game: ResolvedGame;
    flags: NavFlags;
    /** Runs in the Queue waiting on this moderator. */
    queueCount: number;
    /** The queue could not be read — the badge shows that, not a count. */
    badgeDegraded?: boolean;
    /** How many games this viewer moderates — the "All your games" link to
     * the cross-game hub only shows when there's more than one. */
    moderatedGamesCount?: number;
    /** Which sidebar item (if any) represents the current sub-route page. */
    activeItem?: NavItemId | null;
    children: ReactNode;
}

/**
 * Wraps a moderation sub-route PAGE (the runner page) in the persistent
 * console chrome so the sidebar stays put. Navigation is link-driven: every
 * console pane navigates back to the console focused on that pane via
 * `?pane=`.
 */
export function SubrouteChrome({
    game,
    flags,
    queueCount,
    badgeDegraded = false,
    moderatedGamesCount = 0,
    activeItem = null,
    children,
}: Props) {
    const router = useRouter();
    const groups = useMemo(() => buildNav(flags), [flags]);
    const footerItems = useMemo(() => buildFooterNav(flags), [flags]);
    const base = `/games/${encodeURIComponent(game.name)}/manage`;

    // Every sidebar door on a sub-route page is a real cross-page link — even
    // History, which the console opens as a drawer on arrival (?pane=history).
    const hrefFor = (id: string): string => {
        if (id === 'setup')
            return `/games/${encodeURIComponent(game.name)}/setup`;
        if (id === 'overview') return base;
        return `${base}?pane=${id}`;
    };

    // Fallback for onNavigate — the links from hrefFor cover normal clicks;
    // this only matters for callers that navigate programmatically.
    const navigate = (id: NavItemId) => {
        router.push(hrefFor(id));
    };

    return (
        <ConsoleChrome
            header={{
                title: game.display,
                titleHref: `/games/${encodeURIComponent(game.name)}/manage`,
                image: game.image,
                actions: (
                    <>
                        {moderatedGamesCount > 1 && (
                            <Link
                                href="/games/manage"
                                className={styles.allGamesLink}
                            >
                                All your games
                            </Link>
                        )}
                        <BackLink
                            {...gameBackLink(
                                game,
                                flags.boardsVisible === true,
                            )}
                        />
                    </>
                ),
            }}
            icons={NAV_ICON}
            navAriaLabel="Game admin console"
            cockpit
            groups={groups}
            activeItem={activeItem}
            onNavigate={(id) => navigate(id as NavItemId)}
            hrefFor={hrefFor}
            footerItems={footerItems}
            badges={
                queueCount > 0 || badgeDegraded
                    ? {
                          'mod-queue': {
                              count: queueCount,
                              degraded: badgeDegraded,
                              copy: QUEUE_BADGE_COPY,
                          },
                      }
                    : {}
            }
        >
            {children}
        </ConsoleChrome>
    );
}
