'use server';

import { redirect } from 'next/navigation';
import { EditEventInput } from 'types/events.types';
import { formInputToEventInput } from '~app/(old-layout)/events/actions/form-input-to-event-input';
import { validateEventInput } from '~app/(old-layout)/events/actions/validate-event-input';
import { getSession } from '~src/actions/session.action';
import { editEvent, getEventById } from '~src/lib/events';
import { confirmPermission } from '~src/rbac/confirm-permission';

export async function editEventAction(
    _prevState: unknown,
    eventInput: FormData,
) {
    const user = await getSession();

    if (!user.id) return;

    const eventId = parseInt(eventInput.get('eventId') as string);
    const event = await getEventById(eventId);
    if (!event) {
        return {
            message: 'Event not found',
        };
    }

    confirmPermission(user, 'edit', 'event', event);

    let input: EditEventInput;

    try {
        input = await formInputToEventInput(eventInput, user.id);

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
        await editEvent(eventId, input, user.id);
    } catch (error: unknown) {
        let message = (error as { message: string }).message;

        if (message.includes('events_name')) {
            message = 'The name is already taken';
        }

        if (message.includes('events_slug')) {
            message = 'The slug is already taken';
        }

        return { message };
    }

    redirect(`/events/${eventId}?toast=Event succesfully edited!`);
}
