import Image from 'next/image';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { safeEncodeURI } from '~src/utils/uri';
import type { LeaderboardRow } from '../../../types/leaderboards-page.types';
import styles from './leaderboards-page.module.scss';

export function BoardRow({ row, rank }: { row: LeaderboardRow; rank: number }) {
    const gameHref = `/games/${safeEncodeURI(row.game)}`;

    return (
        <div className={styles.row}>
            <span className={styles.rank}>{rank}</span>

            <Link href={gameHref} className={styles.artLink}>
                {row.image ? (
                    <Image
                        src={row.image}
                        alt=""
                        width={48}
                        height={64}
                        className={styles.art}
                    />
                ) : (
                    <span className={styles.artFallback} aria-hidden />
                )}
            </Link>

            <div className={styles.identity}>
                <Link href={gameHref} className={styles.game}>
                    {row.display}
                </Link>
                <span className={styles.runnersInline}>
                    {row.uniqueRunners.toLocaleString()} runners
                </span>
            </div>

            <span className={styles.runners}>
                <span className={styles.runnersValue}>
                    {row.uniqueRunners.toLocaleString()}
                </span>
                <span className={styles.runnersLabel}>runners</span>
            </span>

            <div className={styles.boards}>
                {row.boards.map((board) => (
                    <Link
                        key={board.categoryId}
                        href={`${gameHref}?board=${safeEncodeURI(board.display)}`}
                        className={styles.board}
                    >
                        <span className={styles.boardName}>
                            {board.display}
                        </span>
                        {board.timeMs != null && board.username != null ? (
                            <>
                                <span className={styles.boardTime}>
                                    {/* human={false}: the default switches
                                        past ten hours to "10h 52m", which
                                        breaks a column of clock times. */}
                                    <DurationToFormatted
                                        duration={board.timeMs}
                                        human={false}
                                    />
                                </span>
                                <span className={styles.boardUser}>
                                    {board.username}
                                </span>
                            </>
                        ) : (
                            <span className={styles.boardUser}>
                                No record yet
                            </span>
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
