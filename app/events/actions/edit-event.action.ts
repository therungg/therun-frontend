"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { getEventById } from "~src/lib/events";
import { validateEventInput } from "~app/events/actions/validate-event-input";
import { formInputToEventInput } from "~app/events/actions/form-input-to-event-input";

export async function editEventAction(
    _prevState: unknown,
    eventInput: FormData,
) {
    const user = await getSession();

    if (!user.id) return;

    const eventId = parseInt(eventInput.get("eventId") as string);
    const event = await getEventById(eventId);
    if (!event) {
        return {
            message: "Event not found",
        };
    }

    confirmPermission(user, "edit", "event", event);

    const input = await formInputToEventInput(eventInput);

    if (!input.imageUrl && event.imageUrl) {
        input.imageUrl = event.imageUrl;
    }

    const { error } = await validateEventInput(input);

    if (error) {
        return {
            message: error.message,
        };
    }
}
