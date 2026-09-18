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

            {row.image ? (
                <Image
                    src={row.image}
                    alt=""
                    width={40}
                    height={53}
                    className={styles.art}
                />
            ) : (
                <span className={styles.artFallback} aria-hidden />
            )}

            <Link href={gameHref} className={styles.game}>
                {row.display}
            </Link>

            <span className={styles.runners}>
                {row.uniqueRunners.toLocaleString()}
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
                        <span className={styles.boardTime}>
                            <DurationToFormatted duration={board.timeMs} />
                        </span>
                        <span className={styles.boardUser}>
                            {board.username}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
