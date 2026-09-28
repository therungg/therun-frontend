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
    formatDelta,
    formatEntryTime,
    formatProfileDate,
    sourceLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { useAllRuns } from './owner-layer/all-runs-toggle';
import { OffBoardRows } from './owner-layer/off-board-rows';
import ownerStyles from './owner-layer/owner-layer.module.scss';
import { useOwnerLayer } from './owner-layer/owner-layer-provider';
import { StatusSlot, useOwnerRow } from './owner-layer/row-status';
import { VodButton } from './vod-button';

type EntryRowProps = Parameters<typeof EntryRow>[0];

/**
 * One earlier PB under its entry, on the entry's own columns: its gap to the
 * PB that replaced it, where it came from, when. The runner's view adds its
 * status and controls.
 */
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
    const time = formatEntryTime({ ...entry, timeMs: pb.timeMs });
    const source = sourceLabel(pb.provenance);
    return (
        <>
            <div
                className={`${styles.runRow} ${ownerStyles.compact}`}
                data-linked={href ? true : undefined}
            >
                <span className={styles.runName}>
                    <span className={styles.runMeta}>
                        <span>beaten by {formatDelta(improvedBy)}</span>
                        {source ? <span>{source}</span> : null}
                    </span>
                </span>
                <span
                    className={`${styles.runTime} ${ownerStyles.compactTime}`}
                >
                    {href ? (
                        <Link
                            href={href}
                            className={`${styles.runLink} stretched-link`}
                        >
                            {time}
                        </Link>
                    ) : (
                        <span>{time}</span>
                    )}
                </span>
                <span
                    className={styles.runDate}
                    title={
                        pb.runDate ? formatProfileDate(pb.runDate) : undefined
                    }
                >
                    {pb.runDate ? shortDate(pb.runDate) : '—'}
                </span>
                <span className={styles.runStatus}>
                    {item && item.status !== 'beaten' ? (
                        <StatusSlot item={item} />
                    ) : null}
                </span>
                <span className={styles.runActions}>
                    {item?.vodUrl ? (
                        <VodButton
                            vodUrl={item.vodUrl}
                            title={`${entry.category} · ${time}`}
                        />
                    ) : (
                        <span className={styles.runIconSpacer} />
                    )}
                    {toggle}
                </span>
            </div>
            {panel}
        </>
    );
}

/**
 * A board entry with what sits behind it, each closed until asked for: the
 * runner's earlier PBs, and (their view) runs on the slice that are off the
 * board, slower or faster. Each opens as its own list under the row, on the
 * row's columns, outside its whole-row link. Every finished run on the slice
 * is in the row's ⋯ menu.
 */
export function EntryWithEarlierPbs({
    slower = [],
    faster = [],
    ...props
}: EntryRowProps & {
    /** The runner's view: slower runs on this slice that are off the board. */
    slower?: SubmissionItem[];
    /** The runner's view: faster runs on this slice that are off the board. */
    faster?: SubmissionItem[];
}) {
    const { entry, gameRef } = props;
    const [open, setOpen] = useState<'pbs' | 'slower' | 'faster' | null>(null);
    const listId = useId();
    const earlier = entry.earlierPbs ?? [];
    const pbCount = entry.earlierPbCount ?? earlier.length;
    const allRuns = useAllRuns(
        {
            categoryId: entry.categoryId,
            subcategoryKey: entry.subcategoryKey,
        },
        gameRef ? { gameId: entry.gameId, gameRef, format: entry } : null,
        {
            kind: entry.kind,
            id: entry.kind === 'run' ? entry.runId : entry.manualTimeId,
            timeMs: entry.timeMs,
        },
    );

    const toggle = (which: 'pbs' | 'slower' | 'faster', label: string) => (
        <button
            type="button"
            className={styles.earlierToggle}
            aria-expanded={open === which}
            aria-controls={open === which ? listId : undefined}
            onClick={() => setOpen((v) => (v === which ? null : which))}
        >
            {label}
        </button>
    );
    const meta = (
        <>
            {pbCount > 0
                ? toggle(
                      'pbs',
                      `${pbCount} earlier ${pbCount === 1 ? 'PB' : 'PBs'}`,
                  )
                : null}
            {slower.length > 0 && gameRef
                ? toggle(
                      'slower',
                      `${slower.length} slower ${slower.length === 1 ? 'run' : 'runs'}`,
                  )
                : null}
            {faster.length > 0 && gameRef
                ? toggle('faster', `${faster.length} off the board`)
                : null}
        </>
    );

    // Each PB is compared with the one that replaced it: the next newer
    // earlier PB, or the entry itself for the newest.
    const nextTime = (i: number) =>
        i === 0 ? entry.timeMs : earlier[i - 1].timeMs;
    const offItems = open === 'slower' ? slower : faster;

    return (
        <>
            <EntryRow {...props} meta={meta} allRuns={allRuns.menuItem} />
            {(open === 'slower' || open === 'faster') && gameRef ? (
                <div id={listId} className={styles.runsNested}>
                    <OffBoardRows
                        items={offItems}
                        gameRef={gameRef}
                        compareMs={entry.timeMs}
                    />
                </div>
            ) : null}
            {open === 'pbs' ? (
                <div id={listId} className={styles.runsNested}>
                    {earlier.map((pb, i) => (
                        <EarlierPbRow
                            key={`${pb.kind}-${pb.runId ?? pb.manualTimeId}`}
                            pb={pb}
                            entry={entry}
                            gameRef={gameRef}
                            improvedBy={Math.max(0, pb.timeMs - nextTime(i))}
                        />
                    ))}
                    {pbCount > earlier.length || entry.splitsHref ? (
                        <div className={styles.nestedFoot}>
                            {pbCount > earlier.length ? (
                                <span>
                                    {pbCount - earlier.length} older not shown
                                </span>
                            ) : null}
                            {entry.splitsHref ? (
                                <Link href={entry.splitsHref}>
                                    All attempts →
                                </Link>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}
            {allRuns.list}
        </>
    );
}
