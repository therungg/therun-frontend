import { JsonLd } from '~src/components/json-ld';
import { buildWebSiteJsonLd } from '~src/utils/json-ld';
import buildMetadata from '~src/utils/metadata';
import FrontPage from './frontpage/frontpage';

export const metadata = buildMetadata({
    title: 'Free Speedrun Statistics & Live Run Tracker',
    description:
        'Free speedrun statistics for every runner. Track live runs, view leaderboards, analyze personal bests, and race other speedrunners — all on therun.gg.',
    keywords: [
        'TheRun',
        'speedrun',
        'statistics',
        'speedrun tracker',
        'live speedruns',
        'speedrun leaderboards',
        'personal best',
        'speedrun races',
    ],
});

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ statsUser?: string }>;
}) {
    const params = await searchParams;

    return (
        <>
            <JsonLd data={buildWebSiteJsonLd()} />
            <FrontPage statsUser={params.statsUser} />
        </>
    );
}
