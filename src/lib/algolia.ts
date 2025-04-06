"use server";

import { algoliasearch, SearchResponse } from "algoliasearch";
import { Event, EventOrganizer } from "types/events.types";
import { getAllEventOrganizers } from "./events";
import { PaginatedData } from "~src/components/pagination/pagination.types";

const appID = process.env.NEXT_PUBLIC_ALGOLIA_APPLICATION_ID;
const apiKey = process.env.ALGOLIA_API_KEY;
const indexName = process.env.NEXT_PUBLIC_ALGOLIA_EVENTS_INDEX_NAME as string;

export const getAlgoliaApiClient = async () => {
    if (!appID || !apiKey || !indexName) {
        throw new Error("Algolia credentials not found");
    }

    return algoliasearch(appID, apiKey);
};

export async function searchAlgoliaEvents<T>(
    page = 1,
    search = "",
    filters = "",
) {
    const client = await getAlgoliaApiClient();
    const params = new URLSearchParams();

    params.set("facets", "*");
    params.set("page", (page - 1).toString());
    params.set("query", search);
    params.set("filters", filters);

    return client.searchSingleIndex<T>({
        indexName,
        searchParams: {
            params: params.toString(),
        },
    });
}

export const insertEventToAlgolia = async (event: Event) => {
    const client = await getAlgoliaApiClient();

    const organizers = await getAllEventOrganizers();
    const input = eventInputToAlgoliaInput(event, organizers);

    const { taskID } = await client.saveObject({
        indexName,
        body: input,
    });

    await client.waitForTask({
        indexName,
        taskID,
    });
};

export const deleteEventFromAlgolia = async (event: Event) => {
    const client = await getAlgoliaApiClient();

    const { taskID } = await client.deleteObject({
        indexName,
        objectID: event.id.toString(),
    });

    await client.waitForTask({
        indexName,
        taskID,
    });
};

export const insertEventsToAlgolia = async (events: Event[]) => {
    const client = await getAlgoliaApiClient();

    const organizers = await getAllEventOrganizers();
    const inputs = events.map((event) =>
        eventInputToAlgoliaInput(event, organizers),
    );

    const { taskID } = await client.batch({
        indexName,
        batchWriteParams: {
            requests: inputs.map((input) => ({
                action: "addObject",
                body: input,
            })),
        },
    });

    await client.waitForTask({
        indexName,
        taskID,
    });
};

export const clearAlgoliaIndex = async () => {
    const client = await getAlgoliaApiClient();

    await client.clearObjects({ indexName });
};

const eventInputToAlgoliaInput = (
    event: Event,
    organizers: EventOrganizer[],
) => {
    // Maybe narrow this down in the future if records are big
    return {
        ...event,
        objectID: event.id.toString(),
        startsAtTimeStamp: new Date(event.startsAt).getTime(),
        endsAtTimeStamp: new Date(event.endsAt).getTime(),
        organizer: organizers.find(
            (organizer) => organizer.id === event.organizerId,
        )?.name,
    };
};

export async function algoliaSearchResponseToPaginationResponse<T>(
    searchResponse: SearchResponse<T>,
): Promise<PaginatedData<T>> {
    return {
        items: searchResponse.hits,
        totalItems: searchResponse.nbHits as number,
        totalPages: searchResponse.nbPages as number,
        pageSize: searchResponse.hitsPerPage as number,
        page: (searchResponse.page as number) + 1,
    };
}
