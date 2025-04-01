"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { editEvent, getEventById } from "~src/lib/events";
import { validateEventInput } from "~app/events/actions/validate-event-input";
import { formInputToEventInput } from "~app/events/actions/form-input-to-event-input";
import { redirect } from "next/navigation";

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
    try {
        await editEvent(eventId, input);
    } catch (error: never) {
        return {
            message: error.message,
        };
    }

    redirect(`/events/${eventId}?toast=Event succesfully edited!`);
}
