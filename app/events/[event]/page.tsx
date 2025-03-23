"use server";

import { getEventById } from "~src/lib/events";
import { ViewEvent } from "./view-event";

interface PageProps {
    params: Promise<{ event: number }>;
}

export default async function EditRacePage(props: PageProps) {
    const params = await props.params;
    const eventId = params.event;

    const event = await getEventById(eventId);

    return <ViewEvent event={event} />;
}
