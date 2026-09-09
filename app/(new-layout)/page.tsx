import { Suspense } from 'react';
import { JsonLd } from '~src/components/json-ld';
import { buildWebSiteJsonLd } from '~src/utils/json-ld';
import buildMetadata from '~src/utils/metadata';
import { SectionSkeleton } from './frontpage/components/section-skeleton';
import FrontPage from './frontpage/frontpage';

export const metadata = buildMetadata({
    title: 'Speedrun Statistics, Live Runs & Leaderboards',
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

export default function Page({
    searchParams,
}: {
    searchParams: Promise<{ statsUser?: string }>;
}) {
    return (
        <>
            <JsonLd data={buildWebSiteJsonLd()} />
            <Suspense
                fallback={
                    <div className="d-flex flex-column gap-4">
                        <SectionSkeleton height={340} />
                        <SectionSkeleton height={250} />
                        <SectionSkeleton height={500} />
                    </div>
                }
            >
                <FrontPage searchParams={searchParams} />
            </Suspense>
        </>
    );
}
