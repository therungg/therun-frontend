"use server";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "~src/db";
import { eventOrganizers, events } from "~src/db/schema";
import { PaginatedData } from "~src/components/pagination/pagination.types";
import {
    CreateEventInput,
    CreateEventOrganizerInput,
    EditEventInput,
    Event,
    EventOrganizer,
    EventWithOrganizerName,
} from "../../types/events.types";
import { deleteEventFromAlgolia, insertEventToAlgolia } from "./algolia";

interface EventDbResult {
    events: Event;
    event_organizers: EventOrganizer;
}

export const getEventById = async (
    eventId: number,
): Promise<EventWithOrganizerName> => {
    const result = await db
        .select()
        .from(events)
        .innerJoin(eventOrganizers, eq(events.organizerId, eventOrganizers.id))
        .where(eq(events.id, eventId));

    if (!result[0]) {
        throw new Error("Event not found");
    }

    return addOrganizerNameToEvent(result[0]);
};

export const getAllEvents = async (): Promise<EventWithOrganizerName[]> => {
    const result = await db
        .select()
        .from(events)
        .innerJoin(eventOrganizers, eq(events.organizerId, eventOrganizers.id));

    return addOrganizerNameToEvents(result);
};

export const getAllEventOrganizers = async () => {
    return db.select().from(eventOrganizers);
};

export const getEventsPaginated = async (
    page = 1,
    pageSize = 10,
): Promise<PaginatedData<EventWithOrganizerName>> => {
    const offset = (page - 1) * pageSize;

    const results = await db
        .select()
        .from(events)
        .innerJoin(eventOrganizers, eq(events.organizerId, eventOrganizers.id))
        .orderBy(desc(events.id))
        .limit(pageSize)
        .offset(offset);

    const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(events);

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / pageSize);

    return {
        items: addOrganizerNameToEvents(results),
        totalItems: total,
        totalPages: totalPages,
        page,
        pageSize,
    };
};

export const createEvent = async (input: CreateEventInput) => {
    const insertedEvent = await db.insert(events).values(input).returning();

    const id = insertedEvent[0]?.id;

    if (!id) {
        throw new Error("Failed to create event");
    }

    await insertEventToAlgolia(insertedEvent[0]);

    return id;
};

export const editEvent = async (eventId: number, input: EditEventInput) => {
    const updatedEvent = await db
        .update(events)
        .set(input)
        .where(eq(events.id, eventId))
        .returning();
    if (!updatedEvent[0]) {
        throw new Error("Failed to update event");
    }

    await insertEventToAlgolia(updatedEvent[0]);
};

export const deleteEvent = async (event: Event) => {
    await db
        .update(events)
        .set({ isDeleted: true })
        .where(eq(events.id, event.id));

    await deleteEventFromAlgolia(event);
};

export const createEventOrganizer = async (
    input: CreateEventOrganizerInput,
) => {
    const insertedEventOrganizer = await db
        .insert(eventOrganizers)
        .values(input)
        .returning({ id: eventOrganizers.id });

    return insertedEventOrganizer[0];
};

const addOrganizerNameToEvent = (dbResult: EventDbResult) => {
    return {
        ...dbResult.events,
        organizerName: dbResult.event_organizers.name,
    };
};

const addOrganizerNameToEvents = (dbResult: EventDbResult[]) => {
    return dbResult.map((result) => ({
        ...result.events,
        organizerName: result.event_organizers.name,
    }));
};
