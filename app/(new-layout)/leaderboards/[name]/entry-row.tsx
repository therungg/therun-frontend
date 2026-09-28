'use client';

import type { ReactNode } from 'react';
import { BarChartLineFill, CheckCircleFill } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { runnerStatusHint } from '~src/lib/moderation/run-status-copy';
import type { LeaderboardsProfileEntry } from '../../../../types/leaderboards-profile.types';
import {
    entryHref,
    formatEntryTime,
    formatProfileDate,
    medalOf,
    profileBoardHref,
    shortDate,
    sourceLabel,
    timingLabel,
} from './format';
import styles from './leaderboards-profile.module.scss';
import { useOwnerLayer } from './owner-layer/owner-layer-provider';
import { StatusSlot, useOwnerRow } from './owner-layer/row-status';
import { Partners } from './partners';
import { PinToggle } from './pin-toggle';
import { SubcategoryTags } from './subcategory-tags';
import { VodButton } from './vod-button';

/** How a row opens the History under it. */
export interface RowHistory {
    open: boolean;
    toggle: () => void;
}

/** Verified reads as a quiet tick; pending always says so in words. */
export function EntryStatus({
    entry,
    compact = false,
}: {
    entry: Pick<LeaderboardsProfileEntry, 'status' | 'verifiedAt'>;
    /** Verified as the tick alone, with the word in the tooltip. */
    compact?: boolean;
}) {
    if (entry.status === 'verified') {
        return (
            <span
                className={styles.statusVerified}
                role="img"
                aria-label="Verified"
                title={
                    entry.verifiedAt
                        ? `Verified ${formatProfileDate(entry.verifiedAt)}`
                        : 'Verified'
                }
            >
                <CheckCircleFill size={12} aria-hidden />
                {compact ? null : 'Verified'}
            </span>
        );
    }
    if (entry.status === 'pending') {
        return (
            <span
                className={styles.statusPending}
                title="Waiting for a moderator"
            >
                Pending
            </span>
        );
    }
    return <span className={styles.statusRejected}>Rejected</span>;
}

function ordinal(n: number): string {
    const tens = n % 100;
    if (tens >= 11 && tens <= 13) return `${n}th`;
    switch (n % 10) {
        case 1:
            return `${n}st`;
        case 2:
            return `${n}nd`;
        case 3:
            return `${n}rd`;
        default:
            return `${n}th`;
    }
}

/** The placing as a ball: the number on a medal for an earned podium, the ordinal otherwise. */
export function RankBall({
    rank,
    medal,
    pending = false,
    title,
}: {
    rank: number | null;
    /** From `medalOf`; absent means no medal. */
    medal?: string;
    /** A pending run's placing is provisional: an outlined ball. */
    pending?: boolean;
    title?: string;
}) {
    return (
        <span
            className={styles.runMedal}
            data-medal={medal}
            data-pending={(pending && rank !== null) || undefined}
            data-none={rank === null || undefined}
            title={title}
        >
            <span aria-hidden={title ? true : undefined}>
                {rank === null ? '—' : rank}
            </span>
            {title ? <span className="visually-hidden">{title}</span> : null}
        </span>
    );
}

export function EntryRow({
    entry,
    gameRef,
    country,
    boardsVisible,
    meta,
    history,
}: {
    entry: LeaderboardsProfileEntry;
    /** The entry's game, for the time's link to its page. Null leaves it plain. */
    gameRef: string | null;
    country: string | null;
    /** Whether the category name may link to its board. */
    boardsVisible: boolean;
    /** Extra facts for the line under the name: the History toggle. */
    meta?: ReactNode;
    /** The entry's History under the row: a click anywhere but a link opens it. */
    history?: RowHistory;
}) {
    // The runner's own view, for the runner and their moderators: the run's
    // status and video in the runner's words instead of the public tick. A
    // co-op run the runner is only credited on has no item: public row only.
    const { itemFor } = useOwnerLayer();
    const item = itemFor(
        entry.kind,
        entry.kind === 'run' ? entry.runId : entry.manualTimeId,
    );
    const { toggle, panel } = useOwnerRow(
        item,
        gameRef ? { gameId: entry.gameId, gameRef, format: entry } : null,
    );
    const vodUrl = item ? item.vodUrl : entry.vodUrl;
    const href = gameRef ? entryHref(gameRef, entry) : null;
    const boardHref = profileBoardHref(gameRef, entry, boardsVisible);
    const timing = timingLabel(entry);
    const source = sourceLabel(entry.provenance);
    const total = entry.totalRunners ?? 0;
    const pending = entry.status === 'pending';
    const placing = [
        entry.rank !== null
            ? total > 1
                ? `${ordinal(entry.rank)} of ${total.toLocaleString('en-US')} runners`
                : ordinal(entry.rank)
            : null,
        entry.countryRank !== null && country
            ? `#${entry.countryRank} in ${country.toUpperCase()}`
            : null,
        pending && entry.rank !== null ? 'pending' : null,
    ].filter(Boolean);
    const runLabel = `${entry.category}, ${formatEntryTime(entry)}`;
    // The runner's view says why a run is not verified in words, not only in
    // the pill's tooltip: a phone has no hover.
    const note =
        item && item.status !== 'on_board'
            ? runnerStatusHint(item.status, item.reason)
            : null;

    return (
        <>
            <div
                className={styles.runRow}
                data-linked={href || history ? true : undefined}
                data-opens={history ? true : undefined}
                data-open={history?.open || undefined}
            >
                {history ? (
                    <button
                        type="button"
                        className={`${styles.rowOpener} stretched-link`}
                        aria-hidden
                        tabIndex={-1}
                        onClick={history.toggle}
                    />
                ) : null}
                <RankBall
                    rank={entry.rank}
                    medal={medalOf(entry)}
                    pending={pending}
                    title={placing.length > 0 ? placing.join(', ') : undefined}
                />
                <span className={styles.runName}>
                    <span className={styles.runTitle}>
                        <span className={styles.runCategory}>
                            {boardHref ? (
                                <Link
                                    href={boardHref}
                                    className={styles.boardLink}
                                >
                                    {entry.category}
                                </Link>
                            ) : (
                                entry.category
                            )}
                        </span>
                        <SubcategoryTags entry={entry} />
                        <Partners partners={entry.partners} runHref={href} />
                    </span>
                    <span className={styles.runMeta}>
                        {total > 1 ? (
                            <span>of {total.toLocaleString('en-US')}</span>
                        ) : null}
                        {source ? <span>{source}</span> : null}
                        {note ? (
                            <span className={styles.runNote}>{note}</span>
                        ) : null}
                        {meta}
                        {entry.runDate ? (
                            <span className={styles.runMetaDate}>
                                {shortDate(entry.runDate)}
                            </span>
                        ) : null}
                    </span>
                </span>
                <span className={styles.runTime}>
                    {timing ? (
                        <span className={styles.entryTiming}>{timing}</span>
                    ) : null}
                    {href ? (
                        <Link
                            href={href}
                            className={
                                history
                                    ? `${styles.runLink} ${styles.runLinkAbove}`
                                    : `${styles.runLink} stretched-link`
                            }
                            aria-label={runLabel}
                        >
                            {formatEntryTime(entry)}
                        </Link>
                    ) : (
                        <span>{formatEntryTime(entry)}</span>
                    )}
                </span>
                <span
                    className={styles.runDate}
                    title={
                        entry.runDate
                            ? formatProfileDate(entry.runDate)
                            : undefined
                    }
                >
                    {entry.runDate ? shortDate(entry.runDate) : '—'}
                </span>
                <span className={styles.runStatus}>
                    {item ? (
                        <StatusSlot item={item} />
                    ) : (
                        <EntryStatus entry={entry} compact />
                    )}
                </span>
                <span className={styles.runActions}>
                    {vodUrl ? (
                        <VodButton vodUrl={vodUrl} title={runLabel} />
                    ) : (
                        <span className={styles.runIconSpacer} />
                    )}
                    {entry.splitsHref ? (
                        <Link
                            href={entry.splitsHref}
                            className={styles.runIcon}
                            aria-label={`Splits stats: ${runLabel}`}
                            title="Splits stats"
                        >
                            <BarChartLineFill size={13} aria-hidden />
                        </Link>
                    ) : (
                        <span className={styles.runIconSpacer} />
                    )}
                    <PinToggle entry={entry} />
                    {toggle}
                </span>
            </div>
            {panel}
        </>
    );
}

export { shortDate };
