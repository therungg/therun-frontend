import { getWrappedForUser } from "~src/lib/wrapped";
import { getSession } from "~src/actions/session.action";
import { ContentLoadingWrapper } from "~app/[username]/wrapped/content-loading-wrapper";
import { TimezoneWarning } from "~app/[username]/wrapped/timezone-warning";
import { UserData } from "~src/lib/get-session-data";

export const revalidate = 0;

interface PageProps {
    params: { username: string };
    searchParams: { [_: string]: string };
}

export default async function Page({ params, searchParams }: PageProps) {
    if (!params || !params.username) throw new Error("Username not found");

    const username: string = params.username as string;
    const session = await getSession();

    if (
        username === session.username &&
        !session.timezone &&
        !searchParams.ignoreTimezone
    ) {
        return <TimezoneWarning user={session as UserData} />;
    }

    const wrapped = await getWrappedForUser(username);

    return (
        <ContentLoadingWrapper
            user={username}
            loggedinUser={session}
            wrapped={wrapped}
        />
    );
}
