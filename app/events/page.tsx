"use server";

import { Events } from "~app/events/events";
import { getEventsPaginated } from "~src/lib/events";

export default async function EventsPage() {
    const events = await getEventsPaginated(1, 4);

    return <Events events={events.items} />;
}
