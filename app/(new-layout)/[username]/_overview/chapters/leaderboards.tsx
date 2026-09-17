import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { getRunnerBoardsTop } from '~src/lib/runner-profile';
import { safeEncodeURI } from '~src/utils/uri';
import type { RunnerProfileHead } from '../../../../../types/runner-profile.types';
import {
    entryHref,
    entrySubcategoryLabel,
    formatEntryTime,
    formatProfileDate,
    gameRefOf,
    timingLabel,
} from '../../../leaderboards/[name]/format';
import profileStyles from '../../../leaderboards/[name]/leaderboards-profile.module.scss';
import { byPoints } from '../../../leaderboards/[name]/showcase-rules';
import ui from '../../(sections)/profile-ui.module.scss';
import { medalOf } from '../../(sections)/ranks';
import { Chapter, ChapterError } from '../chapter';
import styles from '../overview.module.scss';

const SHOWN = 4;

/** The runner's next four best board entries after the highlights, by points. */
export async function LeaderboardsChapter({
    head,
}: {
    head: RunnerProfileHead;
}) {
    const name = head.runner.name;
    // Highlights already show these; the chapter continues below them.
    const pinned = new Set(
        head.pins.flatMap((p) =>
            p.type === 'board' ? [`${p.ref.kind}-${p.ref.id}`] : [],
        ),
    );
    let profile: Awaited<ReturnType<typeof getRunnerBoardsTop>>;
    try {
        profile = await getRunnerBoardsTop(name, SHOWN + pinned.size);
    } catch {
        return <ChapterError id="leaderboards" name={name} />;
    }
    const rows = (profile?.games ?? [])
        .flatMap((game) => game.entries.map((entry) => ({ game, entry })))
        .filter(
            ({ entry }) =>
                entry.level === null &&
                !pinned.has(
                    `${entry.kind}-${entry.kind === 'run' ? entry.runId : entry.manualTimeId}`,
                ),
        )
        .sort((a, b) => byPoints(a.entry, b.entry))
        .slice(0, SHOWN);
    if (rows.length === 0) return null;

    return (
        <Chapter id="leaderboards" name={name}>
            <div className={ui.block}>
                <div className={`${ui.panel} ${styles.boards}`}>
                    {rows.map(({ game, entry }) => {
                        const vars = entrySubcategoryLabel(entry);
                        const timing = timingLabel(entry);
                        const href = entryHref(gameRefOf(game), entry);
                        return (
                            <div
                                key={`${entry.kind}-${entry.runId ?? entry.manualTimeId}`}
                                className={`${ui.row} ${ui.rowFlush}`}
                            >
                                <span
                                    className={ui.rank}
                                    data-medal={medalOf(entry.rank)}
                                >
                                    {entry.rank !== null
                                        ? `#${entry.rank}`
                                        : '—'}
                                </span>
                                <span className={styles.boardName}>
                                    <GameImage
                                        src={game.imageUrl ?? ''}
                                        alt=""
                                        quality="small"
                                        width={27}
                                        height={36}
                                    />
                                    <span className={ui.stacked}>
                                        <Link
                                            href={`/games/${safeEncodeURI(game.game)}`}
                                            className={ui.nameMain}
                                        >
                                            {game.game}
                                        </Link>
                                        <span className={ui.nameSub}>
                                            {entry.category}
                                            {entry.level
                                                ? ` · ${entry.level}`
                                                : ''}
                                            {vars ? ` · ${vars}` : ''}
                                        </span>
                                    </span>
                                </span>
                                <span
                                    className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}
                                >
                                    {(entry.totalRunners ?? 0) > 1
                                        ? `of ${(entry.totalRunners ?? 0).toLocaleString('en-US')}`
                                        : null}
                                </span>
                                <span
                                    className={`${ui.num} ${ui.strong} ${ui.end}`}
                                >
                                    {href ? (
                                        <Link
                                            href={href}
                                            className={profileStyles.runLink}
                                        >
                                            {formatEntryTime(entry)}
                                        </Link>
                                    ) : (
                                        formatEntryTime(entry)
                                    )}
                                    {timing ? (
                                        <span
                                            className={`${ui.small} ${ui.muted}`}
                                        >
                                            {' '}
                                            {timing}
                                        </span>
                                    ) : null}
                                </span>
                                <span
                                    className={`${ui.num} ${ui.muted} ${ui.end} ${ui.optional}`}
                                >
                                    {entry.runDate
                                        ? formatProfileDate(entry.runDate)
                                        : null}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Chapter>
    );
}
