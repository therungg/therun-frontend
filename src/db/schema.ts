import {
    index,
    integer,
    jsonb,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

export const users = pgTable(
    "users",
    {
        id: serial().primaryKey().unique(),
        username: varchar({ length: 255 }).notNull().unique(),
    },
    (table) => [
        uniqueIndex("idx_users_username_lower").using(
            "btree",
            sql`(lower(${table.username}))`,
        ),
    ],
);

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

export const logs = pgTable("logs", {
    id: serial().primaryKey().unique(),
    userId: integer()
        .references(() => users.id)
        .notNull(),
    remark: varchar({ length: 1000 }),
    action: varchar({ length: 255 }).notNull(),
    entity: varchar({ length: 255 }).notNull(),
    target: varchar({ length: 255 }),
    data: jsonb(),
    timestamp: timestamp().defaultNow().notNull(),
});
