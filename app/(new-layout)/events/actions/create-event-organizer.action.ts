'use server';

import { getSession } from '~src/actions/session.action';
import { createEventOrganizer, getAllEventOrganizers } from '~src/lib/events';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { EventOrganizer } from '../../../../types/events.types';

export async function createEventOrganizerAction(
    name: string,
): Promise<EventOrganizer | null> {
    const session = await getSession();

    if (!session.id) return null;

    confirmPermission(session, 'create', 'event');

    return createEventOrganizer({ name }, session.id);
}

export async function getAllEventOrganizersAction(): Promise<EventOrganizer[]> {
    return getAllEventOrganizers();
}
