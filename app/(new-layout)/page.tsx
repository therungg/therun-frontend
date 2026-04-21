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
            <section aria-label="About therun.gg">
                <h1 className="h3 mb-2">
                    Speedrun Statistics, Live Runs & Leaderboards
                </h1>
                <p className="text-muted mb-4">
                    therun.gg is a free speedrun statistics platform. Track live
                    speedruns, compare personal bests, view leaderboards,
                    analyze splits, and race other speedrunners across thousands
                    of games.
                </p>
            </section>
            <FrontPage statsUser={params.statsUser} />
        </>
    );
}
