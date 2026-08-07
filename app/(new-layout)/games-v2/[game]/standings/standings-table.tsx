'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '~src/components/link';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildBoardHref } from '~src/lib/board-url';
import type { StandingsCategory } from '../../../../../types/leaderboards.types';
import { CountryFlag } from '../leaderboard/country-flag';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import type { ScoredRunner } from './scoring';
import styles from './standings.module.scss';

interface Props {
    gameSlug: string;
    rows: ScoredRunner[];
    /** The selected categories, in the same order as each row's cells. */
    columns: StandingsCategory[];
}

const RANK_CLASS: Record<number, string> = {
    1: styles.rankGold,
    2: styles.rankSilver,
    3: styles.rankBronze,
};

// Podium rows carry the leaderboard's signature: medal spine on the left
// edge, heavier numeral, faint gold wash under #1.
const ROW_CLASS: Record<number, string> = {
    1: styles.podiumRow1,
    2: styles.podiumRow2,
    3: styles.podiumRow3,
};

// Above this many counted columns the cells drop to rank-only — the rich
// "#4 of 769 + time" cell stops fitting any viewport, and the viewer who
// counted this many asked for breadth, not per-cell detail (which stays in
// the hover title and on the boards themselves).
const COMPACT_THRESHOLD = 10;

const ptsText = (pts: number) => Math.round(pts).toLocaleString();

// Plain-string time for compact-cell hover titles (DurationToFormatted is a
// component; titles need text).
function titleTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export function StandingsTable({ gameSlug, rows, columns }: Props) {
    const compact = columns.length > COMPACT_THRESHOLD;
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [hiddenCols, setHiddenCols] = useState(0);

    // How many category columns sit past the right edge — drives the fade
    // and the "+N more" chip, so the table never silently ends where the
    // viewport does.
    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            let hidden = 0;
            for (const th of el.querySelectorAll('th[data-col]')) {
                if (th.getBoundingClientRect().left >= rect.right - 16) {
                    hidden++;
                }
            }
            setHiddenCols(hidden);
        };
        update();
        el.addEventListener('scroll', update, { passive: true });
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, []);

    return (
        // Wide matrices scroll inside their own container; the page body must
        // never scroll sideways. The shell anchors the overflow affordances.
        <div className={styles.tableShell}>
            <div className={styles.tableScroll} ref={scrollerRef}>
                <table
                    className={
                        compact
                            ? `${styles.table} ${styles.tableCompact}`
                            : styles.table
                    }
                >
                    <thead>
                        <tr>
                            <th className={styles.thRank} scope="col">
                                #
                            </th>
                            <th className={styles.thRunner} scope="col">
                                Runner
                            </th>
                            <th className={styles.thScore} scope="col">
                                Points
                            </th>
                            {columns.map((category) => (
                                <th
                                    key={category.id}
                                    className={styles.thCategory}
                                    scope="col"
                                    data-col
                                >
                                    <Link
                                        href={buildBoardHref(gameSlug, {
                                            categorySlug: category.name,
                                        })}
                                        className={styles.thLink}
                                    >
                                        {category.display}
                                    </Link>
                                    {category.timing === 'gt' && (
                                        <span className={styles.timingTag}>
                                            {category.gameTimeLabel === 'lrt'
                                                ? 'LRT'
                                                : 'IGT'}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const position = i + 1;
                            return (
                                <tr
                                    key={row.runner.name}
                                    className={ROW_CLASS[position] ?? ''}
                                >
                                    <td
                                        className={`${styles.tdRank} ${
                                            RANK_CLASS[position] ?? ''
                                        }`}
                                    >
                                        {position}
                                    </td>
                                    <td className={styles.tdRunner}>
                                        {/* Flex lives on an inner span, never on
                                        the td — a flex table-cell slips out
                                        of its row's geometry (same trap the
                                        leaderboard's .runnerCell avoids). */}
                                        <span className={styles.runnerCell}>
                                            <RunnerAvatar
                                                name={row.runner.name}
                                                picture={row.runner.picture}
                                                size="xs"
                                            />
                                            <span className={styles.runnerName}>
                                                {/* Guests hold real entries but
                                                have no profile to link to. */}
                                                {row.runner.isGuest ? (
                                                    row.runner.name
                                                ) : (
                                                    <UserLink
                                                        username={
                                                            row.runner.name
                                                        }
                                                    />
                                                )}
                                            </span>
                                            <CountryFlag
                                                country={row.runner.country}
                                            />
                                        </span>
                                    </td>
                                    <td className={styles.tdScore}>
                                        <span className={styles.scoreValue}>
                                            {ptsText(row.score)}
                                        </span>
                                        <span
                                            className={styles.scoreBar}
                                            aria-hidden
                                            style={{
                                                // Relative to the leader, so the
                                                // bars use the full width even when
                                                // every score is low.
                                                ['--fill' as string]: `${
                                                    rows[0].score > 0
                                                        ? (
                                                              row.score /
                                                                  rows[0].score
                                                          ) * 100
                                                        : 0
                                                }%`,
                                            }}
                                        />
                                    </td>
                                    {row.cells.map((cell, c) => (
                                        <td
                                            key={columns[c].id}
                                            className={styles.tdCell}
                                        >
                                            {cell ? (
                                                compact ? (
                                                    // Rank-only: the detail lives
                                                    // in the title and one click
                                                    // away on the board.
                                                    <span
                                                        className={`${styles.cellRank} ${
                                                            RANK_CLASS[
                                                                cell.rank
                                                            ] ?? ''
                                                        }`}
                                                        title={`#${cell.rank} of ${columns[c].entryCount.toLocaleString()} · ${titleTime(cell.timeMs)} · ${ptsText(cell.pts)} points`}
                                                    >
                                                        #{cell.rank}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span
                                                            className={`${styles.cellRank} ${
                                                                RANK_CLASS[
                                                                    cell.rank
                                                                ] ?? ''
                                                            }`}
                                                            title={`${ptsText(cell.pts)} points`}
                                                        >
                                                            #{cell.rank}
                                                            <span
                                                                className={
                                                                    styles.cellField
                                                                }
                                                            >
                                                                {' '}
                                                                of{' '}
                                                                {columns[
                                                                    c
                                                                ].entryCount.toLocaleString()}
                                                            </span>
                                                        </span>
                                                        <span
                                                            className={
                                                                styles.cellMeta
                                                            }
                                                        >
                                                            <span
                                                                className={
                                                                    styles.cellTime
                                                                }
                                                            >
                                                                <DurationToFormatted
                                                                    duration={
                                                                        cell.timeMs
                                                                    }
                                                                    withMillis={
                                                                        false
                                                                    }
                                                                />
                                                            </span>
                                                        </span>
                                                    </>
                                                )
                                            ) : (
                                                <span
                                                    className={
                                                        styles.cellAbsent
                                                    }
                                                    title="No run on this board"
                                                >
                                                    —
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {hiddenCols > 0 && (
                <>
                    <div className={styles.scrollFade} aria-hidden />
                    <button
                        type="button"
                        className={styles.moreColsChip}
                        aria-label={`Scroll to ${hiddenCols} more ${
                            hiddenCols === 1 ? 'category' : 'categories'
                        }`}
                        onClick={() => {
                            const el = scrollerRef.current;
                            el?.scrollBy({
                                left: el.clientWidth * 0.7,
                                behavior: 'smooth',
                            });
                        }}
                    >
                        +{hiddenCols} more →
                    </button>
                </>
            )}
        </div>
    );
}
