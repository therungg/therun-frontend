import React from 'react';
import { PatreonInfo } from '~app/(new-layout)/patron/patreon-info';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';

export default async function PatronPage() {
    const session = await getSession();
    return <PatreonInfo session={session} />;
}

export const metadata = buildMetadata({
    title: 'Support therun.gg',
    description:
        'Support therun.gg to unlock cloud backups of every splits upload, unlimited LiveSplit layouts, custom name styling, Discord access, and more — while keeping the site free, ad-free, and independent for everyone.',
});
