import { sql } from "drizzle-orm";
import { db } from "~src/db";
import { events } from "~src/db/schema";

export const getAllEvents = async () => {
    return db.select().from(events);
};

export const getEventsPaginated = async (page = 1, pageSize = 10) => {
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
        count: total,
        pages: totalPages,
        page,
        pageSize,
    };
};
