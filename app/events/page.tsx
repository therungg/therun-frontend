"use server";

import { Events } from "~app/events/events";
import { getEventsPaginated } from "~src/lib/events";

export default async function EventsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const queryParams = await searchParams;

    const events = await getEventsPaginated(
        queryParams.page ? parseInt(queryParams.page as string) : 1,
        5,
    );

    return <Events events={events} />;
}
