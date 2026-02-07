// stats-panel.tsx (Server Component)
import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getGameGlobal } from '~src/components/game/get-game';
import { getDateOfFirstUserSummary, getUserSummary } from '~src/lib/summary';
import { UserSummaryType } from '~src/types/summary.types';
import { StatsContentWithSearch } from './stats-content-with-search';
import { StatsSearch } from './stats-search';

const DEFAULT_SETTING: UserSummaryType = 'month';

export default async function StatsPanel() {
    const session = await getSession();

    // If no session, show search interface
    if (!session?.user) {
        return (
            <Panel subtitle="Summary" title="Your Performance" className="p-4">
                <StatsSearch />
            </Panel>
        );
    }

    const user = session.user;

    // Fetch all data in parallel
    const [initialStats, firstWeek, firstMonth] = await Promise.all([
        getUserSummary(user, DEFAULT_SETTING, 0),
        getDateOfFirstUserSummary(user, 'week'),
        getDateOfFirstUserSummary(user, 'month'),
    ]);

    if (!initialStats || !user) return <div>Loading stats...</div>;

    // Pre-fetch game data for finished runs on the server
    const uniqueGames = [
        ...new Set(initialStats.finishedRuns.map((r) => r.game)),
    ];
    const gameDataArray = await Promise.all(
        uniqueGames.map((game) => getGameGlobal(game)),
    );
    const initialGameDataMap = Object.fromEntries(
        uniqueGames.map((game, i) => [game, gameDataArray[i]]),
    );

    return (
        <Panel
            subtitle="Summary"
            title="Your Performance"
            className="p-4"
            link={{ url: '/' + user, text: 'View All Stats' }}
        >
            <StatsContentWithSearch
                initialStats={initialStats}
                loggedInUser={user}
                firstWeek={firstWeek}
                firstMonth={firstMonth}
                initialGameDataMap={initialGameDataMap}
            />
        </Panel>
    );
}
