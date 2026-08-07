import type { Race } from '~app/(new-layout)/races/races.types';
import Link from '~src/components/link';
import styles from './sidebar.module.scss';

const MAX_SHOWN = 3;

const STATUS_LABEL: Record<string, string> = {
    pending: 'open entry',
    starting: 'starting',
    progress: 'in progress',
};

/**
 * Races happening right now for this game — the same "live" energy as the
 * panel above it, fetched server-side with the page (no polling; a race's
 * own page is the live surface). Renders nothing when the game has no
 * active races, which is almost always.
 */
export function ActiveRacesPanel({ races }: { races: Race[] }) {
    const visible = races.filter((r) => !r.isTestRace && r.visible !== false);
    if (visible.length === 0) return null;
    const shown = visible.slice(0, MAX_SHOWN);
    const overflow = visible.length - shown.length;

    return (
        <section className={styles.panel}>
            <div className={styles.panelHead}>
                <span className={`${styles.eyebrow} ${styles.eyebrowLive}`}>
                    <span className={styles.liveDot} aria-hidden />
                    Races
                </span>
            </div>
            <ul className="list-unstyled mb-0">
                {shown.map((r) => (
                    <li key={r.raceId} className={styles.pbRow}>
                        <div className={styles.pbTop}>
                            <Link
                                href={`/races/${r.raceId}`}
                                className="text-decoration-none"
                            >
                                {r.customName?.trim() ||
                                    r.displayCategory ||
                                    r.category}
                            </Link>
                            <span className={styles.rowMeta}>
                                {r.participantCount}{' '}
                                {r.participantCount === 1 ? 'racer' : 'racers'}
                            </span>
                        </div>
                        <div className={styles.pbMetaFlush}>
                            {STATUS_LABEL[r.status] ?? r.status}
                        </div>
                    </li>
                ))}
            </ul>
            {overflow > 0 && (
                <p className={`${styles.rowMeta} mb-0`}>+{overflow} more</p>
            )}
        </section>
    );
}
