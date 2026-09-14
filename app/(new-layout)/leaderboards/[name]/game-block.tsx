import {
    ArrowDown,
    ArrowUp,
    ArrowUpRight,
    ChevronRight,
} from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { safeEncodeURI } from '~src/utils/uri';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { EntryRow } from './entry-row';
import styles from './leaderboards-profile.module.scss';

const hours = (ms: number) =>
    `${Math.round(ms / 3_600_000).toLocaleString('en-US')} h`;

function groupByLevel(entries: LeaderboardsProfileEntry[]) {
    const plain = entries.filter((e) => e.level === null);
    const levels = new Map<string, LeaderboardsProfileEntry[]>();
    for (const e of entries) {
        if (e.level === null) continue;
        levels.set(e.level, [...(levels.get(e.level) ?? []), e]);
    }
    return { plain, levels };
}

const plural = (n: number, one: string, many: string) =>
    `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * One game in the runs panel: a group row that folds its runs away, then the
 * runs themselves. `entries` is what the selected tab shows of this game; the
 * group row always describes the whole game.
 */
export function GameBlock({
    game,
    entries,
    country,
    collapsed = false,
    onToggle,
    onMove,
}: {
    game: LeaderboardsProfileGame;
    entries: LeaderboardsProfileEntry[];
    country: string | null;
    collapsed?: boolean;
    onToggle?: () => void;
    /** Edit mode with the runner's own order: move this game up or down. */
    onMove?: { up: (() => void) | null; down: (() => void) | null };
}) {
    const { plain, levels } = groupByLevel(entries);
    const firsts = game.entries.filter((e) => e.rank === 1).length;
    const podiums = game.entries.filter(
        (e) => e.rank !== null && e.rank <= 3,
    ).length;
    const meta = [
        plural(game.entries.length, 'board', 'boards'),
        game.attempts !== null && game.attempts > 0
            ? plural(game.attempts, 'attempt', 'attempts')
            : null,
        game.playtimeMs !== null && game.playtimeMs > 0
            ? hours(game.playtimeMs)
            : null,
    ].filter(Boolean);
    const standing = [
        podiums > firsts ? plural(podiums, 'podium', 'podiums') : null,
        game.bestRank !== null && firsts === 0
            ? `best #${game.bestRank}`
            : null,
    ].filter(Boolean);

    return (
        <section
            id={`game-${game.gameId}`}
            className={styles.game}
            data-collapsed={collapsed || undefined}
        >
            <div className={styles.gameHead}>
                <button
                    type="button"
                    className={styles.gameToggle}
                    onClick={onToggle}
                    aria-expanded={!collapsed}
                    disabled={!onToggle}
                >
                    <ChevronRight
                        size={12}
                        aria-hidden
                        className={styles.gameChevron}
                    />
                    <GameImage
                        src={game.imageUrl ?? ''}
                        alt=""
                        quality="small"
                        width={27}
                        height={36}
                    />
                    <span className={styles.gameTitle}>{game.game}</span>
                    <span className={styles.gameSummary}>
                        {meta.join(' · ')}
                    </span>
                </button>
                <span className={styles.gameStanding}>
                    {firsts > 0 ? (
                        <span className={styles.gameFirsts}>
                            <span className={styles.longLabel}>
                                {firsts === 1
                                    ? 'First place'
                                    : `${firsts} first places`}
                            </span>
                            <span className={styles.shortLabel}>
                                {firsts === 1 ? '#1' : `${firsts}× #1`}
                            </span>
                        </span>
                    ) : null}
                    {standing.length > 0 ? (
                        <span>{standing.join(' · ')}</span>
                    ) : null}
                </span>
                {onMove ? (
                    <span className={styles.gameMove}>
                        <button
                            type="button"
                            className={styles.tab}
                            aria-label={`Move ${game.game} up`}
                            disabled={!onMove.up}
                            onClick={onMove.up ?? undefined}
                        >
                            <ArrowUp size={13} aria-hidden />
                        </button>
                        <button
                            type="button"
                            className={styles.tab}
                            aria-label={`Move ${game.game} down`}
                            disabled={!onMove.down}
                            onClick={onMove.down ?? undefined}
                        >
                            <ArrowDown size={13} aria-hidden />
                        </button>
                    </span>
                ) : (
                    <Link
                        href={`/games/${safeEncodeURI(game.game)}`}
                        className={styles.gameLink}
                        aria-label={`${game.game} leaderboards`}
                        title="Open the game's leaderboards"
                    >
                        <ArrowUpRight size={13} aria-hidden />
                    </Link>
                )}
            </div>
            {collapsed ? null : (
                <div className={styles.entries}>
                    {plain.map((e) => (
                        <EntryRow
                            key={`${e.kind}-${e.runId ?? e.manualTimeId}`}
                            entry={e}
                            country={country}
                        />
                    ))}
                    {[...levels.entries()].map(([level, list]) => (
                        <div key={level} className={styles.levelGroup}>
                            <div className={styles.levelHead}>{level}</div>
                            {list.map((e) => (
                                <EntryRow
                                    key={`${e.kind}-${e.runId ?? e.manualTimeId}`}
                                    entry={e}
                                    country={country}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
