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
        getAlgoliaFilters(queryParams),
    );

    return (
        <Events
            events={events}
            pagination={await algoliaSearchResponseToPaginationResponse(events)}
        />
    );
}

type DateFilterOptions = "all" | "upcoming" | "current" | "past";

const getAlgoliaFilters = (queryParams: {
    [key: string]: string | string[] | undefined;
}) => {
    if (!queryParams["filter.date"]) {
        queryParams["filter.date"] = "upcoming";
    }

    return Object.entries(queryParams)
        .filter(([key]) => key.startsWith("filter."))
        .map(([key, value]) => {
            const facetKey = key.replace("filter.", "");

            if (facetKey === "date")
                return generateDateFilter(value as DateFilterOptions);

            const facetValues = (value as string)
                .split(",")
                .map((v) => `${facetKey}:'${v}'`);
            return "(" + facetValues.join(" OR ") + ")";
        })
        .filter((filter) => filter !== "")
        .join(" AND ");
};

const generateDateFilter = (value: DateFilterOptions) => {
    switch (value) {
        case "all":
            return "";
        // Events that start in -10 days to +60 days
        case "upcoming":
            return `(startsAtTimeStamp:${
                Math.floor(Date.now()) - 10 * 24 * 60 * 60 * 1000
            } TO ${Math.floor(Date.now()) + 60 * 24 * 60 * 60 * 1000})`;
        // Events that are happening now
        case "current":
            return `(startsAtTimeStamp < ${Math.floor(
                Date.now(),
            )} AND endsAtTimeStamp > ${Math.floor(Date.now())})`;
        // Currently not supported
        case "past":
            return "";
    }
};
