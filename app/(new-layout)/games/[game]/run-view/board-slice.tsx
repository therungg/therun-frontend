import Link from '~src/components/link';
import {
    buildBoardHref,
    buildManualTimeHref,
    buildRunHref,
    rankToPage,
} from '~src/lib/board-url';
import { rendersAsRoster } from '~src/lib/run-view/roster';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    BoardContextRow,
    RunParticipant,
} from '../../../../../types/leaderboards.types';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { RosterList } from '../leaderboard/runners';
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

/**
 * The flag, avatar and name tracks of one slice row — the run's own row and
 * every neighbour draw through here, so the slice cannot credit the run it is
 * about differently from the way it credits the rows around it.
 *
 * Same test the board row and the run page's hero use: a roster that is not
 * simply the filer names everyone it credits, and nothing about a solo row
 * moves.
 */
function SliceIdentity({
    runnerName,
    picture,
    country,
    participants,
    anonymized = false,
}: {
    runnerName: string;
    picture: string | null;
    country: string | null;
    participants?: RunParticipant[] | null;
    anonymized?: boolean;
}) {
    const roster = anonymized
        ? null
        : rendersAsRoster(participants, { runnerName })
          ? participants
          : null;

    if (roster) {
        return (
            <>
                {/* A roster carries its own avatars and flags per member, so
                    the row's single flag/avatar gutters give way to the list,
                    and stay in place to keep the grid's six fixed tracks
                    aligned. */}
                <span className={styles.sliceFlag} aria-hidden />
                <span className={styles.sliceAvatar} aria-hidden />
                <span
                    className={`${styles.sliceName} ${styles.sliceNameRoster}`}
                >
                    {/* The board cell's own list: three names, then a "+N"
                        that names everyone — from the one component, so a
                        slice row cannot credit a team differently from the
                        board it slices. */}
                    <RosterList
                        roster={roster}
                        memberClassName={styles.sliceRosterMember}
                        sepClassName={styles.sliceRosterSep}
                    />
                </span>
            </>
        );
    }

    return (
        <>
            <span className={styles.sliceFlag}>
                <CountryFlag country={country} />
            </span>
            <span className={styles.sliceAvatar}>
                <RunnerAvatar
                    name={runnerName}
                    picture={picture}
                    size="xs"
                    anonymous={anonymized}
                />
            </span>
            <span className={styles.sliceName}>{runnerName}</span>
        </>
    );
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
    const body = (
        <>
            <span className={styles.sliceRank}>
                <RankMedal rank={r.rank} />
            </span>
            <SliceIdentity
                runnerName={r.runnerName}
                picture={r.picture}
                country={r.country}
                participants={r.participants}
                anonymized={r.anonymized === true}
            />
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

/** The moderator's slice head: which board, and how many are on it. */
function BoardNote({ href, text }: { href: string | null; text: string }) {
    return href ? (
        <Link href={href} className={styles.panelHeadLink}>
            {text}
        </Link>
    ) : (
        <span className={styles.panelHeadNote}>{text}</span>
    );
}

export function BoardSlice({
    model,
    title,
}: {
    model: RunViewModel;
    /** The moderator's view names it for where the run lands, with the
     * board's size as the link. */
    title?: string;
}) {
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
                {title != null ? (
                    <h2 className={styles.panelEyebrow}>{title}</h2>
                ) : (
                    <h2 className={styles.panelTitle}>On the board</h2>
                )}
                {title != null ? (
                    <BoardNote
                        href={model.boardsVisible ? boardHref : null}
                        text={`${model.categoryDisplay} · ${ctx.totalRunners.toLocaleString()} ${ctx.totalRunners === 1 ? 'runner' : 'runners'}`}
                    />
                ) : (
                    model.boardsVisible && (
                        <Link href={boardHref} className={styles.panelHeadLink}>
                            Full board →
                        </Link>
                    )
                )}
            </div>
            <div
                className={`${styles.slice} ${title != null ? styles.sliceWide : ''}`}
            >
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
                    <SliceIdentity
                        runnerName={model.runnerName}
                        picture={model.picture}
                        country={model.country}
                        participants={model.participants}
                    />
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
