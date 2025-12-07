import React from 'react';
import { LoginWithPatreon } from '~app/(old-layout)/change-appearance/login-with-patreon';
import PatreonSection from '~app/(old-layout)/change-appearance/patreon-section';
import { getBaseUrl } from '~src/actions/base-url.action';
import { getSession } from '~src/actions/session.action';
import { getUserPatreonData } from '~src/actions/user-patreon-data.action';
import buildMetadata from '~src/utils/metadata';

export default async function ChangeAppearance(props: {
    searchParams: Promise<{ [_: string]: string }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getSession();
    const userPatreonData = await getUserPatreonData(searchParams);
    const baseUrl = await getBaseUrl();

    return (
        <div>
            {!userPatreonData ? (
                <LoginWithPatreon session={session} baseUrl={baseUrl} />
            ) : (
                <PatreonSection
                    session={session}
                    userPatreonData={userPatreonData}
                />
            )}
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Change Appearance',
    description:
        'Change your appearance on The Run. Thanks for being a supporter!',
    index: false,
});
