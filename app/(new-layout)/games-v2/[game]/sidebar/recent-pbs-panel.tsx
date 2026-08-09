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
import styles from './sidebar.module.scss';

interface Props {
    pbs: RecentPb[];
    gameSlug: string;
    /** Featured categories, for resolving each PB's board timing. */
    categories?: ResolvedCategory[];
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

export function RecentPbsPanel({ pbs, gameSlug, categories }: Props) {
    if (pbs.length === 0) {
        return (
            <section className={styles.panel}>
                <span className={`${styles.eyebrow} d-block mb-2`}>
                    Recent PBs · all boards
                </span>
                <p className="text-muted mb-0">No recent PBs.</p>
            </section>
        );
    }

    // categoryId is the row's resolved category (optional — see RecentPb);
    // an unmatched PB keeps the RTA reading it always had.
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));

    return (
        <section className={styles.panel}>
            {/* "all boards": this panel is game-wide — without the scope the
                16 Star entries beside a 120 Star board read as a bug. */}
            <span className={`${styles.eyebrow} d-block mb-2`}>
                Recent PBs · all boards
            </span>
            <ul className="list-unstyled mb-0">
                {pbs.slice(0, 5).map((p) => {
                    const timing = pbTiming(
                        p,
                        p.categoryId == null
                            ? undefined
                            : byId.get(p.categoryId),
                    );
                    return (
                        <li key={p.id} className={styles.pbRow}>
                            <div className={styles.pbTop}>
                                <span className={styles.rowUser}>
                                    <RunnerAvatar name={p.username} size="xs" />
                                    <UserLink
                                        username={p.username}
                                        url={undefined}
                                    />
                                </span>
                                <span className={styles.pbTime}>
                                    {/*
                                    RecentPb.id is the finished_run row id
                                    (from /v1/finished-runs), not the run id
                                    getRunById/`/games-v2/[game]/run/[runId]`
                                    expects — the same endpoint's other shape
                                    (FinishedRunPB, src/lib/highlights.ts)
                                    carries a separate `runId` field.
                                    getRecentPbs casts the raw response
                                    straight to RecentPb[] with no mapping, so
                                    `runId` may be present at runtime even
                                    though it wasn't in the type; link to the
                                    run when it is, and fall back to the
                                    runner's profile (same destination the
                                    UserLink above points at) when it isn't.
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
                                            <span className={styles.pbTiming}>
                                                {timing.label}
                                            </span>
                                        )}
                                    </Link>
                                </span>
                            </div>
                            <div className={styles.pbMeta}>
                                {p.category} ·{' '}
                                <span title={formatRunDate(p.endedAt)}>
                                    {relativeDate(p.endedAt)}
                                </span>
                                <PbImprovement
                                    time={timing.time}
                                    previousPb={timing.previous}
                                />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/**
 * How much the PB improved on the runner's previous one. `previousPb` comes
 * straight off the /v1/finished-runs row (null for a first-ever PB, absent
 * when the backend omits it) — render nothing unless it shows a genuine
 * improvement.
 */
function PbImprovement({
    time,
    previousPb,
}: {
    time: number;
    previousPb?: number | null;
}) {
    if (typeof previousPb !== 'number' || previousPb <= time) return null;
    const diff = previousPb - time;
    return (
        <span
            className={styles.pbDelta}
            title={`Improved their previous PB by ${formatImprovement(diff)}`}
        >
            {' '}
            −{formatImprovement(diff)}
        </span>
    );
}
