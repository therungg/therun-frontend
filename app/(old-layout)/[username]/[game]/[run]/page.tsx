import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import RunDetail from '~app/(old-layout)/[username]/[game]/[run]/run';
import { getGameGlobal } from '~src/components/game/get-game';
import { JsonLd } from '~src/components/json-ld';
import { getRun } from '~src/lib/get-run';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { buildRunProfileJsonLd, formatMillis } from '~src/utils/json-ld';
import buildMetadata, { getUserProfilePhoto } from '~src/utils/metadata';
import { safeDecodeURI } from '~src/utils/uri';

interface PageProps {
    params: Promise<{ username: string; game: string; run: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

export default async function RunPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    if (!params || !params.username || !params.game || !params.run)
        throw new Error('Params not found');

    const username: string = params.username as string;
    const game: string = params.game as string;
    const runName: string = params.run as string;

    const promises = [getRun(username, game, runName), getGameGlobal(game)];

    const [run, globalGameData] = await Promise.all(promises);

    if (!run) throw new Error('Could not find run');

    const liveData = await getLiveRunForUser(username);

    const decodedGame = safeDecodeURI(game);
    const decodedRun = safeDecodeURI(runName);

    return (
        <>
            <JsonLd
                data={buildRunProfileJsonLd({
                    username,
                    game: decodedGame,
                    category: decodedRun,
                    personalBest: run.personalBest,
                    sumOfBests: run.sumOfBests,
                    attemptCount: run.attemptCount,
                    finishedAttemptCount: run.finishedAttemptCount,
                    totalRunTime: run.totalRunTime,
                })}
            />
            <RunDetail
                run={run}
                username={username}
                game={game}
                runName={runName}
                globalGameData={globalGameData}
                liveData={liveData}
                tab={searchParams.tab}
            />
        </>
    );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username = params.username;

    if (!username) return buildMetadata();

    const game = safeDecodeURI(params.game);
    const category = safeDecodeURI(params.run);
    const gameAndCategory = `${game} - ${category}`;

    const [run, images] = await Promise.all([
        getRun(username, params.game, params.run),
        getUserProfilePhoto(username),
    ]);

    const descParts = [`${username}'s ${gameAndCategory} speedrun stats`];
    const pb = formatMillis(run?.personalBest);
    if (pb) descParts.push(`PB: ${pb}`);
    if (run?.attemptCount) descParts.push(`${run.attemptCount} attempts`);
    const sob = formatMillis(run?.sumOfBests);
    if (sob) descParts.push(`Sum of best: ${sob}`);

    return buildMetadata({
        title: `${username}: ${gameAndCategory}`,
        description: descParts.join(' | '),
        images,
    });
}
