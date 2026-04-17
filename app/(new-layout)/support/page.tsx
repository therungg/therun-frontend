import React from 'react';
import PatronPage from '~app/(new-layout)/patron/page';
import buildMetadata from '~src/utils/metadata';

export default async function SupportPage() {
    return <PatronPage />;
}

export const metadata = buildMetadata({
    title: 'Support',
    description:
        'Like The Run and find it useful? Consider supporting it today and get some visual perks for doing so!',
});
