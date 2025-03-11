import {
    integer,
    pgTable,
    text,
    timestamp,
    index,
    varchar,
    serial,
    primaryKey,
} from "drizzle-orm/pg-core";

export const events = pgTable(
    "events",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        organizerId: integer()
            .references(() => eventOrganizers.id)
            .notNull(),
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
        createdAt: timestamp().defaultNow().notNull(),
        createdBy: varchar({ length: 255 }).notNull(),
    },
    (table) => [index("starts_at_index").on(table.startsAt)],
);

export const eventOrganizers = pgTable("event_organizers", {
    id: serial().primaryKey().unique(),
    name: varchar({ length: 255 }).notNull().unique(),
});

export const users = pgTable("users", {
    id: serial().primaryKey().unique(),
    username: varchar({ length: 255 }).notNull().unique(),
});

export const roles = pgTable("roles", {
    id: serial().primaryKey().unique(),
    name: varchar({ length: 255 }).notNull().unique(),
    description: varchar({ length: 1000 }).notNull(),
});

export const userRoles = pgTable(
    "user_roles",
    {
        userId: integer()
            .references(() => users.id)
            .notNull(),
        roleId: integer()
            .references(() => roles.id)
            .notNull(),
    },
    (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);
