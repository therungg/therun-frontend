'use client';

import { useEffect, useState } from 'react';
import { GameBlock } from './game-block';
import styles from './leaderboards-profile.module.scss';
import { clearFilters, RunsFilterBar } from './runs-filter-bar';
import {
    filterFromUrl,
    isNarrowed,
    isSearching,
    matchesEntry,
    platformOptions,
    runsOf,
    yearOptions,
} from './runs-filters';
import { useShowcase } from './showcase-provider';
import {
    mainGameOf,
    onBiggerBoard,
    orderGames,
    type SortMode,
    sortOptions,
} from './showcase-rules';
import { useProfileUrl } from './url-state';

/** Games open by default, counted down the list as it shows. */
const OPEN_AT_START = 4;

/** Every run, one panel per game, under the filter bar. */
export function RunsShelf({ country }: { country: string | null }) {
    const { games: unordered, draft, editing, setDraft } = useShowcase();
    const url = useProfileUrl();
    const { hash, sort } = url;
    const filter = filterFromUrl(url);
    const options = sortOptions(draft);
    const mode = (options as string[]).includes(sort)
        ? (sort as SortMode)
        : 'runner';
    const games = orderGames(unordered, draft, mode);
    const byRunners =
        (mode === 'runner' ? draft.gameOrder : mode) === 'runners';
    const mainId = mainGameOf(unordered, draft.mainGameId)?.gameId ?? null;
    const searching = isSearching(filter);
    const filtered = searching || isNarrowed(filter) || filter.archived;
    const hashId = hash.startsWith('game-') ? Number(hash.slice(5)) : null;

    // Games the viewer opened or closed, over each game's default.
    const [toggled, setToggled] = useState<Map<number, boolean>>(
        () => new Map(),
    );

    const blocks = games.map((game) => {
        const runs = runsOf(game, filter);
        const matching = runs.filter((e) => matchesEntry(game, e, filter));
        return {
            game,
            total: runs.length,
            // Ordered by board size, a game's biggest boards lead it too.
            entries: byRunners ? [...matching].sort(onBiggerBoard) : matching,
        };
    });
    const total = blocks.reduce((sum, b) => sum + b.total, 0);
    const shown = blocks.reduce((sum, b) => sum + b.entries.length, 0);
    // Searching keeps every game in view (quiet when nothing matches); any
    // other filter drops the games it empties. The game a `#game-<id>` hash
    // points at always stays.
    const visible = blocks.filter(
        (b) => b.entries.length > 0 || searching || b.game.gameId === hashId,
    );
    const openByDefault = (gameId: number, index: number) =>
        index < OPEN_AT_START || gameId === mainId || searching;

    // A `#game-<id>` hash (from the sidebar's Games card) opens that game and
    // scrolls to it once it is on the page.
    useEffect(() => {
        if (!hash.startsWith('game-')) return;
        const id = Number(hash.slice(5));
        if (unordered.some((g) => g.gameId === id)) {
            setToggled((m) => new Map(m).set(id, true));
        }
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    }, [hash]);

    // Edit mode with the runner's own order: the full ordered list is what
    // moves, so a panel's neighbours are the games around it on that list.
    const manual = editing && draft.gameOrder === 'manual' && mode === 'runner';
    const ordered = games.map((g) => g.gameId);
    const moveGame = (gameId: number, by: -1 | 1) => {
        const from = ordered.indexOf(gameId);
        const to = from + by;
        if (from < 0 || to < 0 || to >= ordered.length) return null;
        return () =>
            setDraft((d) => {
                const ids = [...ordered];
                [ids[from], ids[to]] = [ids[to], ids[from]];
                return { ...d, manualGameIds: ids };
            });
    };

    if (unordered.length === 0) {
        return <div className={styles.emptyNote}>No leaderboard runs yet.</div>;
    }

    return (
        <div className={styles.runs}>
            <RunsFilterBar
                filter={filter}
                shown={shown}
                total={total}
                platforms={platformOptions(unordered)}
                years={yearOptions(unordered)}
                sort={
                    unordered.length > 1
                        ? {
                              options,
                              current: (options as string[]).includes(sort)
                                  ? (sort as SortMode)
                                  : options[0],
                          }
                        : null
                }
            />
            <div className={styles.runsList}>
                {visible.map((b, i) => {
                    const id = b.game.gameId;
                    const open = toggled.get(id) ?? openByDefault(id, i);
                    return (
                        <GameBlock
                            key={id}
                            game={b.game}
                            entries={b.entries}
                            country={country}
                            open={open}
                            dim={b.entries.length === 0}
                            onToggle={() =>
                                setToggled((m) => new Map(m).set(id, !open))
                            }
                            onMove={
                                manual
                                    ? {
                                          up: moveGame(id, -1),
                                          down: moveGame(id, 1),
                                      }
                                    : undefined
                            }
                        />
                    );
                })}
                {shown === 0 ? (
                    <div className={styles.runsNothing}>
                        <span>
                            {filtered ? 'No runs match.' : 'No runs yet.'}
                        </span>
                        {filtered ? (
                            <button
                                type="button"
                                className={`${styles.tab} ${styles.tabActive}`}
                                onClick={clearFilters}
                            >
                                Clear filters
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
