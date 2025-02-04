import {
    integer,
    pgTable,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("events", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    startsAt: timestamp().notNull(),
    endsAt: timestamp().notNull(),
    name: varchar({ length: 255 }).notNull(),
    type: varchar({ length: 255 }).notNull(),
    location: varchar({ length: 255 }).notNull(),
    bluesky: varchar({ length: 255 }).notNull(),
    discord: varchar({ length: 255 }).notNull(),
    language: varchar({ length: 255 }).notNull(),
    shortDescription: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    createdAt: timestamp().defaultNow(),
});
