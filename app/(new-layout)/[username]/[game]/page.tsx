import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
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
    // The guard used to sit below these reads, so every miss — mostly bots
    // probing for /server/.env and friends, which land here as
    // /{username}/{customUrl} — crashed on `run.game` before reaching it.
    if (!run) notFound();

    // Older records carry `game: null`; displayRun keeps "Game#Category".
    const game = run.game || run.displayRun?.split('#')[0] || '';
    const runName = run.run;

    const globalGameData = await getGameGlobal(game);

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
