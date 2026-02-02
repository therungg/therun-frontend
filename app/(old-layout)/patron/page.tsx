import React from 'react';
import { PatreonInfo } from '~app/(old-layout)/patron/patreon-info';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';

export default async function PatronPage() {
    const session = await getSession();
    return <PatreonInfo session={session} />;
}

export const metadata = buildMetadata({
    title: 'Support',
    description:
        'Like The Run and find it useful? Consider supporting it today by becoming a Patron and get some visual perks for doing so!',
});
