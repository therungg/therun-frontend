import {
    integer,
    pgTable,
    text,
    timestamp,
    index,
    varchar,
    boolean,
} from "drizzle-orm/pg-core";

export const events = pgTable(
    "events",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        startsAt: timestamp().notNull(),
        endsAt: timestamp().notNull(),
        name: varchar({ length: 255 }).notNull(),
        type: varchar({ length: 255 }).notNull(),
        location: varchar({ length: 255 }),
        bluesky: varchar({ length: 255 }),
        discord: varchar({ length: 255 }),
        language: varchar({ length: 255 }).notNull(),
        shortDescription: varchar({ length: 255 }).notNull(),
        description: text().notNull(),
        url: varchar({ length: 255 }),
        imageUrl: varchar({ length: 255 }),
        approved: boolean(),
        createdAt: timestamp().defaultNow(),
    },
    (table) => [index("starts_at_index").on(table.startsAt)],
);
