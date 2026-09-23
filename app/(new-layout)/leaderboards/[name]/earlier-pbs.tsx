'use client';

import { useId, useState } from 'react';
import Link from '~src/components/link';
import type { LeaderboardsProfileEntry } from '../../../../types/leaderboards-profile.types';
import { EntryRow, shortDate } from './entry-row';
import {
    entryHref,
    formatEntryTime,
    formatProfileDate,
    sourceLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';

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

/**
 * A board entry with the runner's earlier PBs on its subcategory, closed until
 * asked for. The list sits under the row as its own block, outside the row's
 * whole-row link.
 */
export function EntryWithEarlierPbs(props: EntryRowProps) {
    const { entry, gameRef } = props;
    const [open, setOpen] = useState(false);
    const listId = useId();
    const earlier = entry.earlierPbs ?? [];
    const count = entry.earlierPbCount ?? earlier.length;

    if (count === 0) return <EntryRow {...props} />;

    const toggle = (
        <button
            type="button"
            className={styles.earlierToggle}
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
        >
            {count} earlier {count === 1 ? 'PB' : 'PBs'}
        </button>
    );

    // Each PB is compared with the one that replaced it: the next newer
    // earlier PB, or the entry itself for the newest.
    const nextTime = (i: number) =>
        i === 0 ? entry.timeMs : earlier[i - 1].timeMs;

    return (
        <>
            <EntryRow {...props} earlierToggle={toggle} />
            {open ? (
                <div id={listId} className={styles.earlierList}>
                    {earlier.map((pb, i) => {
                        const href = gameRef ? entryHref(gameRef, pb) : null;
                        const shown = { ...entry, timeMs: pb.timeMs };
                        const improvedBy = pb.timeMs - nextTime(i);
                        return (
                            <div
                                key={`${pb.kind}-${pb.runId ?? pb.manualTimeId}`}
                                className={styles.earlierRow}
                            >
                                <span className={styles.earlierTime}>
                                    {href ? (
                                        <Link href={href}>
                                            {formatEntryTime(shown)}
                                        </Link>
                                    ) : (
                                        formatEntryTime(shown)
                                    )}
                                </span>
                                <span className={styles.earlierDelta}>
                                    beaten by {formatDelta(improvedBy)}
                                </span>
                                <span className={styles.earlierSource}>
                                    {sourceLabel(pb.provenance)}
                                </span>
                                <span
                                    className={styles.earlierDate}
                                    title={
                                        pb.runDate
                                            ? formatProfileDate(pb.runDate)
                                            : undefined
                                    }
                                >
                                    {pb.runDate ? shortDate(pb.runDate) : '—'}
                                </span>
                            </div>
                        );
                    })}
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
        </>
    );
}
