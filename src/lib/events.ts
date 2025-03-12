import { eq, sql } from "drizzle-orm";
import { db } from "~src/db";
import { eventOrganizers, events } from "~src/db/schema";
import { PaginatedData } from "~src/components/pagination/pagination.types";
import { CreateEventInput, Event } from "../../types/events.types";

export const getEventById = async (eventId: number) => {
    return db.query.events.findFirst({
        where: eq(events.id, eventId),
    });
};

export const getAllEvents = async () => {
    return db.select().from(events);
};

export const getAllEventOrganizers = async () => {
    return db.select().from(eventOrganizers);
};

export const getEventsPaginated = async (
    page = 1,
    pageSize = 10,
): Promise<PaginatedData<Event>> => {
    const offset = (page - 1) * pageSize;

    const results = await db
        .select()
        .from(events)
        .limit(pageSize)
        .offset(offset);

    const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(events);

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / pageSize);

    return {
        items: results,
        totalItems: total,
        totalPages: totalPages,
        page,
        pageSize,
    };
};

export const createEvent = async (input: CreateEventInput) => {
    const insertedEvent = await db
        .insert(events)
        .values(input)
        .returning({ id: events.id });

    return insertedEvent[0]?.id;
};
