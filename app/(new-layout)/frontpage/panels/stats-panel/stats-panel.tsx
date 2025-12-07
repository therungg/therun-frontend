// stats-panel.tsx (Server Component)
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getDateOfFirstUserSummary, getUserSummary } from '~src/lib/summary';
import { StatsContent } from './stats-content'; // Import the new Client Component
import { UserSummaryType } from '~src/types/summary.types';

const DEFAULT_SETTING: UserSummaryType = "month";

export default async function StatsPanel() {
    const session = await getSession();

    const user = session?.user || "Kally";

    // Fetch initial data
    let tries = 0;
    let initialStats = await getUserSummary(user, DEFAULT_SETTING, tries++);

    while (initialStats === undefined && tries < 3) {
        initialStats = await getUserSummary(user, DEFAULT_SETTING, tries++);
    }

    const firstWeek = await getDateOfFirstUserSummary(user, 'week')
    const firstMonth = await getDateOfFirstUserSummary(user, 'month')

    if (!initialStats || !user) return <div>Loading stats...</div>;

    return (
        <Panel
            subtitle="Summary"
            title="Your Performance"
            className="p-3"
            link={{ url: '/' + user, text: 'View All Stats' }}
        >
            <StatsContent
                initialStats={initialStats}
                username={user}
                firstWeek={firstWeek}
                firstMonth={firstMonth}
            />
        </Panel>
    );
}