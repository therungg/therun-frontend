import { redirect } from 'next/navigation';
import React from 'react';
import { Homepage } from '~app/(old-layout)/components/homepage';
import { NewLayoutCTA } from '~app/(old-layout)/components/new-layout-cta';
import { getLayoutPreference } from '~src/actions/layout-preference.action';
import { JsonLd } from '~src/components/json-ld';
import { buildWebSiteJsonLd } from '~src/utils/json-ld';
import buildMetadata from '~src/utils/metadata';

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

export default async function Page() {
    const layoutPreference = await getLayoutPreference();

    if (layoutPreference === 'new') {
        redirect('/frontpage');
    }

    return (
        <>
            <JsonLd data={buildWebSiteJsonLd()} />
            <NewLayoutCTA />
            <Homepage />
        </>
    );
}
