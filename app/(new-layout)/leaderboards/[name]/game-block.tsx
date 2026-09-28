'use client';

import { ArrowDown, ArrowUp, ChevronDown } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { EntryWithEarlierPbs } from './earlier-pbs';
import { RankBall } from './entry-row';
import {
    entryHref,
    formatEntryTime,
    gameRefOf,
    medalOf,
    profileBoardHref,
    profileGameHref,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { OffBoardRows } from './owner-layer/off-board-rows';
import { useOwnerLayer } from './owner-layer/owner-layer-provider';
import { entryPoints, onBiggerBoard } from './showcase-rules';

const n = (v: number) => v.toLocaleString('en-US');

function groupByLevel(entries: LeaderboardsProfileEntry[]) {
    const plain = entries.filter((e) => e.level === null);
    const levels = new Map<string, LeaderboardsProfileEntry[]>();
    for (const e of entries) {
        if (e.level === null) continue;
        levels.set(e.level, [...(levels.get(e.level) ?? []), e]);
    }
    return { plain, levels };
}

/** The game's strongest placing: the most points, the bigger board on a tie. */
function bestOf(runs: LeaderboardsProfileEntry[]) {
    const ranked = runs.filter(
        (e) => e.status !== 'rejected' && entryPoints(e) > 0,
    );
    // A verified run leads; a pending one only when nothing is verified yet.
    const verifiedFirst = (e: LeaderboardsProfileEntry) =>
        e.status === 'verified' ? 0 : 1;
    ranked.sort(
        (a, b) =>
            verifiedFirst(a) - verifiedFirst(b) ||
            entryPoints(b) - entryPoints(a) ||
            onBiggerBoard(a, b),
    );
    return ranked[0] ?? null;
}

const keyOf = (e: LeaderboardsProfileEntry) =>
    `${e.kind}-${e.runId ?? e.manualTimeId}`;

/**
 * One game on the shelf: art, totals and its best result, then the runs
 * that pass the filters. The header describes every run the filters start
 * from (archived boards included only when asked for).
 */
export function GameBlock({
    game,
    runs,
    entries,
    country,
    open,
    dim = false,
    unmatched = false,
    onToggle,
    onMove,
    boardsVisible,
    offBoard = true,
}: {
    game: LeaderboardsProfileGame;
    /** Every run this game offers before filtering: what the header counts. */
    runs: LeaderboardsProfileEntry[];
    /** This game's runs that pass the filters, in display order. */
    entries: LeaderboardsProfileEntry[];
    country: string | null;
    open: boolean;
    /** Searching and nothing here matches: a quiet header, no runs. */
    dim?: boolean;
    /** Shown for a linked game although the filters leave it no runs. */
    unmatched?: boolean;
    onToggle: () => void;
    /** Edit mode with the runner's own order: move this game up or down. */
    onMove?: { up: (() => void) | null; down: (() => void) | null };
    /** Whether game and category names may link to their boards. */
    boardsVisible: boolean;
    /** The runner's view: add the runs that have no public row. Off while a
     * filter those runs can't be judged by is on. */
    offBoard?: boolean;
}) {
    const { plain, levels } = groupByLevel(entries);
    const layer = useOwnerLayer();
    const offBoardHere = offBoard ? layer.offBoardInGame(game.gameId) : [];
    const sliceOf = (e: { categoryId: number; subcategoryKey: string }) =>
        `${e.categoryId}|${e.subcategoryKey}`;
    // A listed board's off-board runs are in its entry's History; the rest
    // come after the rows.
    const listed = new Set(entries.map(sliceOf));
    const offBoardRest = offBoardHere.filter((i) => !listed.has(sliceOf(i)));
    // While a status filter is on, the runs it matched are the point: they
    // show open under their entry instead of waiting inside its History.
    const filtering = offBoard && layer.statusFilter !== 'all';
    const matchingUnder = (e: LeaderboardsProfileEntry) =>
        filtering
            ? layer.offBoard(game.gameId, e.categoryId, e.subcategoryKey)
            : undefined;
    const rows = entries.length + offBoardRest.length;
    const boards = runs.length;
    const firsts = runs.filter((e) => medalOf(e) === 'gold').length;
    const hours =
        game.playtimeMs !== null && game.playtimeMs > 0
            ? Math.round(game.playtimeMs / 3_600_000)
            : 0;
    const best = bestOf(runs);
    const gameRef = gameRefOf(game);
    const bestHref = best ? entryHref(gameRef, best) : null;
    const bestBoardHref = best
        ? profileBoardHref(gameRef, best, boardsVisible)
        : null;
    const bestTotal = best?.totalRunners ?? 0;
    const showRows = open && !dim && rows > 0;
    // The header's best result only earns its place when the list below does
    // not already open with that same run.
    const firstRow = plain[0] ?? [...levels.values()][0]?.[0];
    const bestInView =
        best !== null &&
        showRows &&
        firstRow !== undefined &&
        keyOf(firstRow) === keyOf(best);

    return (
        <section
            id={`game-${game.gameId}`}
            className={styles.runsGame}
            data-dim={dim || undefined}
        >
            <div className={styles.runsHead}>
                <span className={styles.runsArt}>
                    <GameImage
                        src={game.imageUrl ?? ''}
                        alt=""
                        quality="medium"
                        width={60}
                        height={80}
                    />
                </span>
                <div className={styles.runsTitleBlock}>
                    <h3 className={styles.runsTitle}>
                        <Link
                            href={profileGameHref(game, boardsVisible)}
                            className={styles.runsTitleLink}
                        >
                            {game.game}
                        </Link>
                    </h3>
                    <div className={styles.runsTotals}>
                        <span>
                            <b>{n(boards)}</b>{' '}
                            {boards === 1 ? 'board' : 'boards'}
                        </span>
                        {game.attempts !== null && game.attempts > 0 ? (
                            <span>
                                <b>{n(game.attempts)}</b>{' '}
                                {game.attempts === 1 ? 'attempt' : 'attempts'}
                            </span>
                        ) : null}
                        {hours > 0 ? (
                            <span>
                                <b>{n(hours)}</b>{' '}
                                {hours === 1 ? 'hour' : 'hours'}
                            </span>
                        ) : null}
                        {firsts > 0 ? (
                            <span>
                                <b className={styles.runsFirsts}>{n(firsts)}</b>{' '}
                                {firsts === 1 ? 'first place' : 'first places'}
                            </span>
                        ) : null}
                        {!dim && rows > 0 && open ? (
                            <button
                                type="button"
                                className={styles.runsHide}
                                aria-expanded
                                onClick={onToggle}
                            >
                                Hide runs
                                <ChevronDown
                                    size={10}
                                    aria-hidden
                                    className={styles.runsToggleIcon}
                                />
                            </button>
                        ) : null}
                    </div>
                </div>
                {best && !bestInView ? (
                    <div className={styles.runsBest}>
                        <span className={styles.runsBestLine}>
                            <RankBall
                                rank={best.rank}
                                medal={medalOf(best)}
                                pending={best.status === 'pending'}
                            />
                            <span className={styles.runsBestTime}>
                                {bestHref ? (
                                    <Link
                                        href={bestHref}
                                        className={`${styles.runLink} stretched-link`}
                                    >
                                        {formatEntryTime(best)}
                                    </Link>
                                ) : (
                                    formatEntryTime(best)
                                )}
                            </span>
                        </span>
                        <span className={styles.runsBestWhat}>
                            {bestBoardHref ? (
                                <Link
                                    href={bestBoardHref}
                                    className={styles.boardLink}
                                >
                                    {best.level
                                        ? `${best.level}: ${best.category}`
                                        : best.category}
                                </Link>
                            ) : best.level ? (
                                `${best.level}: ${best.category}`
                            ) : (
                                best.category
                            )}
                            {bestTotal > 1
                                ? `, of ${n(bestTotal)} runners`
                                : null}
                        </span>
                    </div>
                ) : null}
                {onMove ? (
                    <span className={styles.runsMove}>
                        {onMove.up ? (
                            <button
                                type="button"
                                className={styles.tab}
                                aria-label={`Move ${game.game} up`}
                                onClick={onMove.up}
                            >
                                <ArrowUp size={13} aria-hidden />
                            </button>
                        ) : null}
                        {onMove.down ? (
                            <button
                                type="button"
                                className={styles.tab}
                                aria-label={`Move ${game.game} down`}
                                onClick={onMove.down}
                            >
                                <ArrowDown size={13} aria-hidden />
                            </button>
                        ) : null}
                    </span>
                ) : null}
            </div>
            {showRows ? (
                <div className={styles.runsRows}>
                    {plain.map((e) => (
                        <EntryWithEarlierPbs
                            key={keyOf(e)}
                            entry={e}
                            gameRef={gameRef}
                            country={country}
                            boardsVisible={boardsVisible}
                            matching={matchingUnder(e)}
                        />
                    ))}
                    {[...levels.entries()].map(([level, list]) => (
                        <div key={level} className={styles.runsLevel}>
                            <div className={styles.runsLevelHead}>{level}</div>
                            {list.map((e) => (
                                <EntryWithEarlierPbs
                                    key={keyOf(e)}
                                    entry={e}
                                    gameRef={gameRef}
                                    country={country}
                                    boardsVisible={boardsVisible}
                                    matching={matchingUnder(e)}
                                />
                            ))}
                        </div>
                    ))}
                    <OffBoardRows items={offBoardRest} gameRef={gameRef} />
                </div>
            ) : null}
            {unmatched ? (
                <div className={styles.runsUnmatched}>
                    No runs here match these filters
                </div>
            ) : null}
            {!dim && rows > 0 && !open ? (
                <button
                    type="button"
                    className={styles.runsToggle}
                    aria-expanded={false}
                    onClick={onToggle}
                >
                    <span>{`Show ${n(rows)} ${rows === 1 ? 'run' : 'runs'}`}</span>
                    <ChevronDown
                        size={10}
                        aria-hidden
                        className={styles.runsToggleIcon}
                    />
                </button>
            ) : null}
        </section>
    );
}
