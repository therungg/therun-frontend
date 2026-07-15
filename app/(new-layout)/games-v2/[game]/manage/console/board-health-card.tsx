import {
    DashLg,
    ExclamationTriangleFill,
    XOctagonFill,
} from 'react-bootstrap-icons';
import Link from '~src/components/link';
import type { BoardHealth } from '~src/lib/setup/health';
import styles from './console.module.scss';

const GRADE_LABEL = {
    healthy: 'Healthy',
    'needs-attention': 'Needs attention',
    'at-risk': 'At risk',
} as const;

const GRADE_CLASS = {
    healthy: styles.sevPillLow,
    'needs-attention': styles.sevPillMedium,
    'at-risk': styles.sevPillHigh,
} as const;

interface Props {
    gameSlug: string;
    health: BoardHealth;
}

export function BoardHealthCard({ gameSlug, health }: Props) {
    return (
        <div className={styles.inlineCard}>
            <span className={`${styles.pill} ${GRADE_CLASS[health.grade]}`}>
                Board health: {GRADE_LABEL[health.grade]}
            </span>
            <div>
                {health.items.map((item) => (
                    <div
                        key={`${item.pane ?? 'none'}-${item.label}`}
                        className={styles.healthRow}
                    >
                        {item.severity === 'blocker' ? (
                            <XOctagonFill
                                size={12}
                                className={styles.healthIconBlocker}
                                aria-hidden
                            />
                        ) : item.severity === 'warning' ? (
                            <ExclamationTriangleFill
                                size={12}
                                className={styles.healthIconWarning}
                                aria-hidden
                            />
                        ) : (
                            <DashLg
                                size={12}
                                className={styles.healthIconInfo}
                                aria-hidden
                            />
                        )}
                        {item.pane ? (
                            <Link
                                href={`/games-v2/${gameSlug}/manage?pane=${item.pane}`}
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
