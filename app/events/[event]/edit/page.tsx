"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { CreateEvent } from "~app/events/create/create-event";
import { getEventById } from "~src/lib/events";

interface PageProps {
    params: Promise<{ eventId: number }>;
}

export default async function EditRacePage(props: PageProps) {
    const params = await props.params;
    const eventId = params.eventId;

    const event = await getEventById(eventId);

    const session = await getSession();
    confirmPermission(session, "edit", "event", event);

    return <CreateEvent />;
}
