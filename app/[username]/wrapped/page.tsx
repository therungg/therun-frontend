import { getWrappedForUser } from "~src/lib/wrapped";
import { getSession } from "~src/actions/session.action";
import { ContentLoadingWrapper } from "~app/[username]/wrapped/content-loading-wrapper";
import { TimezoneWarning } from "~app/[username]/wrapped/timezone-warning";
import { UserData } from "~src/lib/get-session-data";
import { safeDecodeURI } from "~src/utils/uri";

export const revalidate = 0;

interface PageProps {
    params: Promise<{ username: string }>;
    searchParams: Promise<{ [_: string]: string }>;
}

export default async function Page(props: PageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
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

    const decodedUser = safeDecodeURI(username);

    wrapped.user = decodedUser;

    return (
        <ContentLoadingWrapper
            user={decodedUser}
            loggedinUser={session}
            wrapped={wrapped}
        />
    );
}
