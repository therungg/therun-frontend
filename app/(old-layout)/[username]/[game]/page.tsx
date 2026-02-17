import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import RunDetail from '~app/(old-layout)/[username]/[game]/[run]/run';
import { getGameGlobal } from '~src/components/game/get-game';
import { JsonLd } from '~src/components/json-ld';
import { getRunByCustomUrl } from '~src/lib/get-run';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { buildRunProfileJsonLd, formatMillis } from '~src/utils/json-ld';
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
        <>
            <JsonLd
                data={buildRunProfileJsonLd({
                    username,
                    game,
                    category: runName,
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
            />
        </>
    );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
    const params = await props.params;
    const username: string = params.username as string;
    const customUrl: string = params.game as string;

    if (!username || !customUrl) return buildMetadata();

    const [run, images] = await Promise.all([
        getRunByCustomUrl(username, customUrl),
        getUserProfilePhoto(username),
    ]);

    const gameAndCategory = `${run.game} - ${run.run}`;

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
