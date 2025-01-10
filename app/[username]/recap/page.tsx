import { getWrappedForUser } from "~src/lib/wrapped";
import { getSession } from "~src/actions/session.action";
import { ContentLoadingWrapper } from "~app/[username]/wrapped/content-loading-wrapper";
import { safeDecodeURI } from "~src/utils/uri";

export const revalidate = 0;

interface PageProps {
    params: { username: string };
}

export default async function Page({ params }: PageProps) {
    if (!params || !params.username) throw new Error("Username not found");

    const username: string = params.username as string;
    const session = await getSession();

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
