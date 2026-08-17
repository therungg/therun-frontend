'use client';

import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { formatRunDate } from '~src/lib/format-run-date';
import type {
    RecentPb,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { formatImprovement } from './format-improvement';
import { scopePbs } from './rail-scope';
import { useRailScope } from './rail-scope-context';
import styles from './sidebar.module.scss';

const MAX_SHOWN = 5;

interface Props {
    pbs: RecentPb[];
    gameSlug: string;
    /** Featured categories, for resolving each PB's board timing. */
    categories?: ResolvedCategory[];
    /** The board on screen, for board scope. */
    board?: ResolvedCategory | null;
}

/**
 * Which time to print for a PB, and what to call it.
 *
 * The panel is game-wide, and a game's boards don't share a timing — a
 * game-time board's rows are ranked on game time, so printing every PB's RTA
 * here made those rows disagree with the board they came from. Each PB is
 * shown in its own category's primary timing instead.
 *
 * Game-time boards fall back to RTA when a run carries no game time (the same
 * COALESCE the board ranks on), so the label follows the value actually shown
 * rather than the board's setting.
 */
function pbTiming(
    pb: RecentPb,
    category: ResolvedCategory | undefined,
): { time: number; previous?: number | null; label: string | null } {
    if (category?.primaryTiming !== 'gt') {
        return { time: pb.time, previous: pb.previousPb, label: null };
    }
    if (typeof pb.gameTime !== 'number' || pb.gameTime <= 0) {
        return { time: pb.time, previous: pb.previousPb, label: 'RTA' };
    }
    return {
        time: pb.gameTime,
        previous: pb.previousPbGameTime,
        label: category.gameTimeLabel === 'lrt' ? 'LRT' : 'IGT',
    };
}

export function RecentPbsPanel({ pbs, gameSlug, categories, board }: Props) {
    const scope = useRailScope();
    const scoped = scopePbs(pbs, scope, board);
    const boardScope = scope === 'board' && Boolean(board);
    // categoryId is the row's resolved category (optional — see RecentPb);
    // an unmatched PB keeps the RTA reading it always had.
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));

    return (
        <section className={styles.panel} aria-labelledby="rail-recent-pbs">
            <div className={styles.panelHead}>
                <h2 id="rail-recent-pbs" className={styles.eyebrow}>
                    Recent PBs
                </h2>
            </div>
            {scoped.length === 0 ? (
                <p className={styles.empty}>
                    {boardScope && pbs.length > 0
                        ? 'No recent PBs on this board.'
                        : 'No recent PBs.'}
                </p>
            ) : (
                <ul className={styles.list}>
                    {scoped.slice(0, MAX_SHOWN).map((p) => {
                        const category =
                            p.categoryId == null
                                ? undefined
                                : byId.get(p.categoryId);
                        const timing = pbTiming(p, category);
                        return (
                            <li key={p.id} className={styles.personRow}>
                                <div className={styles.rowTop}>
                                    <span className={styles.rowUser}>
                                        <RunnerAvatar
                                            name={p.username}
                                            size="xs"
                                        />
                                        <UserLink
                                            username={p.username}
                                            url={undefined}
                                        />
                                    </span>
                                    <span className={styles.rowTime}>
                                        {/*
                                        RecentPb.id is the finished_run row id
                                        (from /v1/finished-runs), not the run id
                                        `/games-v2/[game]/run/[runId]` expects;
                                        `runId` may be present at runtime (see
                                        the type). Link to the run when it is,
                                        else to the runner's profile.
                                    */}
                                        <Link
                                            href={
                                                typeof p.runId === 'number'
                                                    ? `/games-v2/${encodeURIComponent(gameSlug)}/run/${p.runId}`
                                                    : `/${p.username}`
                                            }
                                        >
                                            <DurationToFormatted
                                                duration={timing.time}
                                            />
                                            {timing.label && (
                                                <span
                                                    className={styles.pbTiming}
                                                >
                                                    {timing.label}
                                                </span>
                                            )}
                                        </Link>
                                    </span>
                                </div>
                                <div className={styles.rowSub}>
                                    {/* In board scope every row is this board;
                                        the category would be five repeats. */}
                                    {!boardScope && <>{p.category} · </>}
                                    <span title={formatRunDate(p.endedAt)}>
                                        {relativeDate(p.endedAt)}
                                    </span>
                                    <PbImprovement
                                        time={timing.time}
                                        previousPb={timing.previous}
                                        first={p.previousPb === null}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

/**
 * How much the PB improved on the runner's previous one. `previousPb` comes
 * straight off the /v1/finished-runs row: null for a first-ever PB, absent
 * when the backend omits it. A first PB is worth saying; an unknown one is
 * not. `first` is judged on the real-time column, which every run has, so a
 * game-time board's row with no previous *game* time doesn't read as a debut.
 */
function PbImprovement({
    time,
    previousPb,
    first,
}: {
    time: number;
    previousPb?: number | null;
    first: boolean;
}) {
    if (first) {
        return <span className={styles.rowSubNote}> · first PB</span>;
    }
    if (typeof previousPb !== 'number' || previousPb <= time) return null;
    const diff = previousPb - time;
    return (
        <span
            className={`${styles.pbDelta} ${styles.mono}`}
            title={`Improved their previous PB by ${formatImprovement(diff)}`}
        >
            {' '}
            −{formatImprovement(diff)}
        </span>
    );
}
