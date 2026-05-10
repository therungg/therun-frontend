import { DurationToFormatted } from '~src/components/util/datetime';
import type { QuickStats } from '../../../../../types/leaderboards.types';

interface Props {
    stats: QuickStats;
}

export function QuickStatsPanel({ stats }: Props) {
    return (
        <section className="border rounded p-3 mb-3">
            <small className="text-muted d-block mb-2">Quick stats</small>
            <dl className="row mb-0 small">
                <dt className="col-7">Runners</dt>
                <dd className="col-5 text-end">
                    {stats.uniqueRunners.toLocaleString()}
                </dd>
                <dt className="col-7">Total run time</dt>
                <dd className="col-5 text-end">
                    <DurationToFormatted duration={stats.totalRunTime} />
                </dd>
                <dt className="col-7">Total attempts</dt>
                <dd className="col-5 text-end">
                    {stats.totalAttemptCount.toLocaleString()}
                </dd>
                <dt className="col-7">Finished attempts</dt>
                <dd className="col-5 text-end">
                    {stats.totalFinishedAttemptCount.toLocaleString()}
                </dd>
            </dl>
        </section>
    );
}
