'use client';

import { useEffect, useState } from 'react';
import { GameBlock } from './game-block';
import styles from './leaderboards-profile.module.scss';
import { OffBoardGames } from './owner-layer/off-board-rows';
import { useOwnerLayer } from './owner-layer/owner-layer-provider';
import { clearFilters, RunsFilterBar, setFilter } from './runs-filter-bar';
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
    byPoints,
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
    const {
        games: unordered,
        draft,
        editing,
        setDraft,
        boardsVisible,
    } = useShowcase();
    const layer = useOwnerLayer();
    const url = useProfileUrl();
    const { hash, sort } = url;
    const fromUrl = filterFromUrl(url);
    const all = unordered.flatMap((g) => [...g.entries, ...g.archived]);
    const hasFull = all.some((e) => e.level === null);
    const hasLevels = all.some((e) => e.level !== null);
    // A runner with only level runs sees them without asking.
    const filter =
        !hasFull && fromUrl.scope === 'full'
            ? { ...fromUrl, scope: 'any' as const }
            : fromUrl;
    const options = sortOptions(draft);
    const mode = (options as string[]).includes(sort)
        ? (sort as SortMode)
        : 'runner';
    const games = orderGames(unordered, draft, mode);
    const order = mode === 'runner' ? draft.gameOrder : mode;
    const mainId = mainGameOf(unordered, draft.mainGameId)?.gameId ?? null;
    const searching = isSearching(filter);
    const byStatus =
        layer.overview !== null &&
        layer.seesAny &&
        layer.statusFilter !== 'all';
    // Judged on the URL: the levels-only fallback above is not a filter.
    const filtered =
        searching || isNarrowed(fromUrl) || filter.archived || byStatus;
    // Runs with no public row carry no rank, platform or date to judge, so
    // they sit out any filter that reads those.
    const offBoard =
        layer.overview !== null &&
        filter.show === 'all' &&
        !filter.video &&
        filter.platform === '' &&
        filter.since === '';
    const hashId = hash.startsWith('game-') ? Number(hash.slice(5)) : null;

    // Games the viewer opened or closed, over each game's default.
    const [toggled, setToggled] = useState<Map<number, boolean>>(
        () => new Map(),
    );
    // A new search opens every game it keeps in view, and clearing it brings
    // the default folding back: the toggles belong to one search.
    const needle = filter.search.trim().toLowerCase();
    const [foldedFor, setFoldedFor] = useState(needle);
    if (foldedFor !== needle) {
        setFoldedFor(needle);
        setToggled(new Map());
    }

    const blocks = games.map((game) => {
        const runs = runsOf(game, filter);
        // Searching narrows them to the games it names.
        const layerHere =
            offBoard && (!needle || game.game.toLowerCase().includes(needle));
        const matching = runs.filter(
            (e) =>
                matchesEntry(game, e, filter) &&
                layer.sliceMatches(game.gameId, e.categoryId, e.subcategoryKey),
        );
        return {
            game,
            runs,
            layerHere,
            layerRows: layerHere ? layer.offBoardInGame(game.gameId).length : 0,
            // A game's runs follow the same measure as the games themselves.
            entries:
                order === 'placement'
                    ? [...matching].sort(byPoints)
                    : order === 'runners'
                      ? [...matching].sort(onBiggerBoard)
                      : matching,
        };
    });
    const total = blocks.reduce((sum, b) => sum + b.runs.length, 0);
    const anyArchived = unordered.some((g) => g.archived.length > 0);
    const shown = blocks.reduce((sum, b) => sum + b.entries.length, 0);
    const profileGameIds = new Set(unordered.map((g) => g.gameId));
    const extraGameRows =
        offBoard && layer.overview
            ? [...new Set(layer.overview.items.map((i) => i.gameId))]
                  .filter((id) => !profileGameIds.has(id))
                  .reduce((sum, id) => sum + layer.offBoardInGame(id).length, 0)
            : 0;
    const layerShown =
        blocks.reduce((sum, b) => sum + b.layerRows, 0) + extraGameRows;
    // Searching keeps every game in view (quiet when nothing matches); any
    // other filter drops the games it empties. The game a `#game-<id>` hash
    // points at always stays.
    const visible = blocks.filter(
        (b) =>
            b.entries.length > 0 ||
            b.layerRows > 0 ||
            searching ||
            b.game.gameId === hashId,
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
    // Hidden games would still count as neighbours, so moving waits until
    // nothing is filtered.
    const manual =
        editing &&
        draft.gameOrder === 'manual' &&
        mode === 'runner' &&
        !filtered;
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
        return (
            <div className={styles.runsList}>
                <div className={styles.emptyNote}>No leaderboard runs yet.</div>
                <OffBoardGames profileGameIds={profileGameIds} search="" />
            </div>
        );
    }

    return (
        <div className={styles.runs}>
            <RunsFilterBar
                filter={filter}
                shown={shown}
                total={total}
                platforms={platformOptions(unordered)}
                years={yearOptions(unordered)}
                levels={hasFull && hasLevels}
                status={
                    layer.overview && layer.seesAny
                        ? {
                              current: layer.statusFilter,
                              set: layer.setStatusFilter,
                          }
                        : null
                }
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
                    const empty = b.entries.length === 0 && b.layerRows === 0;
                    return (
                        <GameBlock
                            key={id}
                            game={b.game}
                            runs={b.runs}
                            entries={b.entries}
                            country={country}
                            boardsVisible={boardsVisible}
                            open={open}
                            dim={empty && searching}
                            unmatched={empty && !searching}
                            offBoard={b.layerHere}
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
                {offBoard ? (
                    <OffBoardGames
                        profileGameIds={profileGameIds}
                        search={filter.search}
                    />
                ) : null}
                {shown + layerShown === 0 && filtered ? (
                    <div className={styles.runsNothing}>
                        <span>No runs match.</span>
                        <button
                            type="button"
                            className={`${styles.tab} ${styles.tabActive}`}
                            onClick={() => {
                                clearFilters();
                                layer.setStatusFilter('all');
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                ) : null}
                {shown + layerShown === 0 && !filtered && !anyArchived ? (
                    <div className={styles.runsNothing}>No runs yet.</div>
                ) : null}
                {shown + layerShown === 0 && !filtered && anyArchived ? (
                    <div className={styles.runsNothing}>
                        <span>All runs are on archived boards.</span>
                        <button
                            type="button"
                            className={`${styles.tab} ${styles.tabActive}`}
                            onClick={() => setFilter({ archived: true })}
                        >
                            Include archived boards
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
