import { getEventsPaginated } from "~src/lib/events";

export default async function EventsPage() {
    const events = await getEventsPaginated(1, 4);

    return <div>{JSON.stringify(events)}</div>;
}
