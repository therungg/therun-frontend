import { UserLink } from '~src/components/links/links';
import type { GameModerator } from '../../../../../types/board-claims.types';
import styles from './sidebar.module.scss';

const MAX_SHOWN = 8;

/**
 * Who runs this board — the trust signal speedrun.com carries at the foot
 * of every leaderboard. Renders nothing on unmoderated games (the claim
 * CTA covers that state).
 */
export function ModeratorsPanel({
    moderators,
}: {
    moderators: GameModerator[];
}) {
    if (moderators.length === 0) return null;
    const shown = moderators.slice(0, MAX_SHOWN);
    const overflow = moderators.length - shown.length;

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>Moderators</span>
            <ul className="list-unstyled mb-0">
                {shown.map((m) => (
                    <li key={m.assignmentId} className={styles.row}>
                        <span className={styles.rowUser}>
                            <UserLink username={m.username} url={undefined} />
                        </span>
                        {m.role === 'game-admin' && (
                            <span className={styles.rowMeta}>admin</span>
                        )}
                    </li>
                ))}
            </ul>
            {overflow > 0 && (
                <p className={`${styles.rowMeta} mb-0`}>+{overflow} more</p>
            )}
        </section>
    );
}
