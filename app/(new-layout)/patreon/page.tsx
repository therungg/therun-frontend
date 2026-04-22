import React from 'react';
import PatronPage from '~app/(new-layout)/patron/page';
import buildMetadata from '~src/utils/metadata';

export default async function PatreonPage() {
    return <PatronPage />;
}

export const metadata = buildMetadata({
    title: 'Support therun.gg',
    description:
        'Support therun.gg to unlock cloud backups of every splits upload, unlimited LiveSplit layouts, custom name styling, Discord access, and more — while keeping the site free, ad-free, and independent for everyone.',
});
