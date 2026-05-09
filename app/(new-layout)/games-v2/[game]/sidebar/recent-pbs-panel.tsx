import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { RecentPb } from '../../../../../types/leaderboards.types';

interface Props {
    pbs: RecentPb[];
}

export function RecentPbsPanel({ pbs }: Props) {
    if (pbs.length === 0) {
        return (
            <section className="border rounded p-3 mb-3">
                <small className="text-muted d-block mb-2">Recent PBs</small>
                <p className="text-muted mb-0">No recent PBs.</p>
            </section>
        );
    }

    return (
        <section className="border rounded p-3 mb-3">
            <small className="text-muted d-block mb-2">Recent PBs</small>
            <ul className="list-unstyled mb-0">
                {pbs.slice(0, 5).map((p) => (
                    <li
                        key={p.id}
                        className="d-flex justify-content-between align-items-baseline"
                    >
                        <UserLink username={p.username} url={undefined} />
                        <span>
                            <DurationToFormatted duration={p.time} />{' '}
                            <small className="text-muted">{p.category}</small>
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}
