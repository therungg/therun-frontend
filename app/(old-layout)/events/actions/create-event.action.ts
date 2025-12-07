"use server";

import { redirect } from "next/navigation";
import { CreateEventInput } from "../../../../types/events.types";
import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { createEvent } from "~src/lib/events";
import { formInputToEventInput } from "~app/(old-layout)/events/actions/form-input-to-event-input";
import { validateEventInput } from "~app/(old-layout)/events/actions/validate-event-input";
import { insertLog } from "~src/lib/logs";
import { getOrCreateUser } from "~src/lib/users";

export async function createEventAction(
    _prevState: unknown,
    eventInput: FormData,
) {
    const session = await getSession();

    if (!session.id) return;

    confirmPermission(session, "create", "event");

    let baseInput = undefined;

    try {
        baseInput = await formInputToEventInput(eventInput);
    } catch (error) {
        return {
            message: (error as { message: string }).message,
        };
    }

    const input: CreateEventInput = {
        ...baseInput,
        createdBy: session.username,
    };

    const { error } = await validateEventInput(input);

    if (error) {
        return {
            message: error.message,
        };
    }
    let eventId = null;

    try {
        eventId = await createEvent(input);
        await insertLog({
            userId: await getOrCreateUser(session.username),
            action: "create-event",
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

    redirect(`/events/${eventId}?toast=Event succesfully created!`);
}
