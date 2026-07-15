import Link from '~src/components/link';
import type { BoardHealth } from '~src/lib/setup/health';

const GRADE_LABEL = {
    healthy: 'Healthy',
    'needs-attention': 'Needs attention',
    'at-risk': 'At risk',
} as const;

const GRADE_CLASS = {
    healthy: 'bg-success',
    'needs-attention': 'bg-warning text-dark',
    'at-risk': 'bg-danger',
} as const;

interface Props {
    gameSlug: string;
    health: BoardHealth;
}

export function BoardHealthCard({ gameSlug, health }: Props) {
    return (
        <div className="card mb-3">
            <div className="card-body d-flex align-items-start gap-3 flex-wrap">
                <span className={`badge ${GRADE_CLASS[health.grade]}`}>
                    Board health: {GRADE_LABEL[health.grade]}
                </span>
                <ul className="list-unstyled mb-0 small">
                    {health.items.map((item) => (
                        <li key={item.label}>
                            {item.severity === 'blocker'
                                ? '✕ '
                                : item.severity === 'warning'
                                  ? '! '
                                  : '· '}
                            {item.pane ? (
                                <Link
                                    href={`/games-v2/${gameSlug}/manage?pane=${item.pane}`}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                item.label
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
