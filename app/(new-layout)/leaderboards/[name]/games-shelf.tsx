'use client';

import { useState } from 'react';
import { GameImage } from '~src/components/image/gameimage';
import { formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';
import { useShowcase } from './showcase-provider';
import {
    COLLAPSE_AT,
    orderGames,
    SHELF_SCROLL_AT,
    type SortMode,
    sortOptions,
} from './showcase-rules';
import { setProfileUrl, useProfileUrl } from './url-state';

const n = (v: number) => v.toLocaleString('en-US');
const MEDALS: Record<number, string> = { 1: 'gold', 2: 'silver', 3: 'bronze' };

/** Every game as an art tile with its best rank; a tile filters the ledger. */
export function GamesShelf() {
    const { games: unordered, draft } = useShowcase();
    const { sort } = useProfileUrl();
    const [showAll, setShowAll] = useState(false);
    if (unordered.length < 2) return null;
    const options = sortOptions(draft);
    const mode = (options as string[]).includes(sort)
        ? (sort as SortMode)
        : 'runner';
    const games = orderGames(unordered, draft, mode);
    const scrolls = games.length > SHELF_SCROLL_AT && !showAll;

    return (
        <section className={styles.card} aria-labelledby="profile-games">
            <h2 id="profile-games" className={styles.cardTitle}>
                Games
            </h2>
            <div
                className={
                    scrolls
                        ? `${styles.shelf} ${styles.shelfScroll}`
                        : styles.shelf
                }
            >
                {games.map((game) => {
                    const medal =
                        game.bestRank !== null
                            ? MEDALS[game.bestRank]
                            : undefined;
                    const line = [
                        game.attempts !== null
                            ? `${n(game.attempts)} attempts`
                            : null,
                        game.lastRanAt
                            ? formatProfileDate(game.lastRanAt)
                            : null,
                    ].filter(Boolean);
                    return (
                        <button
                            key={game.gameId}
                            type="button"
                            className={styles.shelfTile}
                            onClick={() =>
                                unordered.length >= COLLAPSE_AT
                                    ? setProfileUrl({
                                          game: game.game,
                                          hash: `game-${game.gameId}`,
                                      })
                                    : setProfileUrl({
                                          hash: `game-${game.gameId}`,
                                      })
                            }
                        >
                            <span className={styles.shelfArt}>
                                <GameImage
                                    src={game.imageUrl ?? ''}
                                    alt=""
                                    quality="small"
                                    width={48}
                                    height={64}
                                />
                                {game.bestRank !== null ? (
                                    <span
                                        className={styles.shelfBadge}
                                        data-medal={medal}
                                    >
                                        #{game.bestRank}
                                    </span>
                                ) : null}
                            </span>
                            <span className={styles.gameListText}>
                                <span className={styles.gameListName}>
                                    {game.game}
                                </span>
                                {line.length > 0 ? (
                                    <span className={styles.gameListLine}>
                                        {line.join(' · ')}
                                    </span>
                                ) : null}
                            </span>
                        </button>
                    );
                })}
            </div>
            {games.length > SHELF_SCROLL_AT ? (
                <button
                    type="button"
                    className={styles.tab}
                    onClick={() => setShowAll((v) => !v)}
                >
                    {showAll ? 'Show fewer' : `Show all ${n(games.length)}`}
                </button>
            ) : null}
        </section>
    );
}
