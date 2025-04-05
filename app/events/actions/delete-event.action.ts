"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { deleteEvent, getEventById } from "~src/lib/events";

export async function deleteEventAction(eventId: number) {
    const user = await getSession();

    if (!user.id) return;

    const event = await getEventById(eventId);
    if (!event) {
        return {
            message: "Event not found",
        };
    }

    confirmPermission(user, "delete", "event", event);

    await deleteEvent(event);
}
