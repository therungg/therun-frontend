import { getAllEvents } from "~src/lib/events";

export default async function EventsPage() {
    const events = await getAllEvents();

    return <div>{JSON.stringify(events)}</div>;
}
