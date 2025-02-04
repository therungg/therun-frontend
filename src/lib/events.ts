import { db } from "~src/db";
import { events } from "~src/db/schema";

export const getAllEvents = async () => {
    return db.select().from(events);
};
