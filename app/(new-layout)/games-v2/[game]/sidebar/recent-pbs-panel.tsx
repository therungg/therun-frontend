'use client';

import { useState } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildRunHref } from '~src/lib/board-url';
import { formatRunDate } from '~src/lib/format-run-date';
import { runnerProfileHref } from '~src/lib/runner-profile-href';
import type {
    RecentPb,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';
import { relativeDate } from '../leaderboard/relative-date';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import { formatImprovement } from './format-improvement';
import { LiveStatusChip } from './live-chip';
import styles from './sidebar.module.scss';

interface Props {
    pbs: RecentPb[];
    gameSlug: string;
    /** For the live chip in the panel head — same key LivePanel fetches. */
    gameDisplay: string;
    /** Featured categories, for resolving each PB's board timing. */
    categories?: ResolvedCategory[];
    /** The board being viewed, so the scope toggle has something to scope to.
     *  Null on the overview, where there is no single active board. */
    activeCategoryId?: number | null;
    /**
     * Board rank keyed by run id, from the leaderboard already loaded for
     * this page. Covers only the active board's current page — `RecentPb`
     * carries no rank of its own and resolving one per row would be a fetch
     * per PB, so a row simply shows no rank when it isn't in here.
     */
    boardRanks?: Record<number, number>;
    /** Flat = secondary rail panel (see .panelFlat). */
    flat?: boolean;
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

export function RecentPbsPanel({
    pbs,
    gameSlug,
    gameDisplay,
    categories,
    activeCategoryId = null,
    boardRanks,
    flat = false,
}: Props) {
    // Scope used to be baked into the heading ("Recent PBs · all boards"),
    // which spent two thirds of the head explaining a fact nobody could act
    // on. It's a control now: the fetched window is already game-wide, so
    // narrowing to the open board is a filter, not a second request.
    const [scope, setScope] = useState<'all' | 'board'>('all');
    const canScope = activeCategoryId != null;
    const shown =
        canScope && scope === 'board'
            ? pbs.filter((p) => p.categoryId === activeCategoryId)
            : pbs;

    const panelClass = flat ? styles.panelFlat : styles.panel;

    const head = (
        <div className={styles.panelHead}>
            <span className={styles.eyebrow}>Recent PBs</span>
            <span className={styles.headActions}>
                <LiveStatusChip gameDisplay={gameDisplay} />
                {canScope && (
                    <span
                        className={styles.scopeToggle}
                        title="Show every board's PBs, or only this board's"
                    >
                        <button
                            type="button"
                            className={styles.scopeOption}
                            aria-pressed={scope === 'all'}
                            onClick={() => setScope('all')}
                        >
                            All
                        </button>
                        <span className={styles.scopeSep} aria-hidden>
                            /
                        </span>
                        <button
                            type="button"
                            className={styles.scopeOption}
                            aria-pressed={scope === 'board'}
                            onClick={() => setScope('board')}
                        >
                            Board
                        </button>
                    </span>
                )}
            </span>
        </div>
    );

    if (shown.length === 0) {
        return (
            <section className={panelClass}>
                {head}
                <p className="text-muted mb-0">
                    {canScope && scope === 'board'
                        ? 'No recent PBs on this board.'
                        : 'No recent PBs.'}
                </p>
            </section>
        );
    }

    // categoryId is the row's resolved category (optional — see RecentPb);
    // an unmatched PB keeps the RTA reading it always had.
    const byId = new Map((categories ?? []).map((c) => [c.id, c]));

    return (
        <section className={panelClass}>
            {head}
            <ul className="list-unstyled mb-0">
                {shown.slice(0, 5).map((p) => {
                    const timing = pbTiming(
                        p,
                        p.categoryId == null
                            ? undefined
                            : byId.get(p.categoryId),
                    );
                    const rank =
                        typeof p.runId === 'number'
                            ? boardRanks?.[p.runId]
                            : undefined;
                    return (
                        <li key={p.id} className={styles.pbRow}>
                            <div className={styles.pbTop}>
                                <span className={styles.rowUser}>
                                    <RunnerAvatar name={p.username} size="xs" />
                                    <UserLink
                                        username={p.username}
                                        url={undefined}
                                        to="leaderboards"
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
                                                ? buildRunHref(
                                                      gameSlug,
                                                      p.runId,
                                                  )
                                                : runnerProfileHref(p.username)
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
                                    {/* The improvement rides the time, not the
                                        meta line: "47:15, and that was 19s off
                                        their own best" is one fact. */}
                                    <PbImprovement
                                        time={timing.time}
                                        previousPb={timing.previous}
                                    />
                                </span>
                            </div>
                            <div className={styles.pbMeta}>
                                {p.category}
                                {rank != null && (
                                    <>
                                        {' · '}
                                        <span
                                            className={styles.pbRank}
                                            title={`Ranked #${rank} on this board`}
                                        >
                                            #{rank}
                                        </span>
                                    </>
                                )}
                                {' · '}
                                <span title={formatRunDate(p.endedAt)}>
                                    {relativeDate(p.endedAt)}
                                </span>
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
