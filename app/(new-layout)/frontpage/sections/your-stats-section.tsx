import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getUserSummary } from '~src/lib/summary';
import { getUserDashboard } from '~src/lib/user-dashboard';
import type {
    DashboardRace,
    DashboardResponse,
} from '~src/types/dashboard.types';
import { YourStatsClient } from './your-stats-client';
import { YourStatsSearch } from './your-stats-search';

export const YourStatsSection = async () => {
    const session = await getSession();

    if (!session?.user) {
        return (
            <Panel
                panelId="your-stats"
                subtitle="Summary"
                title="Runner Stats"
                className="p-4"
            >
                <p className="text-secondary mb-3">
                    Look up any runner&apos;s weekly stats
                </p>
                <YourStatsSearch />
            </Panel>
        );
    }

    const user = session.user;
    const [dashboard7d, dashboard30d, dashboardYear, weekSummary] =
        await Promise.all([
            getUserDashboard(user, '7d'),
            getUserDashboard(user, '30d'),
            getUserDashboard(user, 'year'),
            getUserSummary(user, 'week', 0),
        ]);

    const raceData: DashboardRace[] = (weekSummary?.races ?? []).map((r) => ({
        game: r.game,
        category: r.category,
        position: r.position,
        ratingBefore: r.ratingPrevious,
        ratingAfter: r.ratingNew,
        date: r.date,
    }));

    const dashboards: Record<string, DashboardResponse | null> = {
        '7d': dashboard7d ? { ...dashboard7d, recentRaces: raceData } : null,
        '30d': dashboard30d,
        year: dashboardYear,
    };

    return (
        <Panel
            panelId="your-stats"
            subtitle="Summary"
            title="Your Performance"
            className="p-0 overflow-hidden"
            link={{ url: `/${user}`, text: 'View Full Stats' }}
        >
            <YourStatsClient dashboards={dashboards} username={user} />
        </Panel>
    );
};
