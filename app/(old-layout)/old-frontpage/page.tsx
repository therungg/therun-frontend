import React from 'react';
import { Homepage } from '~app/(old-layout)/components/homepage';
import buildMetadata from '~src/utils/metadata';

export const metadata = buildMetadata({
    title: 'Classic Homepage',
});

export default function Page() {
    return <Homepage />;
}
