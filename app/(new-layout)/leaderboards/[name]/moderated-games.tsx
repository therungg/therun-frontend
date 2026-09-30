import { GameImage } from '~src/components/image/gameimage';
import Link from '~src/components/link';
import type { LeaderboardsProfile } from '../../../../types/leaderboards-profile.types';
import { profileGameHref } from './format';
import styles from './leaderboards-profile.module.scss';

/** Past this many games the list scrolls instead of stretching the column. */
const SCROLL_AFTER = 8;

/** Sidebar card: the games the runner moderates, each with its cover. */
export function ModeratedGames({
    moderates,
    boardsVisible,
}: {
    moderates: LeaderboardsProfile['runner']['moderates'];
    boardsVisible: boolean;
}) {
    if (moderates.length === 0) return null;
    const list = (
        <div className={styles.shelf}>
            {moderates.map((m) => (
                <Link
                    key={m.gameId}
                    href={profileGameHref(m, boardsVisible)}
                    className={`${styles.shelfTile} ${styles.modTile}`}
                >
                    <span className={`${styles.shelfArt} ${styles.modArt}`}>
                        <GameImage
                            src={m.image ?? ''}
                            alt=""
                            quality="small"
                            width={36}
                            height={48}
                        />
                    </span>
                    <span className={styles.gameListName}>{m.game}</span>
                </Link>
            ))}
        </div>
    );
    return (
        <section className={styles.card} aria-labelledby="profile-moderates">
            <h2 id="profile-moderates" className={styles.cardTitle}>
                Moderates
            </h2>
            {moderates.length > SCROLL_AFTER ? (
                <div className={styles.shelfScroll}>{list}</div>
            ) : (
                list
            )}
        </section>
    );
}
