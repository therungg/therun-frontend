import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    LeaderboardResponse,
    ResolvedCategory,
} from '../../../../../types/leaderboards.types';

interface Props {
    rt: LeaderboardResponse;
    gt: LeaderboardResponse;
    category: ResolvedCategory;
}

export function WrCard({ rt, gt, category }: Props) {
    const primary = category.primaryTiming === 'gt' ? gt : rt;
    const top = primary.entries[0];
    if (!top || top.time === null) return null;

    return (
        <section className="border rounded p-3 mb-3">
            <small className="text-muted d-block">World Record</small>
            <div className="fs-4 fw-bold">
                <DurationToFormatted duration={top.time} />
            </div>
            <div>
                <UserLink username={top.runnerName} url={undefined} />
            </div>
            {top.runDate && (
                <small className="text-muted">
                    Set {new Date(top.runDate).toLocaleDateString()}
                </small>
            )}
            {top.vodUrl && (
                <div className="mt-2">
                    <a href={top.vodUrl} target="_blank" rel="noreferrer">
                        Watch VOD
                    </a>
                </div>
            )}
        </section>
    );
}
