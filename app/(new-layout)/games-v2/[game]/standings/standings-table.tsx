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

const ptsText = (pts: number) => Math.round(pts).toLocaleString();

export function StandingsTable({ gameSlug, rows, columns }: Props) {
    return (
        // Wide matrices scroll inside their own container; the page body must
        // never scroll sideways.
        <div className={styles.tableScroll}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.thRank} scope="col">
                            #
                        </th>
                        <th scope="col">Runner</th>
                        <th className={styles.thScore} scope="col">
                            Points
                        </th>
                        {columns.map((category) => (
                            <th
                                key={category.id}
                                className={styles.thCategory}
                                scope="col"
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
                                        IGT
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
                            <tr key={row.runner.name}>
                                <td
                                    className={`${styles.tdRank} ${
                                        RANK_CLASS[position] ?? ''
                                    }`}
                                >
                                    {position}
                                </td>
                                <td className={styles.tdRunner}>
                                    <RunnerAvatar
                                        name={row.runner.name}
                                        picture={row.runner.picture}
                                        size="xs"
                                    />
                                    <span className={styles.runnerName}>
                                        {/* Guests hold real entries but have
                                            no profile to link to. */}
                                        {row.runner.isGuest ? (
                                            row.runner.name
                                        ) : (
                                            <UserLink
                                                username={row.runner.name}
                                            />
                                        )}
                                    </span>
                                    <CountryFlag country={row.runner.country} />
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
                                            <>
                                                <span
                                                    className={`${styles.cellRank} ${
                                                        RANK_CLASS[cell.rank] ??
                                                        ''
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
                                                    className={styles.cellMeta}
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
                                                            withMillis={false}
                                                        />
                                                    </span>
                                                </span>
                                            </>
                                        ) : (
                                            <span
                                                className={styles.cellAbsent}
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
    );
}
