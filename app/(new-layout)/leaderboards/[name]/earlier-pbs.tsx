'use client';

import { useId, useState } from 'react';
import Link from '~src/components/link';
import type {
    LeaderboardsProfileEarlierPb,
    LeaderboardsProfileEntry,
} from '../../../../types/leaderboards-profile.types';
import type { SubmissionItem } from '../../../../types/runner-status.types';
import { EntryRow, shortDate } from './entry-row';
import {
    entryHref,
    formatEntryTime,
    formatProfileDate,
    sourceLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { useAllRuns } from './owner-layer/all-runs-toggle';
import { OffBoardRows } from './owner-layer/off-board-rows';
import { useOwnerLayer } from './owner-layer/owner-layer-provider';
import { RowStatus, useOwnerRow } from './owner-layer/row-status';

type EntryRowProps = Parameters<typeof EntryRow>[0];

/** A gap between two PBs: "0.117s", "12.4s", "1:05". */
function formatDelta(ms: number): string {
    if (ms < 1000) return `${(ms / 1000).toFixed(3)}s`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    const total = Math.round(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** One earlier PB under its entry; the runner's view adds its status and controls. */
function EarlierPbRow({
    pb,
    entry,
    gameRef,
    improvedBy,
}: {
    pb: LeaderboardsProfileEarlierPb;
    entry: LeaderboardsProfileEntry;
    gameRef: string | null;
    improvedBy: number;
}) {
    const { itemFor } = useOwnerLayer();
    const item = itemFor(
        pb.kind,
        pb.kind === 'run' ? pb.runId : pb.manualTimeId,
    );
    const { toggle, panel } = useOwnerRow(
        item,
        gameRef ? { gameId: entry.gameId, gameRef, format: entry } : null,
        true,
    );
    const href = gameRef ? entryHref(gameRef, pb) : null;
    const shown = { ...entry, timeMs: pb.timeMs };
    return (
        <>
            <div className={styles.earlierRow}>
                <span className={styles.earlierTime}>
                    {href ? (
                        <Link href={href}>{formatEntryTime(shown)}</Link>
                    ) : (
                        formatEntryTime(shown)
                    )}
                </span>
                <span className={styles.earlierDelta}>
                    beaten by {formatDelta(improvedBy)}
                    {item ? (
                        <>
                            {' '}
                            <RowStatus item={item} />
                        </>
                    ) : null}
                    {toggle}
                </span>
                <span className={styles.earlierSource}>
                    {sourceLabel(pb.provenance)}
                </span>
                <span
                    className={styles.earlierDate}
                    title={
                        pb.runDate ? formatProfileDate(pb.runDate) : undefined
                    }
                >
                    {pb.runDate ? shortDate(pb.runDate) : '—'}
                </span>
            </div>
            {panel}
        </>
    );
}

/**
 * A board entry with what sits behind it, each closed until asked for: the
 * runner's earlier PBs, and (their view) faster runs that are off the board.
 * The lists sit under the row as their own blocks, outside the row's
 * whole-row link. Every finished run on the slice is in the row's ⋯ menu.
 */
export function EntryWithEarlierPbs({
    slower = [],
    faster = [],
    ...props
}: EntryRowProps & {
    /** The runner's view: slower runs off the board on this slice. They sit
     * with the earlier PBs. */
    slower?: SubmissionItem[];
    /** The runner's view: faster runs on this slice that are off the board. */
    faster?: SubmissionItem[];
}) {
    const { entry, gameRef } = props;
    const [open, setOpen] = useState(false);
    const [offOpen, setOffOpen] = useState(false);
    const listId = useId();
    const offId = useId();
    const earlier = entry.earlierPbs ?? [];
    const count = (entry.earlierPbCount ?? earlier.length) + slower.length;
    const allRuns = useAllRuns(
        {
            categoryId: entry.categoryId,
            subcategoryKey: entry.subcategoryKey,
        },
        gameRef ? { gameId: entry.gameId, gameRef, format: entry } : null,
    );

    const meta = (
        <>
            {count > 0 ? (
                <button
                    type="button"
                    className={styles.earlierToggle}
                    aria-expanded={open}
                    aria-controls={listId}
                    onClick={() => setOpen((v) => !v)}
                >
                    {count} earlier {count === 1 ? 'PB' : 'PBs'}
                </button>
            ) : null}
            {faster.length > 0 && gameRef ? (
                <button
                    type="button"
                    className={styles.earlierToggle}
                    aria-expanded={offOpen}
                    aria-controls={offId}
                    onClick={() => setOffOpen((v) => !v)}
                >
                    {faster.length} off the board
                </button>
            ) : null}
        </>
    );

    // Each PB is compared with the one that replaced it: the next newer
    // earlier PB, or the entry itself for the newest.
    const nextTime = (i: number) =>
        i === 0 ? entry.timeMs : earlier[i - 1].timeMs;

    return (
        <>
            <EntryRow {...props} meta={meta} allRuns={allRuns.menuItem} />
            {offOpen && faster.length > 0 && gameRef ? (
                <div id={offId} className={styles.earlierList}>
                    <OffBoardRows items={faster} gameRef={gameRef} nested />
                </div>
            ) : null}
            {open && count > 0 ? (
                <div id={listId} className={styles.earlierList}>
                    {gameRef ? (
                        <OffBoardRows items={slower} gameRef={gameRef} nested />
                    ) : null}
                    {earlier.map((pb, i) => (
                        <EarlierPbRow
                            key={`${pb.kind}-${pb.runId ?? pb.manualTimeId}`}
                            pb={pb}
                            entry={entry}
                            gameRef={gameRef}
                            improvedBy={Math.max(0, pb.timeMs - nextTime(i))}
                        />
                    ))}
                    {count - slower.length > earlier.length ? (
                        <div className={styles.earlierMore}>
                            {count - slower.length - earlier.length} older not
                            shown
                        </div>
                    ) : null}
                    {entry.splitsHref ? (
                        <Link
                            href={entry.splitsHref}
                            className={styles.earlierAll}
                        >
                            All attempts →
                        </Link>
                    ) : null}
                </div>
            ) : null}
            {allRuns.list}
        </>
    );
}
