import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getTwitchOAuthURL } from '~src/components/twitch/twitch-oauth';
import { getUserSummary } from '~src/lib/summary';
import { getUserDashboard } from '~src/lib/user-dashboard';
import type {
    DashboardRace,
    DashboardResponse,
} from '~src/types/dashboard.types';
import styles from './your-stats.module.scss';
import { YourStatsClient } from './your-stats-client';

export const YourStatsSection = async ({
    statsUser,
}: {
    statsUser?: string;
}) => {
    const session = await getSession();

    if (!session?.user) {
        const loginUrl = getTwitchOAuthURL({ redirect: '/api' });

        return (
            <Panel
                panelId="your-stats"
                subtitle="Summary"
                title="Your Performance"
                className="p-0 overflow-hidden"
            >
                <div className={styles.loggedOutCta}>
                    <div className={styles.loggedOutText}>
                        Track your PBs, streaks, and top games
                    </div>
                    <a href={loginUrl.href} className={styles.twitchButton}>
                        <svg
                            viewBox="0 0 24 24"
                            width={16}
                            height={16}
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                        </svg>
                        Log in with Twitch
                    </a>
                </div>
            </Panel>
        );
    }

    // Admin impersonation: ?statsUser=username
    const isAdmin = session.roles?.includes('admin') ?? false;
    const impersonating = isAdmin && statsUser && statsUser !== session.user;
    const user = impersonating ? statsUser : session.user;

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
        gameImage: null,
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
            title={impersonating ? `${user}'s Stats` : 'Your Performance'}
            className="p-0 overflow-hidden"
            link={{ url: `/${user}`, text: 'View Full Stats' }}
        >
            <YourStatsClient dashboards={dashboards} username={user} />
        </Panel>
    );
};
