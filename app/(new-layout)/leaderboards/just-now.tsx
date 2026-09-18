import Link from '~src/components/link';
import { getRecentNotablePBs } from '~src/lib/highlights';
import styles from './leaderboards-page.module.scss';

/** The codebase has no relative-time helper — datetime.tsx formats durations
 *  and absolute dates only — so this card carries its own. Coarse on purpose:
 *  the point is recency, not precision. */
function ago(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds) || seconds < 0) return 'just now';
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export async function JustNow() {
    let pbs;
    try {
        pbs = await getRecentNotablePBs(5);
    } catch {
        // The card disappears; the page does not.
        return null;
    }
    if (!pbs || pbs.length === 0) return null;

    return (
        <section className={styles.card}>
            <h2 className={styles.cardTitle}>Just now</h2>
            <ul className={styles.feed}>
                {pbs.map((pb) => (
                    <li key={pb.id} className={styles.feedItem}>
                        <span className={styles.feedLine}>
                            <strong>{pb.username}</strong> set a PB in {pb.game}{' '}
                            &mdash; {pb.category}
                        </span>
                        <span className={styles.feedWhen}>
                            {ago(pb.endedAt)}
                        </span>
                    </li>
                ))}
            </ul>
            <Link href="/live" className={styles.cardLink}>
                Watch live runs &rarr;
            </Link>
        </section>
    );
}
