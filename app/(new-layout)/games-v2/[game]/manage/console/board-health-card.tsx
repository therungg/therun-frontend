import {
    DashLg,
    ExclamationTriangleFill,
    XOctagonFill,
} from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { BoardHealth } from '~src/lib/setup/health';
import styles from './board-health-card.module.scss';

const GRADE_LABEL = {
    healthy: 'Healthy',
    'needs-attention': 'Needs attention',
    'at-risk': 'At risk',
} as const;

interface Props {
    gameSlug: string;
    health: BoardHealth;
    /** Layout hook for the overview rail (zeroes the above-pane margin). */
    className?: string;
}

export function BoardHealthCard({ gameSlug, health, className }: Props) {
    return (
        <div className={`${styles.card} ${className ?? ''}`}>
            <div className={styles.head}>
                <h3 className={styles.eyebrow}>Board health</h3>
                <span className={styles.grade} data-grade={health.grade}>
                    {GRADE_LABEL[health.grade]}
                </span>
            </div>
            <div className={styles.list}>
                {health.items.map((item) => (
                    <div
                        key={`${item.pane ?? 'none'}-${item.label}`}
                        className={styles.row}
                    >
                        {item.severity === 'blocker' ? (
                            <XOctagonFill
                                size={12}
                                className={styles.iconBlocker}
                                aria-hidden
                            />
                        ) : item.severity === 'warning' ? (
                            <ExclamationTriangleFill
                                size={12}
                                className={styles.iconWarning}
                                aria-hidden
                            />
                        ) : (
                            <DashLg
                                size={12}
                                className={styles.iconInfo}
                                aria-hidden
                            />
                        )}
                        {item.pane ? (
                            <Link
                                href={`/games-v2/${encodeURIComponent(gameSlug)}/manage?pane=${item.pane}`}
                            >
                                {item.label}
                            </Link>
                        ) : (
                            item.label
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
