"use server";

import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { editEvent, getEventById } from "~src/lib/events";
import { validateEventInput } from "~app/events/actions/validate-event-input";
import { formInputToEventInput } from "~app/events/actions/form-input-to-event-input";
import { redirect } from "next/navigation";
import { insertLog } from "~src/lib/logs";
import { getOrCreateUser } from "~src/lib/users";
import { EditEventInput } from "types/events.types";

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

    let input: EditEventInput;

    try {
        input = await formInputToEventInput(eventInput);

        if (!input.imageUrl && event.imageUrl) {
            input.imageUrl = event.imageUrl;
        }
    } catch (error) {
        return {
            message: (error as { message: string }).message,
        };
    }

    const { error } = await validateEventInput(input);

    if (error) {
        return {
            message: error.message,
        };
    }
    try {
        await editEvent(eventId, input);
        await insertLog({
            userId: await getOrCreateUser(user.username),
            action: "edit-event",
            entity: "event",
            target: eventId.toString(),
            data: { eventId, input },
        });
    } catch (error: unknown) {
        let message = (error as { message: string }).message;

        if (message.includes("events_name")) {
            message = "The name is already taken";
        }

        if (message.includes("events_slug")) {
            message = "The slug is already taken";
        }

        return { message };
    }

    redirect(`/events/${eventId}?toast=Event succesfully edited!`);
}
