'use client';

import Link from '~src/components/link';
import type {
    LeaderboardsProfileEarlierPb,
    LeaderboardsProfileEntry,
} from '../../../../types/leaderboards-profile.types';
import { EntryRow, shortDate } from './entry-row';
import {
    entryHref,
    formatDelta,
    formatEntryTime,
    formatProfileDate,
    sourceLabel,
} from './format';
import { useHistory } from './history';
import styles from './leaderboards-profile.module.scss';
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
 * A board entry with its History under it: the PBs that led to it, or every
 * finished run on the board. Closed until asked for, outside the row's
 * whole-row link.
 */
export function EntryWithEarlierPbs(props: EntryRowProps) {
    const { entry, gameRef } = props;
    const earlier = entry.earlierPbs ?? [];
    const pbCount = entry.earlierPbCount ?? earlier.length;

    // Each PB is compared with the one that replaced it: the next newer
    // earlier PB, or the entry itself for the newest.
    const nextTime = (i: number) =>
        i === 0 ? entry.timeMs : earlier[i - 1].timeMs;

    const history = useHistory({
        entry,
        gameRef,
        pbCount,
        renderPbs: () => (
            <>
                {earlier.map((pb, i) => (
                    <EarlierPbRow
                        key={`${pb.kind}-${pb.runId ?? pb.manualTimeId}`}
                        pb={pb}
                        entry={entry}
                        gameRef={gameRef}
                        improvedBy={Math.max(0, pb.timeMs - nextTime(i))}
                    />
                ))}
                {earlier.length === 0 ? (
                    <div className={styles.nestedFoot}>No earlier PBs.</div>
                ) : null}
                {pbCount > earlier.length || entry.splitsHref ? (
                    <div className={styles.nestedFoot}>
                        {pbCount > earlier.length ? (
                            <span>
                                {pbCount - earlier.length} older not shown
                            </span>
                        ) : null}
                        {entry.splitsHref ? (
                            <Link href={entry.splitsHref}>All attempts →</Link>
                        ) : null}
                    </div>
                ) : null}
            </>
        ),
    });

    return (
        <>
            <EntryRow {...props} meta={history.toggle} />
            {history.list}
        </>
    );
}
