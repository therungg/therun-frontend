import { getSession } from '~src/actions/session.action';
import { getEventById } from '~src/lib/events';
import { confirmPermission } from '~src/rbac/confirm-permission';
import { EditEvent } from './edit-event';

interface PageProps {
    params: Promise<{ event: number }>;
}

export default async function EditEventPage(props: PageProps) {
    const params = await props.params;
    const eventId = params.event;

    const event = await getEventById(eventId);

    const session = await getSession();
    confirmPermission(session, 'edit', 'event', event);

    return <EditEvent event={event} />;
}
