'use client';

import type { ReactNode } from 'react';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import { runnerStatusHint } from '~src/lib/moderation/run-status-copy';
import type { SubmissionItem } from '../../../../../types/runner-status.types';
import { RankBall, shortDate } from '../entry-row';
import { formatDelta, formatProfileDate } from '../format';
import profileStyles from '../leaderboards-profile.module.scss';
import { PbTag } from '../pb-tag';
import { VodButton } from '../vod-button';
import styles from './owner-layer.module.scss';
import { useOwnerLayer } from './owner-layer-provider';
import {
    type ItemBoard,
    itemBoardLabel,
    itemHref,
    itemTime,
    RowStatus,
    StatusSlot,
    useOwnerRow,
} from './row-status';

export { itemBoardLabel };

/**
 * One run with no public row: off the boards, or further back
 * in the runner's history. Laid out on the board rows' grid, quieter.
 */
export function OwnerItemRow({
    item,
    board,
    label,
    compareMs,
    pb = false,
}: {
    item: SubmissionItem;
    board: ItemBoard;
    /** The board's name, when the row is not already under it. */
    label?: string;
    /** Under its entry's History: this run was a PB. */
    pb?: boolean;
    /** Under a board entry: the entry's time, to show this run's gap to it.
     * The row then lines up with the entry's columns, compact. */
    compareMs?: number;
}) {
    const { toggle, panel } = useOwnerRow(item, board);
    const href = itemHref(board.gameRef, item);
    const time = itemTime(item, board.format);
    const date = item.endedAt;
    if (compareMs !== undefined) {
        return (
            <>
                <CompactRow
                    item={item}
                    board={board}
                    compareMs={compareMs}
                    pb={pb}
                    href={href}
                    time={time}
                    toggle={toggle}
                />
                {panel}
            </>
        );
    }

    return (
        <>
            <div
                className={`${profileStyles.runRow} ${styles.muted}`}
                data-linked={href ? true : undefined}
            >
                <RankBall rank={null} />
                <span className={profileStyles.runName}>
                    {label ? (
                        <span className={styles.offLabel}>{label}</span>
                    ) : null}
                    <RowStatus item={item} withReason />
                </span>
                <span className={profileStyles.runTime}>
                    {href ? (
                        <Link
                            href={href}
                            className={`${profileStyles.runLink} stretched-link`}
                        >
                            {time}
                        </Link>
                    ) : (
                        <span>{time}</span>
                    )}
                </span>
                <span
                    className={profileStyles.runDate}
                    title={date ? formatProfileDate(date) : undefined}
                >
                    {date ? shortDate(date) : '—'}
                </span>
                <span className={profileStyles.runStatus} />
                <span className={profileStyles.runActions}>
                    {item.vodUrl ? (
                        <VodButton
                            vodUrl={item.vodUrl}
                            title={`${itemBoardLabel(item)} · ${time}`}
                        />
                    ) : (
                        <span className={profileStyles.runIconSpacer} />
                    )}
                    <span className={profileStyles.runIconSpacer} />
                    {toggle}
                </span>
            </div>
            {panel}
        </>
    );
}

// A beaten run needs no words: its gap to the entry says it all.
const QUIET: SubmissionItem['status'][] = ['beaten', 'on_board'];

/** One run under its board entry, on the entry's own columns. */
function CompactRow({
    item,
    board,
    compareMs,
    pb,
    href,
    time,
    toggle,
}: {
    item: SubmissionItem;
    board: ItemBoard;
    compareMs: number;
    pb: boolean;
    href: string | null;
    time: string;
    toggle: ReactNode;
}) {
    const ms =
        board.format.timing === 'gametime' && item.gameTimeMs !== null
            ? item.gameTimeMs
            : item.timeMs;
    const gap = ms - compareMs;
    // A beaten run the runner can still submit says so; one they can't stays quiet.
    const note =
        QUIET.includes(item.status) && item.nextStep !== 'submit'
            ? null
            : runnerStatusHint(item.status, item.reason, item.nextStep);
    const date = item.endedAt;
    return (
        <div
            className={`${profileStyles.runRow} ${styles.compact}`}
            data-compact
            data-linked={href ? true : undefined}
        >
            <span className={profileStyles.runName}>
                <span className={profileStyles.runMeta}>
                    {pb ? <PbTag /> : null}
                    {gap !== 0 ? (
                        <span>
                            {gap > 0 ? '+' : '−'}
                            {formatDelta(Math.abs(gap))}
                        </span>
                    ) : null}
                    {note ? <span>{note}</span> : null}
                </span>
            </span>
            <span className={`${profileStyles.runTime} ${styles.compactTime}`}>
                {href ? (
                    <Link
                        href={href}
                        className={`${profileStyles.runLink} stretched-link`}
                    >
                        {time}
                    </Link>
                ) : (
                    <span>{time}</span>
                )}
            </span>
            <span
                className={profileStyles.runDate}
                title={date ? formatProfileDate(date) : undefined}
            >
                {date ? shortDate(date) : '—'}
            </span>
            <span className={profileStyles.runStatus}>
                {item.status === 'beaten' ? null : <StatusSlot item={item} />}
            </span>
            <span className={profileStyles.runActions}>
                {item.vodUrl ? (
                    <VodButton
                        vodUrl={item.vodUrl}
                        title={`${itemBoardLabel(item)} · ${time}`}
                    />
                ) : (
                    <span className={profileStyles.runIconSpacer} />
                )}
                <span className={profileStyles.runIconSpacer} />
                {toggle}
            </span>
        </div>
    );
}

/** A game's runs off the boards, each under its board's name unless nested under its entry. */
export function OffBoardRows({
    items,
    gameRef,
    compareMs,
}: {
    items: SubmissionItem[];
    gameRef: string;
    /** Folded under their board entry: compact rows with the gap to it. */
    compareMs?: number;
}) {
    const { formatFor } = useOwnerLayer();
    return (
        <>
            {items.map((item) => (
                <OwnerItemRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    label={
                        compareMs === undefined
                            ? itemBoardLabel(item)
                            : undefined
                    }
                    compareMs={compareMs}
                    board={{
                        gameId: item.gameId,
                        gameRef,
                        format: formatFor(item.gameId, item.categoryId),
                    }}
                />
            ))}
        </>
    );
}

/**
 * Games the public profile does not list because every run the runner has
 * there is off the boards. Only the layer's viewers see these.
 */
export function OffBoardGames({
    profileGameIds,
    search,
}: {
    profileGameIds: Set<number>;
    search: string;
}) {
    const { overview, games, offBoardInGame } = useOwnerLayer();
    if (!overview) return null;
    const needle = search.trim().toLowerCase();
    const ids = [
        ...new Set(
            [...overview.items, ...overview.needsYou].map((i) => i.gameId),
        ),
    ].filter((id) => !profileGameIds.has(id));

    return (
        <>
            {ids.map((gameId) => {
                const game = games.get(gameId);
                const items = offBoardInGame(gameId);
                if (items.length === 0) return null;
                const name = game?.game ?? 'Another game';
                if (needle && !name.toLowerCase().includes(needle)) {
                    return null;
                }
                return (
                    <section
                        key={gameId}
                        id={`game-${gameId}`}
                        className={profileStyles.runsGame}
                    >
                        <div className={styles.offGameHead}>
                            <span className={styles.art}>
                                <GameImage
                                    src={game?.imageUrl ?? ''}
                                    alt=""
                                    quality="small"
                                    width={36}
                                    height={48}
                                />
                            </span>
                            {name}
                        </div>
                        <div className={profileStyles.runsRows}>
                            <OffBoardRows
                                items={items}
                                gameRef={game?.gameRef ?? ''}
                            />
                        </div>
                    </section>
                );
            })}
        </>
    );
}
