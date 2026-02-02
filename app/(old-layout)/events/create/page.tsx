'use server';

import { CreateEvent } from '~app/(old-layout)/events/create/create-event';
import { getSession } from '~src/actions/session.action';
import { confirmPermission } from '~src/rbac/confirm-permission';

export default async function CreateEventsPage() {
    const session = await getSession();
    confirmPermission(session, 'create', 'event');

    return <CreateEvent />;
}
