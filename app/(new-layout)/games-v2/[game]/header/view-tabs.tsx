'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Link from '~src/components/link';
import styles from './view-tabs.module.scss';

interface Props {
    gameSlug: string;
    /** Game has finished races on the race API — adds the Races tab. */
    showRaces?: boolean;
}

// Dropped from the carried query string: each names something specific to
// the view being left, not the picked board. `board`/`categories` are the
// two routes' own category selectors, `page` is a board page number,
// `combined` is the overview's own toggle, and `submit` is the one-shot
// deep link that opens the submit dialog.
const DROPPED_PARAMS = ['board', 'page', 'categories', 'combined', 'submit'];

/**
 * The game root's view switcher: the category wall vs cross-category
 * standings. Real routes rather than client state — standings pulls roughly
 * an order of magnitude more data than the overview, and paying that cost on
 * every overview visit to power a tab most people never press would be the
 * wrong trade. Routes also give standings its own loading skeleton, its own
 * metadata, and a shareable URL.
 *
 * Render only where the tabs are meaningful: the caller is responsible for
 * suppressing this on games with fewer than two featured categories, since
 * standings across a single category is just that category's board.
 */
export function ViewTabs({ gameSlug, showRaces = false }: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const base = `/games-v2/${encodeURIComponent(gameSlug)}`;

    // The subcategory picker's own selection (and any other carry-worthy
    // query state) rides along onto Categories and Standings — the two
    // views the picker actually spans — so switching tabs keeps the picked
    // board instead of resetting to the game's defaults.
    const carried = new URLSearchParams(searchParams.toString());
    for (const key of DROPPED_PARAMS) carried.delete(key);
    const query = carried.toString();
    const withQuery = (href: string) => (query ? `${href}?${query}` : href);

    const tabs = [
        { href: base, label: 'Categories', keepQuery: true },
        { href: `${base}/standings`, label: 'Standings', keepQuery: true },
        { href: `${base}/stats`, label: 'Stats', keepQuery: false },
        ...(showRaces
            ? [{ href: `${base}/races`, label: 'Races', keepQuery: false }]
            : []),
    ];

    return (
        <nav className={styles.tabs} aria-label="Game views">
            {tabs.map((t) => {
                const active = pathname === t.href;
                return (
                    <Link
                        key={t.href}
                        href={t.keepQuery ? withQuery(t.href) : t.href}
                        className={active ? styles.tabActive : styles.tab}
                        aria-current={active ? 'page' : undefined}
                    >
                        {t.label}
                    </Link>
                );
            })}
        </nav>
    );
}
