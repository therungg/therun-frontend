import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { RecentPb } from '../../../../../types/leaderboards.types';
import styles from './sidebar.module.scss';

interface Props {
    pbs: RecentPb[];
}

export function RecentPbsPanel({ pbs }: Props) {
    if (pbs.length === 0) {
        return (
            <section className={styles.panel}>
                <span className={`${styles.eyebrow} d-block mb-2`}>
                    Recent PBs
                </span>
                <p className="text-muted mb-0">No recent PBs.</p>
            </section>
        );
    }

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>Recent PBs</span>
            <ul className="list-unstyled mb-0">
                {pbs.slice(0, 5).map((p) => (
                    <li key={p.id} className={styles.row}>
                        <UserLink username={p.username} url={undefined} />
                        <span className={styles.statValue}>
                            <DurationToFormatted duration={p.time} />{' '}
                            <span className={styles.rowMeta}>{p.category}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
