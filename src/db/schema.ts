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
    boolean,
    json,
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
        name: varchar({ length: 255 }).notNull().unique(),
        slug: varchar({ length: 50 }).notNull().unique(),
        type: varchar({ length: 255 }).notNull(),
        location: varchar({ length: 255 }),
        bluesky: varchar({ length: 255 }),
        twitch: varchar({ length: 255 }),
        discord: varchar({ length: 255 }),
        oengus: varchar({ length: 255 }),
        language: varchar({ length: 255 }).notNull(),
        shortDescription: varchar({ length: 255 }).notNull(),
        description: text().notNull(),
        url: varchar({ length: 255 }),
        scheduleUrl: varchar({ length: 255 }),
        imageUrl: varchar({ length: 255 }),
        isOffline: boolean().default(true).notNull(),
        isHighlighted: boolean().default(false).notNull(),
        tier: integer().default(1),
        tags: json().default([]).notNull(),
        isDeleted: boolean().default(false).notNull(),
        createdAt: timestamp().defaultNow().notNull(),
        createdBy: varchar({ length: 255 }).notNull(),
    },
    (table) => [
        index("starts_at_index").on(table.startsAt),
        index("ends_at_index").on(table.endsAt),
        index("slug_index").on(table.slug),
    ],
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
    description: varchar({ length: 1000 }).notNull().default("Description"),
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
