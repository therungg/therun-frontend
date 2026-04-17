import React from 'react';
import { LoginWithPatreon } from '~app/(new-layout)/change-appearance/login-with-patreon';
import PatreonSection from '~app/(new-layout)/change-appearance/patreon-section';
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

    const isAdmin = session.roles?.includes('admin') ?? false;
    const rawTier = isAdmin ? Number(searchParams.tier) : NaN;
    const tierOverride =
        isAdmin && [0, 1, 2, 3].includes(rawTier)
            ? (rawTier as 0 | 1 | 2 | 3)
            : undefined;

    // Admin previewing non-patron view
    if (tierOverride === 0) {
        return (
            <div>
                <LoginWithPatreon session={session} baseUrl={baseUrl} />
            </div>
        );
    }

    return (
        <div>
            {!userPatreonData ? (
                <LoginWithPatreon session={session} baseUrl={baseUrl} />
            ) : (
                <PatreonSection
                    session={session}
                    userPatreonData={userPatreonData}
                    baseUrl={baseUrl}
                    tierOverride={tierOverride as 1 | 2 | 3 | undefined}
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
