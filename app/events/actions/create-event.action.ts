"use server";

import { redirect } from "next/navigation";
import { CreateEventInput } from "../../../types/events.types";
import { getSession } from "~src/actions/session.action";
import { confirmPermission } from "~src/rbac/confirm-permission";
import { createEvent } from "~src/lib/events";
import { formInputToEventInput } from "~app/events/actions/form-input-to-event-input";
import { validateEventInput } from "~app/events/actions/validate-event-input";

export async function createEventAction(
    _prevState: unknown,
    eventInput: FormData,
) {
    const session = await getSession();

    if (!session.id) return;

    confirmPermission(session, "create", "event");

    const baseInput = await formInputToEventInput(eventInput);

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

    const eventId = await createEvent(input);

    redirect(`/events/${eventId}`);
}
