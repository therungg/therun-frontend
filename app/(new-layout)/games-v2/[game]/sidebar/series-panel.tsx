import Link from '~src/components/link';
import type { GameSeriesSibling } from '~src/lib/game-mgmt';
import styles from './sidebar.module.scss';

const MAX_SHOWN = 6;

/**
 * Other games in the same series — cross-navigation the wall otherwise has
 * none of. Dormant until the backend bakes `seriesGames` into pageData
 * (plan handoff #2): with no siblings there is no panel, not an empty one.
 */
export function SeriesPanel({
    seriesDisplay,
    games,
}: {
    seriesDisplay: string | null;
    games: GameSeriesSibling[];
}) {
    if (games.length === 0) return null;
    const shown = [...games]
        .sort(
            (a, b) =>
                (a.sortOrderInSeries ?? Number.MAX_SAFE_INTEGER) -
                (b.sortOrderInSeries ?? Number.MAX_SAFE_INTEGER),
        )
        .slice(0, MAX_SHOWN);
    const overflow = games.length - shown.length;

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>
                {seriesDisplay ? `More in ${seriesDisplay}` : 'Same series'}
            </span>
            <ul className="list-unstyled mb-0">
                {shown.map((g) => (
                    <li key={g.slug} className={styles.seriesRow}>
                        <Link
                            href={`/games-v2/${encodeURIComponent(g.slug)}`}
                            className={styles.seriesLink}
                        >
                            {g.coverUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={g.coverUrl}
                                    alt=""
                                    aria-hidden
                                    width={24}
                                    height={32}
                                    loading="lazy"
                                    className={styles.seriesArt}
                                />
                            )}
                            <span className={styles.seriesName}>
                                {g.display}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
            {overflow > 0 && (
                <p className={`${styles.rowMeta} mb-0`}>+{overflow} more</p>
            )}
        </section>
    );
}
