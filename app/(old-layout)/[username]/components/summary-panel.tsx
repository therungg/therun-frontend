'use client';

import { useEffect, useState, useTransition } from 'react';
import { Panel } from '~app/(new-layout)/components/panel.component';
import { fetchStatsAction } from '~app/(new-layout)/frontpage/panels/stats-panel/get-stats.action';
import { StatsContent } from '~app/(new-layout)/frontpage/panels/stats-panel/stats-content';
import { UserSummary } from '~src/types/summary.types';

interface SummaryPanelProps {
    username: string;
}

export const SummaryPanel = ({ username }: SummaryPanelProps) => {
    const [stats, setStats] = useState<UserSummary | null>(null);
    const [_isLoading, startTransition] = useTransition();
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        startTransition(async () => {
            const result = await fetchStatsAction(username, 'month', 0);
            if (result) {
                setStats(result);
            }
            setHasLoaded(true);
        });
    }, [username]);

    if (!hasLoaded) {
        return (
            <Panel subtitle="Summary" title="Performance">
                <div
                    className="d-flex justify-content-center align-items-center"
                    style={{ minHeight: '200px', opacity: 0.5 }}
                >
                    Loading summary...
                </div>
            </Panel>
        );
    }

    if (!stats) {
        return (
            <Panel subtitle="Summary" title="Performance">
                <div
                    className="d-flex justify-content-center align-items-center text-muted"
                    style={{ minHeight: '100px' }}
                >
                    No summary data available yet.
                </div>
            </Panel>
        );
    }

    return (
        <Panel subtitle="Summary" title="Performance">
            <div className="p-3">
                <StatsContent
                    initialStats={stats}
                    username={username}
                    firstWeek={undefined}
                    firstMonth={undefined}
                    initialGameDataMap={{}}
                />
            </div>
        </Panel>
    );
};
