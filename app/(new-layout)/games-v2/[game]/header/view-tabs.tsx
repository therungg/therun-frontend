'use client';

import { usePathname } from 'next/navigation';
import Link from '~src/components/link';
import styles from './view-tabs.module.scss';

interface Props {
    gameSlug: string;
}

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
export function ViewTabs({ gameSlug }: Props) {
    const pathname = usePathname();
    const base = `/games-v2/${gameSlug}`;
    const onStandings = pathname === `${base}/standings`;

    return (
        <nav className={styles.tabs} aria-label="Game views">
            <Link
                href={base}
                className={onStandings ? styles.tab : styles.tabActive}
                aria-current={onStandings ? undefined : 'page'}
            >
                Categories
            </Link>
            <Link
                href={`${base}/standings`}
                className={onStandings ? styles.tabActive : styles.tab}
                aria-current={onStandings ? 'page' : undefined}
            >
                Standings
            </Link>
        </nav>
    );
}
