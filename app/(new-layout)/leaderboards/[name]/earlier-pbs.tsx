'use client';

import { useId, useState } from 'react';
import Link from '~src/components/link';
import type {
    LeaderboardsProfileEarlierPb,
    LeaderboardsProfileEntry,
} from '../../../../types/leaderboards-profile.types';
import { EntryRow, shortDate } from './entry-row';
import {
    entryHref,
    formatEntryTime,
    formatProfileDate,
    sourceLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { useAllRuns } from './owner-layer/all-runs-toggle';
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
 * A board entry with the runner's earlier PBs on its subcategory, closed until
 * asked for. The list sits under the row as its own block, outside the row's
 * whole-row link. The runner's view adds every finished run on the slice.
 */
export function EntryWithEarlierPbs(props: EntryRowProps) {
    const { entry, gameRef } = props;
    const [open, setOpen] = useState(false);
    const listId = useId();
    const earlier = entry.earlierPbs ?? [];
    const count = entry.earlierPbCount ?? earlier.length;
    const allRuns = useAllRuns(
        {
            categoryId: entry.categoryId,
            subcategoryKey: entry.subcategoryKey,
        },
        gameRef ? { gameId: entry.gameId, gameRef, format: entry } : null,
    );

    if (count === 0 && !allRuns.toggle) return <EntryRow {...props} />;

    const toggle =
        count > 0 ? (
            <button
                type="button"
                className={styles.earlierToggle}
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((v) => !v)}
            >
                {count} earlier {count === 1 ? 'PB' : 'PBs'}
            </button>
        ) : null;

    // Each PB is compared with the one that replaced it: the next newer
    // earlier PB, or the entry itself for the newest.
    const nextTime = (i: number) =>
        i === 0 ? entry.timeMs : earlier[i - 1].timeMs;

    return (
        <>
            <EntryRow
                {...props}
                earlierToggle={
                    <>
                        {toggle}
                        {allRuns.toggle}
                    </>
                }
            />
            {open && count > 0 ? (
                <div id={listId} className={styles.earlierList}>
                    {earlier.map((pb, i) => (
                        <EarlierPbRow
                            key={`${pb.kind}-${pb.runId ?? pb.manualTimeId}`}
                            pb={pb}
                            entry={entry}
                            gameRef={gameRef}
                            improvedBy={Math.max(0, pb.timeMs - nextTime(i))}
                        />
                    ))}
                    {count > earlier.length ? (
                        <div className={styles.earlierMore}>
                            {count - earlier.length} older not shown
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
