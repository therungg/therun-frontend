"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { CreateEvent } from "~app/events/create/create-event";

export default async function CreateEventsPage() {
    const session = await getSession();
    confirmPermission(session, "create", "event");

    return <CreateEvent />;
}
