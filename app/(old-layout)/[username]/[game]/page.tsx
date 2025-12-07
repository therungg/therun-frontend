import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import RunDetail from '~app/(old-layout)/[username]/[game]/[run]/run';
import { getGameGlobal } from '~src/components/game/get-game';
import { getRunByCustomUrl } from '~src/lib/get-run';
import { getLiveRunForUser } from '~src/lib/live-runs';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';

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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username: string = params.username as string;
    const customUrl: string = params.game as string;

    if (!username || !customUrl) return buildMetadata();

    const run = await getRunByCustomUrl(username, customUrl);
    const game = run.game;
    const runName = run.run;

    const gameAndCategory = `${game} - ${runName}`;

    return buildMetadata({
        title: username,
        description: `${username} runs ${gameAndCategory}. Check out all their attempts, personal best, and more on The Run!`,
        images: await getUserProfilePhoto(username),
    });
}
