import Link from '~src/components/link';
import {
    buildBoardHref,
    buildManualTimeHref,
    buildRunHref,
    rankToPage,
} from '~src/lib/board-url';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type { BoardContextRow } from '../../../../../types/leaderboards.types';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { RunnerIdentity } from '../leaderboard/runners';
import { RankMedal } from './rank-medal';
import { formatGap } from './run-format';
import styles from './run-page.module.scss';
import type { RunViewModel } from './run-view';

function rowHref(gameName: string, r: BoardContextRow): string | null {
    if (r.runId != null) return buildRunHref(gameName, r.runId);
    if (r.manualTimeId != null)
        return buildManualTimeHref(gameName, r.manualTimeId);
    return null;
}

function Row({
    r,
    selfTime,
    href,
}: {
    r: BoardContextRow;
    selfTime: number;
    href: string | null;
}) {
    // Same test the board row and the run page's own hero use, so a
    // neighbour on the slice can't disagree with how the board itself would
    // draw the same run.
    const roster =
        r.anonymized === true
            ? null
            : rendersAsRoster(r.participants, { runnerName: r.runnerName })
              ? r.participants
              : null;
    const isRoster = roster != null;

    const body = (
        <>
            <span className={styles.sliceRank}>
                <RankMedal rank={r.rank} />
            </span>
            {isRoster ? (
                // A roster carries its own avatars and flags per member, so
                // the row's single flag/avatar gutters give way to the list.
                <span className={styles.sliceFlag} aria-hidden />
            ) : (
                <span className={styles.sliceFlag}>
                    <CountryFlag country={r.country} />
                </span>
            )}
            {isRoster && (
                // Keeps the grid's six fixed tracks aligned — the roster's
                // own avatars live inside the name track below, not here.
                <span className={styles.sliceAvatar} aria-hidden />
            )}
            {isRoster ? (
                <span
                    className={`${styles.sliceName} ${styles.sliceNameRoster}`}
                >
                    {roster.map((member, i) => (
                        <span
                            key={`${member.userId ?? 'g'}-${member.name}-${i}`}
                            className={styles.sliceRosterMember}
                        >
                            <RunnerIdentity
                                name={member.name}
                                picture={member.picture}
                                country={member.country}
                                size="xs"
                                link={member.userId != null}
                                hoverCard={member.userId != null}
                            />
                            {i < roster.length - 1 && (
                                <span
                                    className={styles.sliceRosterSep}
                                    aria-hidden
                                >
                                    ·
                                </span>
                            )}
                        </span>
                    ))}
                </span>
            ) : (
                <>
                    <span className={styles.sliceAvatar}>
                        <RunnerAvatar
                            name={r.runnerName}
                            picture={r.picture}
                            size="xs"
                            anonymous={r.anonymized === true}
                        />
                    </span>
                    <span className={styles.sliceName}>{r.runnerName}</span>
                </>
            )}
            <span className={styles.sliceTime}>{formatTimeMs(r.time)}</span>
            <span className={styles.sliceGap}>
                {formatGap(r.time - selfTime)}
            </span>
        </>
    );
    return href ? (
        <Link href={href} className={styles.sliceRow}>
            {body}
        </Link>
    ) : (
        <div className={styles.sliceRow}>{body}</div>
    );
}

export function BoardSlice({ model }: { model: RunViewModel }) {
    const ctx = model.boardContext;
    if (!ctx) return null;
    const selfTime =
        model.realTime != null && ctx.view.timing === 'rt'
            ? model.realTime
            : (model.gameTime ?? model.realTime);
    if (selfTime == null) return null;

    const boardHref = buildBoardHref(model.game.name, {
        categorySlug: model.categorySlug,
        subcategoryKey: model.subcategoryKey,
        page: rankToPage(ctx.rank),
    });
    const showWr = ctx.wr != null && !ctx.above.some((r) => r.rank === 1);

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>On the board</h2>
                {model.boardsVisible && (
                    <Link href={boardHref} className={styles.panelHeadLink}>
                        Full board →
                    </Link>
                )}
            </div>
            <div className={styles.slice}>
                {showWr && ctx.wr && (
                    <>
                        <Row
                            r={ctx.wr}
                            selfTime={selfTime}
                            href={rowHref(model.game.name, ctx.wr)}
                        />
                        {ctx.above.at(-1)?.rank !== 2 && (
                            <div className={styles.sliceGapRow}>⋯</div>
                        )}
                    </>
                )}
                {[...ctx.above].reverse().map((r) => (
                    <Row
                        key={r.rank}
                        r={r}
                        selfTime={selfTime}
                        href={rowHref(model.game.name, r)}
                    />
                ))}
                <div
                    className={`${styles.sliceRow} ${styles.sliceSelf}`}
                    aria-current="true"
                >
                    <span className={styles.sliceRank}>
                        <RankMedal rank={ctx.rank} />
                    </span>
                    <span className={styles.sliceFlag}>
                        <CountryFlag country={model.country} />
                    </span>
                    <span className={styles.sliceAvatar}>
                        <RunnerAvatar
                            name={model.runnerName}
                            picture={model.picture}
                            size="xs"
                        />
                    </span>
                    <span className={styles.sliceName}>{model.runnerName}</span>
                    <span className={styles.sliceTime}>
                        {formatTimeMs(selfTime)}
                    </span>
                    <span className={styles.sliceGap} />
                </div>
                {ctx.below.map((r) => (
                    <Row
                        key={r.rank}
                        r={r}
                        selfTime={selfTime}
                        href={rowHref(model.game.name, r)}
                    />
                ))}
            </div>
        </section>
    );
}
