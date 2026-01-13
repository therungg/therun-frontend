import { Panel } from '~app/(new-layout)/components/panel.component';
import { getGameGlobal } from '~src/components/game/get-game';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getPersonalBestRuns } from '~src/lib/get-personal-best-runs';
import { LatestPbView } from './latest-pbs-view';

export const LatestPbsPanel = async () => {
    const runs = await getPersonalBestRuns();

    // Pre-fetch game and user data server-side
    const uniqueGames = [...new Set(runs.map((r) => r.game))];
    const uniqueUsers = [...new Set(runs.map((r) => r.user))];

    const [gameDataArray, userDataArray] = await Promise.all([
        Promise.all(uniqueGames.map((game) => getGameGlobal(game))),
        Promise.all(uniqueUsers.map((user) => getGlobalUser(user))),
    ]);

    const gameDataMap = Object.fromEntries(
        uniqueGames.map((game, i) => [game, gameDataArray[i]]),
    );
    const userDataMap = Object.fromEntries(
        uniqueUsers.map((user, i) => [user, userDataArray[i]]),
    );

    return (
        <Panel
            subtitle="Recent PB's from the community"
            title="Personal Bests"
            className="p-0"
        >
            <LatestPbView
                runs={runs}
                gameDataMap={gameDataMap}
                userDataMap={userDataMap}
            />
        </Panel>
    );
};
