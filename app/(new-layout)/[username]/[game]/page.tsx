import { cacheLife } from 'next/cache';
import RunDetail from '~app/(new-layout)/[username]/[game]/[run]/run';
import { getGameGlobal } from '~src/components/game/get-game';
import { getRunByCustomUrl } from '~src/lib/get-run';
import { getLiveRunForUser } from '~src/lib/live-runs';

interface PageProps {
    params: Promise<{ username: string; game: string }>;
}

export default async function CustomRunPage(props: PageProps) {
    'use cache';
    cacheLife('hours');

    const params = await props.params;
    const username: string = params.username as string;
    const customUrl: string = params.game as string;

    const run = await getRunByCustomUrl(username, customUrl);
    const game = run.game;
    const runName = run.run;

    const globalGameData = await getGameGlobal(run.game);

    if (!run) throw new Error('Could not find run');

    const liveData = await getLiveRunForUser(username);

    return (
        <RunDetail
            run={run}
            username={username}
            game={game}
            runName={runName}
            globalGameData={globalGameData}
            liveData={liveData}
        />
    );
}
