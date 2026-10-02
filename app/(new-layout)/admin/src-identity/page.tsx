import { getSession } from '~src/actions/session.action';
import { getRunnerProfileHead } from '~src/lib/runner-profile';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { listSrcIdentityRequests } from './actions/src-identity.action';
import { IdentityRequests } from './identity-requests';

export default async function SrcIdentityPage() {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');

    const requests = await listSrcIdentityRequests();
    // The queue has no pictures of its own; the profile head is cached.
    const pictures = await Promise.all(
        requests.map((r) =>
            getRunnerProfileHead(r.username)
                .then((h) => h?.runner.picture ?? null)
                .catch(() => null),
        ),
    );

    return (
        <IdentityRequests
            requests={requests.map((r, i) => ({ ...r, picture: pictures[i] }))}
        />
    );
}
