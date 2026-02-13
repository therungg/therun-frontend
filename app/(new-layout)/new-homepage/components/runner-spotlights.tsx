import { Panel } from '~app/(new-layout)/components/panel.component';
import { UserLink } from '~src/components/links/links';
import { getMostPBsRunners, getWeeklyTopRunners } from '~src/lib/highlights';

function formatHours(msString: string): string {
    const ms = parseInt(msString);
    const hours = ms / 1000 / 3600;
    if (hours >= 100) return `${Math.round(hours)}h`;
    return `${hours.toFixed(1)}h`;
}

export async function RunnerSpotlights() {
    const [byTime, byPBs] = await Promise.all([
        getWeeklyTopRunners(5),
        getMostPBsRunners(5),
    ]);

    return (
        <Panel
            subtitle="This week's grinders"
            title="Dedicated Runners"
            className="p-3"
        >
            {/* Most time */}
            <div className="mb-3">
                <h6
                    className="text-muted text-uppercase mb-2"
                    style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}
                >
                    Most Time Spent
                </h6>
                <div className="d-flex flex-column gap-1">
                    {byTime.map((runner, i) => (
                        <div
                            key={runner.username}
                            className="d-flex align-items-center justify-content-between py-1"
                        >
                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className="fw-bold text-muted font-monospace"
                                    style={{
                                        width: '1rem',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {i + 1}
                                </span>
                                <UserLink username={runner.username}>
                                    <span
                                        className="fw-semibold"
                                        style={{ color: 'var(--bs-primary)' }}
                                    >
                                        {runner.username}
                                    </span>
                                </UserLink>
                            </div>
                            <span
                                className="fw-bold font-monospace"
                                style={{ fontSize: '0.85rem' }}
                            >
                                {formatHours(runner.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Most PBs */}
            <div>
                <h6
                    className="text-muted text-uppercase mb-2"
                    style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}
                >
                    Most PBs Set
                </h6>
                <div className="d-flex flex-column gap-1">
                    {byPBs.map((runner, i) => (
                        <div
                            key={runner.username}
                            className="d-flex align-items-center justify-content-between py-1"
                        >
                            <div className="d-flex align-items-center gap-2">
                                <span
                                    className="fw-bold text-muted font-monospace"
                                    style={{
                                        width: '1rem',
                                        fontSize: '0.8rem',
                                    }}
                                >
                                    {i + 1}
                                </span>
                                <UserLink username={runner.username}>
                                    <span
                                        className="fw-semibold"
                                        style={{ color: 'var(--bs-primary)' }}
                                    >
                                        {runner.username}
                                    </span>
                                </UserLink>
                            </div>
                            <span
                                className="fw-bold font-monospace"
                                style={{ fontSize: '0.85rem' }}
                            >
                                {parseInt(runner.value).toLocaleString()} PBs
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Panel>
    );
}
