'use server';

import { getSession } from '~src/actions/session.action';
import { listSrcQueues } from '~src/lib/src-import';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type { SrcQueues } from '../../../../../types/src-import.types';

/** Every speedrun.com job on the site. Polled by the page while any run. */
export async function getSrcQueuesAction(): Promise<SrcQueues> {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');
    return listSrcQueues(user.id);
}
