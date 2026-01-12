import { ContentLoadingWrapper } from '~app/(old-layout)/[username]/wrapped/content-loading-wrapper';
import { getSession } from '~src/actions/session.action';
import { getWrappedForUser } from '~src/lib/get-wrapped-for-user';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { safeDecodeURI } from '~src/utils/uri';

interface PageProps {
    params: Promise<{ username: string }>;
}

export default async function Page(props: PageProps) {
    const params = await props.params;
    if (!params || !params.username) throw new Error('Username not found');

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
