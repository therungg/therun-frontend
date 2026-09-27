'use client';

import { PlayFill } from 'react-bootstrap-icons';
import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import type { SubmissionItem } from '../../../../../types/runner-status.types';
import { RankBall, shortDate } from '../entry-row';
import { entrySubcategoryLabel, formatProfileDate } from '../format';
import profileStyles from '../leaderboards-profile.module.scss';
import styles from './owner-layer.module.scss';
import { useOwnerLayer } from './owner-layer-provider';
import {
    type ItemBoard,
    itemHref,
    itemTime,
    RowStatus,
    useOwnerRow,
} from './row-status';

/**
 * One run or manual time with no public row: off the boards, or further back
 * in the runner's history. Laid out on the board rows' grid, quieter.
 */
export function OwnerItemRow({
    item,
    board,
    label,
}: {
    item: SubmissionItem;
    board: ItemBoard;
    /** The board's name, when the row is not already under it. */
    label?: string;
}) {
    const { toggle, panel } = useOwnerRow(item, board);
    const href = itemHref(board.gameRef, item);
    const time = itemTime(item, board.format);
    const date = item.endedAt;

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
                <span className={profileStyles.runSource} />
                <span
                    className={profileStyles.runDate}
                    title={date ? formatProfileDate(date) : undefined}
                >
                    {date ? shortDate(date) : '—'}
                </span>
                <span className={profileStyles.runActions}>
                    {item.vodUrl ? (
                        <a
                            href={item.vodUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Watch the run"
                            title="Watch the run"
                            className={profileStyles.runIcon}
                        >
                            <PlayFill size={15} aria-hidden />
                        </a>
                    ) : (
                        <span className={profileStyles.runIconSpacer} />
                    )}
                    {toggle}
                </span>
            </div>
            {panel}
        </>
    );
}

/** The board's name for a row that is not under a public row of its own. */
export function itemBoardLabel(item: SubmissionItem): string {
    const category = item.categoryDisplay ?? 'Unknown board';
    const sub = entrySubcategoryLabel({
        subcategoryKey: item.subcategoryKey,
        category,
    });
    return sub ? `${category} · ${sub}` : category;
}

/** A game's runs off the boards, each under its board's name. */
export function OffBoardRows({
    items,
    gameRef,
}: {
    items: SubmissionItem[];
    gameRef: string;
}) {
    const { formatFor } = useOwnerLayer();
    return (
        <>
            {items.map((item) => (
                <OwnerItemRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    label={itemBoardLabel(item)}
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
