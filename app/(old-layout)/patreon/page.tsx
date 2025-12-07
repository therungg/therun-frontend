import React from 'react';
import PatronPage from '~app/(old-layout)/patron/page';
import buildMetadata from '~src/utils/metadata';

export default async function PatreonPage() {
    return <PatronPage />;
}

export const metadata = buildMetadata({
    title: 'Support',
    description:
        'Like The Run and find it useful? Consider supporting it today by becoming a Patron and get some visual perks for doing so!',
});
