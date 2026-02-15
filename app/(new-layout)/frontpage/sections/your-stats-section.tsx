import { Panel } from '~app/(new-layout)/components/panel.component';
import { getSession } from '~src/actions/session.action';
import { getGameGlobal } from '~src/components/game/get-game';
import { getUserSummary } from '~src/lib/summary';
import { YourStatsClient } from './your-stats-client';
import { YourStatsSearch } from './your-stats-search';

export const YourStatsSection = async () => {
    const session = await getSession();

    if (!session?.user) {
        return (
            <Panel subtitle="Summary" title="Runner Stats" className="p-4">
                <p className="text-secondary mb-3">
                    Look up any runner&apos;s weekly stats
                </p>
                <YourStatsSearch />
            </Panel>
        );
    }

    const user = session.user;
    const [weekStats, monthStats] = await Promise.all([
        getUserSummary(user, 'week', 0),
        getUserSummary(user, 'month', 0),
    ]);

    // Pre-fetch game data for finished runs
    const allGames = new Set([
        ...(weekStats?.finishedRuns ?? []).map((r) => r.game),
        ...(monthStats?.finishedRuns ?? []).map((r) => r.game),
    ]);
    const gameDataArray = await Promise.all(
        [...allGames].map((game) => getGameGlobal(game)),
    );
    const gameDataMap = Object.fromEntries(
        [...allGames].map((game, i) => [game, gameDataArray[i]]),
    );

    return (
        <Panel
            subtitle="Summary"
            title="Your Performance"
            className="p-4"
            link={{ url: `/${user}`, text: 'View Full Stats' }}
        >
            <YourStatsClient
                weekStats={weekStats}
                monthStats={monthStats}
                gameDataMap={gameDataMap}
            />
        </Panel>
    );
};
