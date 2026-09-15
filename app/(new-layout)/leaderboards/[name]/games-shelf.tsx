'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import { formatProfileDate } from './format';
import styles from './leaderboards-profile.module.scss';
import { move, readDragIndex, writeDragIndex } from './reorder';
import { useShowcase } from './showcase-provider';
import {
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
    const { games: unordered, draft, editing, setDraft } = useShowcase();
    const { sort } = useProfileUrl();
    const [showAll, setShowAll] = useState(false);
    if (unordered.length < 2) return null;
    const manual = editing && draft.gameOrder === 'manual';
    const options = sortOptions(draft);
    const mode = (options as string[]).includes(sort)
        ? (sort as SortMode)
        : 'runner';
    const games = manual
        ? orderGames(
              unordered,
              { gameOrder: 'manual', manualGameIds: draft.manualGameIds },
              'runner',
          )
        : orderGames(unordered, draft, mode);
    const ids = games.map((g) => g.gameId);
    const moveGame = (from: number, to: number) =>
        setDraft((d) => ({ ...d, manualGameIds: move(ids, from, to) }));
    const scrolls = games.length > SHELF_SCROLL_AT && !showAll;

    return (
        <section className={styles.card} aria-labelledby="profile-games">
            <h2 id="profile-games" className={styles.cardTitle}>
                Games
            </h2>
            <div
                className={[
                    styles.shelf,
                    scrolls ? styles.shelfScroll : '',
                    manual ? styles.shelfManual : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {games.map((game, i) => {
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
                    const content = (
                        <>
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
                        </>
                    );
                    if (manual) {
                        return (
                            <div
                                key={game.gameId}
                                className={styles.shelfTile}
                                draggable
                                onDragStart={(e) =>
                                    writeDragIndex(e, 'games', i)
                                }
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    const from = readDragIndex(e, 'games');
                                    if (from === null) return;
                                    moveGame(from, i);
                                }}
                            >
                                {content}
                                <span className={styles.pinTools}>
                                    <button
                                        type="button"
                                        className={styles.tab}
                                        aria-label="Move up"
                                        disabled={i === 0}
                                        onClick={() => moveGame(i, i - 1)}
                                    >
                                        <ArrowUp size={14} aria-hidden />
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.tab}
                                        aria-label="Move down"
                                        disabled={i === games.length - 1}
                                        onClick={() => moveGame(i, i + 1)}
                                    >
                                        <ArrowDown size={14} aria-hidden />
                                    </button>
                                </span>
                            </div>
                        );
                    }
                    return (
                        <button
                            key={game.gameId}
                            type="button"
                            className={styles.shelfTile}
                            onClick={() =>
                                setProfileUrl({
                                    game: '',
                                    hash: `game-${game.gameId}`,
                                })
                            }
                        >
                            {content}
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
