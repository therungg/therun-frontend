import React from "react";
import { getSession } from "~src/actions/session.action";
import { getUserPatreonData } from "~src/actions/user-patreon-data.action";
import { LoginWithPatreon } from "~app/change-appearance/login-with-patreon";
import { getBaseUrl } from "~src/actions/base-url.action";
import PatreonSection from "~app/change-appearance/patreon-section";

export default async function ChangeAppearance({
    searchParams = {},
}: {
    searchParams: { [_: string]: string };
}) {
    const session = await getSession();
    const userPatreonData = await getUserPatreonData(searchParams);
    const baseUrl = getBaseUrl();

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
