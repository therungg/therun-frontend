"use server";

import { EventFromSearch } from "types/events.types";
import { Events } from "~app/events/events";
import {
    algoliaSearchResponseToPaginationResponse,
    searchAlgoliaEvents,
} from "~src/lib/algolia";

export default async function EventsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const queryParams = await searchParams;

    const { page = "1", search = "" } = queryParams;

    const events = await searchAlgoliaEvents<EventFromSearch>(
        parseInt(page as string),
        search as string,
    );

    return (
        <Events
            events={events}
            pagination={await algoliaSearchResponseToPaginationResponse(events)}
        />
    );
}
