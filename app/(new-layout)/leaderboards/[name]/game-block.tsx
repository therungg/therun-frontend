import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { EntryRow } from './entry-row';
import { formatProfileDate } from './format';
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

/**
 * One game's block in the main column. `entries` is what the selected tab
 * shows of this game; the summary line always describes the whole game.
 */
export function GameBlock({
    game,
    entries,
    country,
}: {
    game: LeaderboardsProfileGame;
    entries: LeaderboardsProfileEntry[];
    country: string | null;
}) {
    const { plain, levels } = groupByLevel(entries);
    const summary = [
        `${game.entries.length} ${game.entries.length === 1 ? 'board' : 'boards'}`,
        game.bestRank !== null ? `best #${game.bestRank}` : null,
        game.lastRanAt ? `last ran ${formatProfileDate(game.lastRanAt)}` : null,
        game.attempts !== null
            ? `${game.attempts.toLocaleString('en-US')} attempts`
            : null,
        game.playtimeMs !== null && game.playtimeMs > 0
            ? hours(game.playtimeMs)
            : null,
    ].filter(Boolean);
    return (
        <section id={`game-${game.gameId}`} className={styles.game}>
            <div className={styles.gameHead}>
                <GameImage
                    src={game.imageUrl ?? ''}
                    alt={game.game}
                    quality="small"
                    width={36}
                    height={48}
                />
                <div>
                    <Link
                        href={`/games-v2/${encodeURIComponent(game.gameSlug)}`}
                        className={styles.gameTitle}
                    >
                        {game.game}
                    </Link>
                    <div className={styles.gameSummary}>
                        {summary.join(' · ')}
                    </div>
                </div>
            </div>
            <div className={styles.entries}>
                {plain.map((e) => (
                    <EntryRow
                        key={`${e.kind}-${e.runId ?? e.manualTimeId}`}
                        entry={e}
                        gameSlug={game.gameSlug}
                        country={country}
                    />
                ))}
                {[...levels.entries()].map(([level, list]) => (
                    <div key={level}>
                        <div className={styles.levelHead}>{level}</div>
                        {list.map((e) => (
                            <EntryRow
                                key={`${e.kind}-${e.runId ?? e.manualTimeId}`}
                                entry={e}
                                gameSlug={game.gameSlug}
                                country={country}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
