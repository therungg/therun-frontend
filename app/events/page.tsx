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

    const filters = Object.entries(queryParams)
        .filter(([key]) => key.startsWith("filter."))
        .map(([key, value]) => {
            const facetKey = key.replace("filter.", "");
            const facetValues = (value as string)
                .split(",")
                .map((v) => `${facetKey}:${v}`);
            return "(" + facetValues.join(" OR ") + ")";
        })
        .join(" AND ");

    const events = await searchAlgoliaEvents<EventFromSearch>(
        parseInt(page as string),
        search as string,
        filters, // Pass the filters as a query string
    );

    return (
        <Events
            events={events}
            pagination={await algoliaSearchResponseToPaginationResponse(events)}
        />
    );
}
