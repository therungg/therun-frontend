"use server";

import { getEventById } from "~src/lib/events";
import { ViewEvent } from "./view-event";

interface PageProps {
    params: Promise<{ event: number }>;
}

export default async function ViewEventPage(props: PageProps) {
    const params = await props.params;
    const eventId = params.event;

    const event = await getEventById(eventId);

    if (event.isDeleted) {
        return <div>Event not found</div>;
    }

    return <ViewEvent event={event} />;
}
